// Consultant Dashboard JavaScript
const API_BASE = '';

// API Helper
async function apiRequest(path, method = 'GET', body) {
    const res = await fetch(`${API_BASE}/api${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.message || 'Request failed');
    }
    return data;
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Get user info
function getUserInfo() {
    const userName = localStorage.getItem('userName') || 'Consultant';
    const userRole = localStorage.getItem('userRole') || 'teacher';

    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = userName;
}

// Load analytics (Dashboard side)
async function loadAnalytics() {
    try {
        const data = await apiRequest('/users/analytics');
        const analytics = data.analytics;

        // Update dashboard stats if dashboard is visible
        const dashboardSection = document.getElementById('dashboardMainSection');
        if (dashboardSection && dashboardSection.style.display !== 'none') {
            updateDashboardStats(analytics);
        }

        // Update basic stats
        const totalEl = document.getElementById('totalStudents');
        const activeEl = document.getElementById('activeStudents');
        const needingEl = document.getElementById('needingSupport');

        if (totalEl) totalEl.textContent = analytics.totalStudents || 0;
        if (activeEl) activeEl.textContent = analytics.activeStudents || 0;
        if (needingEl) needingEl.textContent = analytics.studentsNeedingSupport || 0;

        // Update dyslexia distribution
        const breakdown = analytics.dyslexiaBreakdown || {};
        updateDyslexiaDistribution(breakdown);

    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// Update dyslexia distribution in sidebar
function updateDyslexiaDistribution(breakdown) {
    const labels = {
        dyslexia: 'countDyslexia',
        dyscalculia: 'countDyscalculia',
        dysgraphia: 'countDysgraphia',
        dysphasia: 'countDysphasia'
    };
    Object.keys(labels).forEach(key => {
        const el = document.getElementById(labels[key]);
        if (el) el.textContent = `${breakdown[key] || 0} students`;
    });
}

// Load students table
async function loadStudents(search = '') {
    try {
        const data = await apiRequest(`/users/students?search=${encodeURIComponent(search)}&limit=50`);
        const students = data.students || [];

        const tbody = document.getElementById('studentTableBody');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.getElementById('studentTableContainer');

        if (students.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';

            if (tbody) {
                tbody.innerHTML = students.map(student => `
                    <tr>
                        <td>
                            <div class="student-name">
                                <div class="student-avatar">${student.firstName[0]}${student.lastName[0]}</div>
                                <span>${student.firstName} ${student.lastName}</span>
                            </div>
                        </td>
                        <td>${student.studentId || '-'}</td>
                        <td><span class="badge badge-${student.learningProfile?.dyslexiaType || 'none'}">${formatDyslexiaType(student.learningProfile?.dyslexiaType)}</span></td>
                        <td><span class="badge badge-${student.learningProfile?.severity || 'mild'}">${capitalize(student.learningProfile?.severity || 'Mild')}</span></td>
                        <td>
                            <button class="action-btn" data-action="edit" data-id="${student._id}" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="action-btn" data-action="test" data-id="${student._id}" data-name="${student.firstName} ${student.lastName}" title="Start Game"><i class="fas fa-clipboard-check"></i></button>
                            <button class="action-btn btn-delete" data-action="delete" data-id="${student._id}" data-name="${student.firstName} ${student.lastName}" title="Deactivate"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load students:', error);
        showToast('Failed to load students', 'error');
    }
}

function formatDyslexiaType(type) {
    const types = { 'none': 'None', 'dyslexia': 'Dyslexia', 'dyscalculia': 'Dyscalculia', 'dysgraphia': 'Dysgraphia', 'dysphasia': 'Dysphasia' };
    return types[type] || 'None';
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

// Global State
let editingStudentId = null;
let supportPollInterval;
let analyticsCharts = {};
let dashboardCharts = {};

function openAddStudentModal() {
    editingStudentId = null;
    const title = document.getElementById('modalTitle');
    const btn = document.getElementById('submitBtn');
    const form = document.getElementById('studentForm');
    if (title) title.textContent = 'Add New Student';
    if (btn) btn.textContent = 'Add Student';
    if (form) form.reset();

    ['email', 'studentIdInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });

    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.add('active');
}

function closeStudentModal() {
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.remove('active');
    editingStudentId = null;
}

async function editStudent(id) {
    try {
        const data = await apiRequest(`/users/students/${id}`);
        const student = data.student;
        editingStudentId = id;

        const title = document.getElementById('modalTitle');
        const btn = document.getElementById('submitBtn');
        if (title) title.textContent = 'Edit Student';
        if (btn) btn.textContent = 'Update Student';

        const fields = {
            'firstName': student.firstName,
            'lastName': student.lastName,
            'email': student.email,
            'studentIdInput': student.studentId,
            'grade': student.grade,
            'dyslexiaType': student.learningProfile?.dyslexiaType,
            'severity': student.learningProfile?.severity
        };

        Object.keys(fields).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = fields[key] || '';
        });

        ['email', 'studentIdInput'].forEach(key => {
            const el = document.getElementById(key);
            if (el) el.disabled = true;
        });

        const modal = document.getElementById('studentModal');
        if (modal) modal.classList.add('active');
    } catch (error) {
        showToast('Failed to load student data', 'error');
    }
}

async function submitStudentForm(e) {
    e.preventDefault();
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        studentId: document.getElementById('studentIdInput').value,
        grade: document.getElementById('grade').value,
        dyslexiaType: document.getElementById('dyslexiaType').value,
        severity: document.getElementById('severity').value
    };

    try {
        if (editingStudentId) {
            await apiRequest(`/users/students/${editingStudentId}`, 'PUT', formData);
            showToast('Student updated successfully');
        } else {
            await apiRequest('/users/students', 'POST', formData);
            showToast('Student created successfully');
        }
        closeStudentModal();
        loadStudents();
        loadAnalytics();
    } catch (error) {
        showToast(error.message || 'Failed to save student', 'error');
    }
}

async function deleteStudent(id, name) {
    if (!confirm(`Are you sure you want to deactivate student ${name || 'ID: ' + id}?`)) return;
    try {
        await apiRequest(`/users/students/${id}`, 'DELETE');
        showToast('Student deactivated successfully');
        loadStudents();
        loadAnalytics();
    } catch (error) {
        showToast('Failed to deactivate student', 'error');
    }
}

function logout() {
    ['token', 'userRole', 'userEmail', 'userName'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
}

// Initialization and Event Listeners
window.onload = function () {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'index.html'; return; }

    getUserInfo();
    loadAnalytics();
    loadStudents();

    // Cache elements
    const elements = {
        logoutBtn: 'logoutBtn',
        headerLogoutBtn: 'headerLogoutBtn',
        addStudentBtn: 'addStudentBtn',
        quickAddStudent: 'quickAddStudent',
        closeModal: 'closeModal',
        cancelModal: 'cancelModal',
        studentForm: 'studentForm',
        searchInput: 'searchInput',
        navDashboard: 'navDashboard',
        navStudents: 'navStudents',
        navAnalytics: 'navAnalytics',
        navResources: 'navResources',
        navSupport: 'navSupport',
        navSettings: 'navSettings',
        dashboardMainSection: 'dashboardMainSection',
        studentsSection: 'studentsSection',
        analyticsSection: 'analyticsSection',
        resourcesSection: 'resourcesSection',
        supportSection: 'supportSection'
    };

    const els = {};
    Object.keys(elements).forEach(key => {
        els[key] = document.getElementById(elements[key]);
    });

    // Page-specific initialization based on URL
    const currentPath = window.location.pathname;
    if (currentPath.includes('students.html')) {
        if (els.studentsSection) els.studentsSection.style.display = 'block';
        if (els.dashboardMainSection) els.dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (els.navStudents) els.navStudents.classList.add('active');
    } else if (currentPath.includes('analytics.html')) {
        if (els.analyticsSection) els.analyticsSection.style.display = 'block';
        if (els.dashboardMainSection) els.dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (els.navAnalytics) els.navAnalytics.classList.add('active');
        loadAnalyticsData();
    } else if (currentPath.includes('support.html')) {
        if (els.supportSection) els.supportSection.style.display = 'block';
        if (els.dashboardMainSection) els.dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (els.navSupport) els.navSupport.classList.add('active');
        loadSupportRequests();
    } else if (currentPath.includes('resources.html')) {
        if (els.resourcesSection) els.resourcesSection.style.display = 'block';
        if (els.dashboardMainSection) els.dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (els.navResources) els.navResources.classList.add('active');
    } else if (currentPath.includes('settings.html')) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (els.navSettings) els.navSettings.classList.add('active');
        if (els.dashboardMainSection) els.dashboardMainSection.style.display = 'none';
    } else if (currentPath.includes('consultant-dashboard.html') || currentPath.endsWith('/') || currentPath.endsWith('index.html')) {
        if (els.dashboardMainSection) els.dashboardMainSection.style.display = 'block';
        loadDashboardData();
    }

    // Event Listeners
    if (els.logoutBtn) els.logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
    if (els.headerLogoutBtn) els.headerLogoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
    if (els.addStudentBtn) els.addStudentBtn.addEventListener('click', openAddStudentModal);
    if (els.quickAddStudent) els.quickAddStudent.addEventListener('click', openAddStudentModal);
    if (els.closeModal) els.closeModal.addEventListener('click', closeStudentModal);
    if (els.cancelModal) els.cancelModal.addEventListener('click', closeStudentModal);
    if (els.studentForm) els.studentForm.addEventListener('submit', submitStudentForm);
    if (els.searchInput) els.searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadStudents(e.target.value), 300);
    });

    // Navigation overrides (for SPA feel within MPA)
    [els.navStudents, els.navAnalytics, els.navSupport, els.navResources, els.navDashboard].forEach(nav => {
        if (nav) nav.addEventListener('click', () => {
            if (supportPollInterval) clearInterval(supportPollInterval);
        });
    });

    const tableBody = document.getElementById('studentTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', e => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;
            const { action, id, name } = btn.dataset;
            if (action === 'edit') editStudent(id);
            else if (action === 'test') window.location.href = `game/index.html?student=${id}&name=${encodeURIComponent(name)}`;
            else if (action === 'delete') deleteStudent(id, name);
        });
    }

    const refreshSupportBtn = document.getElementById('refreshSupportBtn');
    if (refreshSupportBtn) refreshSupportBtn.addEventListener('click', loadSupportRequests);

    const refreshActivity = document.getElementById('refreshActivity');
    if (refreshActivity) refreshActivity.addEventListener('click', loadDashboardData);

    // Quick Actions
    const quickActionMap = {
        'quickActionAddStudent': async () => {
            const id = await generateUniqueStudentId();
            openAddStudentModal();
            const input = document.getElementById('studentIdInput');
            if (input) { input.value = id; input.disabled = false; }
            showToast(`ID ${id} generated!`);
        },
        'quickActionViewAnalytics': () => { if (els.navAnalytics) els.navAnalytics.click(); },
        'quickActionStartAssessment': () => { window.location.href = 'game/index.html'; },
        'quickActionSupportRequests': () => { if (els.navSupport) els.navSupport.click(); }
    };

    Object.keys(quickActionMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', quickActionMap[id]);
    });
};

/* Global Functions for data loading and rendering */

async function loadSupportRequests() {
    try {
        const data = await apiRequest('/chat/admin/flagged');
        const requests = data.data || [];
        const tbody = document.getElementById('supportTableBody');
        const empty = document.getElementById('supportEmptyState');
        const container = document.getElementById('supportTableContainer');

        if (requests.length === 0) {
            if (empty) empty.style.display = 'block';
            if (container) container.style.display = 'none';
        } else {
            if (empty) empty.style.display = 'none';
            if (container) container.style.display = 'block';
            if (tbody) tbody.innerHTML = requests.map(req => `
                <tr>
                    <td>${req.userId ? (req.userId.firstName + ' ' + req.userId.lastName) : 'Unknown'}</td>
                    <td>${req.message}</td>
                    <td>${new Date(req.createdAt).toLocaleString()}</td>
                    <td><span class="badge badge-warning">Flagged</span></td>
                    <td><button class="action-btn" title="Resolved"><i class="fas fa-check"></i></button></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        showToast('Failed to load support requests', 'error');
    }
}

async function loadAnalyticsData() {
    try {
        const data = await apiRequest('/users/analytics');
        const a = data.analytics || {};
        const map = {
            'analyticsTotalStudents': a.totalStudents,
            'analyticsNeedingSupport': a.studentsNeedingSupport,
            'analyticsActiveStudents': a.activeStudents,
            'analyticsAvgScore': Math.round(a.overallAverageScore || 0) + '%'
        };
        Object.keys(map).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = map[id] || 0;
        });

        renderDyslexiaTypeChart(a.dyslexiaBreakdown || {});
        renderSeverityChart(a.severityBreakdown || {});
        renderDyslexiaChancesChart(a.dyslexiaChances || {});
        populateAnalyticsStudentTable(a.studentsWithProgress || []);
    } catch (e) {
        if (window.location.pathname.includes('analytics.html')) showToast('Failed to load analytics', 'error');
    }
}

function renderDyslexiaTypeChart(breakdown) {
    const ctx = document.getElementById('dyslexiaTypeChart');
    if (!ctx) return;
    if (analyticsCharts.dyslexiaType) analyticsCharts.dyslexiaType.destroy();
    const map = { 'none': 'None', 'dyslexia': 'Dyslexia', 'dyscalculia': 'Dyscalculia', 'dysgraphia': 'Dysgraphia', 'dysphasia': 'Dysphasia' };
    const labels = Object.keys(breakdown).map(k => map[k] || k);
    const data = Object.values(breakdown);
    analyticsCharts.dyslexiaType = new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: ['#7c3aed', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderSeverityChart(breakdown) {
    const ctx = document.getElementById('severityChart');
    if (!ctx) return;
    if (analyticsCharts.severity) analyticsCharts.severity.destroy();
    const labels = Object.keys(breakdown).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    analyticsCharts.severity = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: Object.values(breakdown), backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderDyslexiaChancesChart(chances) {
    const ctx = document.getElementById('dyslexiaChancesChart');
    if (!ctx) return;
    if (analyticsCharts.dyslexiaChances) analyticsCharts.dyslexiaChances.destroy();
    analyticsCharts.dyslexiaChances = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['High Risk', 'Medium Risk', 'Low Risk'],
            datasets: [{ label: 'Students', data: [chances.high || 0, chances.medium || 0, chances.low || 0], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'] }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

function populateAnalyticsStudentTable(students) {
    const tbody = document.getElementById('analyticsStudentTableBody');
    if (!tbody) return;
    if (!students.length) { tbody.innerHTML = '<tr><td colspan="8">No data</td></tr>'; return; }
    const types = { 'none': 'None', 'dyslexia': 'Dyslexia', 'dyscalculia': 'Dyscalculia', 'dysgraphia': 'Dysgraphia', 'dysphasia': 'Dysphasia' };
    tbody.innerHTML = students.map(s => `
        <tr>
            <td>${s.firstName} ${s.lastName}</td>
            <td>${s.studentId || 'N/A'}</td>
            <td>${types[s.learningProfile?.dyslexiaType || 'none']}</td>
            <td>${s.learningProfile?.severity || 'Mild'}</td>
            <td>${Math.round(s.progress?.averageScore || 0)}%</td>
            <td>${Math.round(s.progress?.averageAccuracy || 0)}%</td>
            <td>${s.progress?.totalSessions || 0}</td>
            <td>${s.progress?.latestDate ? new Date(s.progress.latestDate).toLocaleDateString() : 'Never'}</td>
        </tr>
    `).join('');
}

async function loadDashboardData() {
    try {
        const data = await apiRequest('/users/analytics');
        const a = data.analytics || {};
        updateDashboardStats(a);
        renderPerformanceTrendChart(a.studentsWithProgress || []);
        renderDashboardDyslexiaChart(a.dyslexiaBreakdown || {});
        populateActivityTimeline(a.studentsWithProgress || []);
        populateTopPerformers(a.studentsWithProgress || []);
        populateAttentionStudents(a.studentsWithProgress || []);
    } catch (e) {
        console.error('Dashboard load failed', e);
    }
}

function updateDashboardStats(a) {
    const students = a.studentsWithProgress || [];
    const map = {
        'totalStudents': a.totalStudents,
        'needingSupport': a.studentsNeedingSupport,
        'testsCompleted': students.reduce((sum, s) => sum + (s.progress?.totalSessions || 0), 0),
        'activeStudents': a.activeStudents,
        'avgPerformance': Math.round(a.overallAverageScore || 0) + '%',
        'improvingStudents': students.filter(s => (s.progress?.averageScore || 0) > 50).length
    };
    Object.keys(map).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = map[id] || 0;
    });
}

function renderPerformanceTrendChart(students) {
    const ctx = document.getElementById('performanceTrendChart');
    if (!ctx) return;
    if (dashboardCharts.performanceTrend) dashboardCharts.performanceTrend.destroy();
    const labels = []; const scores = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const avg = students.length ? students.reduce((sum, s) => sum + (s.progress?.averageScore || 0), 0) / students.length : 0;
        scores.push(avg + (Math.random() * 10 - 5));
    }
    dashboardCharts.performanceTrend = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Avg Perf', data: scores, borderColor: '#7c3aed', tension: 0.4, fill: true }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderDashboardDyslexiaChart(breakdown) {
    const ctx = document.getElementById('dashboardDyslexiaChart');
    if (!ctx) return;
    if (dashboardCharts.dyslexia) dashboardCharts.dyslexia.destroy();
    const map = { 'none': 'None', 'dyslexia': 'Dyslexia', 'dyscalculia': 'Dyscalculia', 'dysgraphia': 'Dysgraphia', 'dysphasia': 'Dysphasia' };
    dashboardCharts.dyslexia = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(breakdown).map(k => map[k] || k),
            datasets: [{ data: Object.values(breakdown), backgroundColor: ['#10b981', '#7c3aed', '#ef4444', '#f59e0b', '#3b82f6'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function populateActivityTimeline(students) {
    const el = document.getElementById('activityTimeline');
    if (!el) return;
    const recent = students.filter(s => s.progress?.latestDate).sort((a, b) => new Date(b.progress.latestDate) - new Date(a.progress.latestDate)).slice(0, 5);
    el.innerHTML = recent.length ? recent.map(s => `<div class="activity-item"><strong>${s.firstName}</strong> assessment done <small>${getTimeAgo(new Date(s.progress.latestDate))}</small></div>`).join('') : '<p>No activity</p>';
}

function populateTopPerformers(students) {
    const el = document.getElementById('topPerformersList');
    if (!el) return;
    const top = students.filter(s => s.progress?.averageScore).sort((a, b) => (b.progress.averageScore || 0) - (a.progress.averageScore || 0)).slice(0, 5);
    el.innerHTML = top.length ? top.map((s, i) => `<div class="performer-item">#${i + 1} ${s.firstName} ${s.lastName} - ${Math.round(s.progress.averageScore)}%</div>`).join('') : '<p>No data</p>';
}

function populateAttentionStudents(students) {
    const el = document.getElementById('attentionStudentsList');
    if (!el) return;
    const needed = students.filter(s => (s.progress?.averageScore || 0) < 50 || s.learningProfile?.severity === 'severe').slice(0, 5);
    el.innerHTML = needed.length ? needed.map(s => `<div class="attention-item">${s.firstName} - ${Math.round(s.progress?.averageScore || 0)}%</div>`).join('') : '<p>All good!</p>';
}

function getTimeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

async function generateUniqueStudentId() {
    try {
        const data = await apiRequest('/users/students?limit=1000');
        const students = data.students || [];
        const ids = students.map(s => s.studentId).filter(id => id && id.startsWith('STU')).map(id => parseInt(id.replace('STU', ''))).filter(n => !isNaN(n));
        const max = ids.length > 0 ? Math.max(...ids) : 0;
        return `STU${String(max + 1).padStart(3, '0')}`;
    } catch (e) {
        return `STU${String(Date.now()).slice(-6)}`;
    }
}
