const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AssessmentResult = require('../models/AssessmentResult');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   PUT /api/settings/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
    auth,
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('consultantPhone').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: 'error', message: errors.array()[0].msg });
        }

        const { firstName, lastName, email, consultantPhone } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // Check email uniqueness if changed
        if (email && email !== user.email) {
            const exists = await User.findOne({ email, _id: { $ne: user._id } });
            if (exists) {
                return res.status(400).json({ status: 'error', message: 'Email already in use' });
            }
            user.email = email;
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (consultantPhone !== undefined) user.consultantPhone = consultantPhone;

        await user.save();

        res.json({ status: 'success', message: 'Profile updated', user: user.getProfile() });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// @route   DELETE /api/settings/account
// @desc    Soft-delete user account (deactivate)
// @access  Private
router.delete('/account', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        user.isActive = false;
        await user.save();

        res.json({ status: 'success', message: 'Account deactivated' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// @route   GET /api/settings/export
// @desc    Export user data as JSON or CSV
// @access  Private
router.get('/export', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // Get students created by this consultant
        const students = await User.find({ createdBy: user._id, role: 'student' })
            .select('firstName lastName email studentId grade dateOfBirth parentName parentPhone parentAddress learningProfile createdAt')
            .lean();

        const format = req.query.format || 'json';

        if (format === 'csv') {
            // Build CSV
            const headers = ['Student ID', 'First Name', 'Last Name', 'Email', 'Grade', 'Date of Birth', 'Dyslexia Type', 'Parent Name', 'Parent Phone', 'Parent Address', 'Created'];
            const rows = students.map(s => [
                s.studentId || '',
                s.firstName || '',
                s.lastName || '',
                s.email || '',
                s.grade || '',
                s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '',
                (s.learningProfile && s.learningProfile.dyslexiaType) || 'none',
                s.parentName || '',
                s.parentPhone || '',
                s.parentAddress || '',
                s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : ''
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=neurolex-data.csv');
            return res.send(csvContent);
        }

        // Default: JSON
        const exportData = {
            profile: user.getProfile(),
            students,
            exportedAt: new Date().toISOString()
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=neurolex-data.json');
        res.json(exportData);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// @route   GET /api/settings/export-results
// @desc    Export student assessment results as CSV (Level 1 + Level 2)
// @access  Private
router.get('/export-results', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // Get all assessment results for this consultant
        const results = await AssessmentResult.find({ consultantId: user._id.toString() })
            .sort({ createdAt: -1 })
            .lean();

        // Get student details map for quick lookup
        const studentIds = [...new Set(results.map(r => r.studentId).filter(Boolean))];
        const students = await User.find({ studentId: { $in: studentIds }, role: 'student' })
            .select('studentId firstName lastName')
            .lean();
        const studentMap = {};
        students.forEach(s => {
            studentMap[s.studentId] = `${s.firstName || ''} ${s.lastName || ''}`.trim();
        });

        // Build CSV rows
        const headers = [
            'Student ID',
            'Student Name',
            'Level 1 Score',
            'Level 1 Total Possible',
            'Level 1 Percentage',
            'Disorders Detected',
            'Level 2 Drawing Accuracy',
            'Total Time (sec)',
            'Assessment Date'
        ];

        const rows = results.map(r => {
            const studentName = studentMap[r.studentId] || r.playerName || '';
            const disordersList = (r.disorders || []).map(d => `${d.name} (${d.severity || 'N/A'})`).join('; ');
            const drawingAccuracy = (r.talentScores && r.talentScores.drawingAccuracy != null)
                ? r.talentScores.drawingAccuracy
                : 'N/A';
            const totalTimeSec = r.totalTime ? Math.round(r.totalTime / 1000) : 0;

            return [
                r.studentId || '',
                studentName,
                r.score || 0,
                r.totalPossible || 0,
                r.percentage != null ? r.percentage : 0,
                disordersList,
                drawingAccuracy,
                totalTimeSec,
                r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : ''
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=neurolex-results.csv');
        return res.send(csvContent);
    } catch (error) {
        console.error('Export results error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

module.exports = router;
