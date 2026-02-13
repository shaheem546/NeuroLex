const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'teacher']).withMessage('Role must be student or teacher'),
  body('studentId').optional().trim(),
  // body('employeeId').optional().trim(), // Deprecated for new registrations
  body('department').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password, role, studentId, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Validate role-specific fields
    if (role === 'student' && !studentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Student ID is required for student registration'
      });
    }

    if (role === 'teacher' && !department) {
      return res.status(400).json({
        status: 'error',
        message: 'Department is required for teacher registration'
      });
    }

    // Create user object
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: role || 'student'
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
    } else if (role === 'teacher') {
      // Generate Consultant ID
      let isUnique = false;
      let consultantId = '';
      while (!isUnique) {
        const randomId = Math.floor(100000 + Math.random() * 900000); // 6 digit random number
        consultantId = `CNS${randomId}`;
        const existing = await User.findOne({ consultantId });
        if (!existing) isUnique = true;
      }
      userData.consultantId = consultantId;
      userData.department = department;
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userProfile = user.getProfile();

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      token,
      user: userProfile
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        status: 'error',
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Update last active
    user.progress.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userProfile = user.getProfile();

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: userProfile
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    status: 'success',
    message: 'Logout successful'
  });
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/student-login
// @desc    Login student using studentId and consultantId
// @access  Public
router.post('/student-login', [
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
  body('consultantId').trim().notEmpty().withMessage('Consultant ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { studentId, consultantId } = req.body;

    // Find the student by studentId
    const student = await User.findOne({ studentId, role: 'student' });
    if (!student) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid Student ID'
      });
    }

    // Verify consultant exists with the given consultantId
    const consultant = await User.findOne({
      $or: [{ consultantId }, { employeeId: consultantId }],
      role: 'teacher'
    });
    if (!consultant) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid Consultant ID'
      });
    }

    // Check if student is active
    if (!student.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Student account is deactivated'
      });
    }

    // Update last active
    student.progress.lastActive = new Date();
    await student.save();

    // Generate token for the student
    const token = generateToken(student._id);

    res.json({
      status: 'success',
      message: 'Student login successful',
      token,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        grade: student.grade,
        email: student.email
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during student login'
    });
  }
});

module.exports = router;





