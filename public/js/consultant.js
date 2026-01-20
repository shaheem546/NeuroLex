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

    // All users can access consultant dashboard now
    // Role-specific features are handled within the dashboard
}

// Load analytics
async function loadAnalytics() {
    try {
        const data = await apiRequest('/users/analytics');
        const analytics = data.analytics;

        // Update dashboard stats if dashboard is visible
        const dashboardSection = document.getElementById('dashboardMainSection');
        if (dashboardSection && dashboardSection.style.display !== 'none') {
            updateDashboardStats(analytics);
        }

        // Update basic stats (for backward compatibility)
        const totalEl = document.getElementById('totalStudents');
        const activeEl = document.getElementById('activeStudents');
        const needingEl = document.getElementById('needingSupport');

        if (totalEl && !totalEl.classList.contains('stat-value')) {
            totalEl.innerHTML = `${analytics.totalStudents || 0} <span class="stat-badge positive">+${Math.floor(Math.random() * 10) + 1}</span>`;
        } else if (totalEl && totalEl.classList.contains('stat-value')) {
            totalEl.textContent = analytics.totalStudents || 0;
        }

        if (activeEl && activeEl.classList.contains('stat-value')) {
            activeEl.textContent = analytics.activeStudents || 0;
        } else if (activeEl) {
            activeEl.textContent = analytics.activeStudents || 0;
        }

        if (needingEl && needingEl.classList.contains('stat-value')) {
            needingEl.textContent = analytics.studentsNeedingSupport || 0;
        } else if (needingEl) {
            needingEl.textContent = analytics.studentsNeedingSupport || 0;
        }

        // Update dyslexia distribution
        const breakdown = analytics.dyslexiaBreakdown || {};
        updateDyslexiaDistribution(breakdown);

    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// Update dyslexia distribution in sidebar
function updateDyslexiaDistribution(breakdown) {
    const dyslexiaEl = document.getElementById('countDyslexia');
    const dyscalculiaEl = document.getElementById('countDyscalculia');
    const dysgraphiaEl = document.getElementById('countDysgraphia');
    const dysphasiaEl = document.getElementById('countDysphasia');

    if (dyslexiaEl) dyslexiaEl.textContent = `${breakdown.dyslexia || 0} students`;
    if (dyscalculiaEl) dyscalculiaEl.textContent = `${breakdown.dyscalculia || 0} students`;
    if (dysgraphiaEl) dysgraphiaEl.textContent = `${breakdown.dysgraphia || 0} students`;
    if (dysphasiaEl) dysphasiaEl.textContent = `${breakdown.dysphasia || 0} students`;
}

// Load students
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
            <td>
              <span class="badge badge-${student.learningProfile?.dyslexiaType || 'none'}">
                ${formatDyslexiaType(student.learningProfile?.dyslexiaType)}
              </span>
            </td>
            <td>
              <span class="badge badge-${student.learningProfile?.severity || 'mild'}">
                ${capitalize(student.learningProfile?.severity || 'Mild')}
              </span>
            </td>
            <td>
              <button class="action-btn btn-edit" data-action="edit" data-id="${student._id}" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn btn-test" data-action="test" data-id="${student._id}" data-name="${student.firstName} ${student.lastName}" title="Start Game">
                <i class="fas fa-clipboard-check"></i>
              </button>
              <button class="action-btn btn-delete" data-action="delete" data-id="${student._id}" data-name="${student.firstName} ${student.lastName}" title="Deactivate">
                <i class="fas fa-trash"></i>
              </button>
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

// Format dyslexia type for display
function formatDyslexiaType(type) {
    const types = {
        'none': 'None',
        'dyslexia': 'Dyslexia',
        'dyscalculia': 'Dyscalculia',
        'dysgraphia': 'Dysgraphia',
        'dysphasia': 'Dysphasia'
    };
    return types[type] || 'None';
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Modal management
let editingStudentId = null;

function openAddStudentModal() {
    editingStudentId = null;
    document.getElementById('modalTitle').textContent = 'Add New Student';
    document.getElementById('submitBtn').textContent = 'Add Student';
    document.getElementById('studentForm').reset();
    document.getElementById('email').disabled = false;
    document.getElementById('studentIdInput').disabled = false;
    document.getElementById('studentModal').classList.add('active');
}

function closeStudentModal() {
    document.getElementById('studentModal').classList.remove('active');
    editingStudentId = null;
}

async function editStudent(id) {
    try {
        const data = await apiRequest(`/users/students/${id}`);
        const student = data.student;

        editingStudentId = id;
        document.getElementById('modalTitle').textContent = 'Edit Student';
        document.getElementById('submitBtn').textContent = 'Update Student';

        document.getElementById('firstName').value = student.firstName || '';
        document.getElementById('lastName').value = student.lastName || '';
        document.getElementById('email').value = student.email || '';
        document.getElementById('email').disabled = true;
        document.getElementById('studentIdInput').value = student.studentId || '';
        document.getElementById('studentIdInput').disabled = true;
        document.getElementById('grade').value = student.grade || '';
        document.getElementById('dyslexiaType').value = student.learningProfile?.dyslexiaType || 'none';
        document.getElementById('severity').value = student.learningProfile?.severity || 'mild';

        document.getElementById('studentModal').classList.add('active');
    } catch (error) {
        showToast('Failed to load student data', 'error');
    }
}

// Submit student form
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

// Delete (deactivate) student
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

// Test assignment
function openTestModal(studentId, studentName) {
    document.getElementById('testStudentId').value = studentId;
    document.getElementById('testStudentName').textContent = studentName;
    document.getElementById('testModal').classList.add('active');
}

function closeTestModal() {
    document.getElementById('testModal').classList.remove('active');
}

async function submitTestForm(e) {
    e.preventDefault();

    const studentId = document.getElementById('testStudentId').value;
    const testType = document.getElementById('testType').value;

    try {
        await apiRequest(`/users/students/${studentId}/assign-test`, 'POST', { testType });
        showToast('Test assigned! Starting game...');
        closeTestModal();

        // Redirect to game with params
        setTimeout(() => {
            window.location.href = `game/index.html?student=${studentId}&task=${testType}`;
        }, 1000);
    } catch (error) {
        showToast(error.message || 'Failed to assign test', 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}

// Search with debounce
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadStudents(e.target.value);
    }, 300);
}

// Initialize
window.onload = function () {
    // Auth check - redirect to login if not authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    getUserInfo();
    loadAnalytics();
    loadStudents();

    // Common Elements
    const logoutBtn = document.getElementById('logoutBtn');
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
    const addStudentBtn = document.getElementById('addStudentBtn');
    const quickAddStudent = document.getElementById('quickAddStudent');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const studentForm = document.getElementById('studentForm');
    const searchInput = document.getElementById('searchInput');
    const closeTestModalBtn = document.getElementById('closeTestModal');
    const cancelTestModalBtn = document.getElementById('cancelTestModal');
    const testForm = document.getElementById('testForm');

    const navDashboard = document.getElementById('navDashboard');
    const navStudents = document.getElementById('navStudents');
    const navAnalytics = document.getElementById('navAnalytics');
    const navResources = document.getElementById('navResources');
    const navSupport = document.getElementById('navSupport');
    const navSettings = document.getElementById('navSettings');

    const dashboardMainSection = document.getElementById('dashboardMainSection');
    const studentsSection = document.getElementById('studentsSection');
    const analyticsSection = document.getElementById('analyticsSection');
    const resourcesSection = document.getElementById('resourcesSection');
    const supportSection = document.getElementById('supportSection');

    // Page-specific initialization based on URL
    const currentPath = window.location.pathname;
    if (currentPath.includes('students.html')) {
        if (studentsSection) studentsSection.style.display = 'block';
        if (dashboardMainSection) dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navStudents) navStudents.classList.add('active');
    } else if (currentPath.includes('analytics.html')) {
        if (analyticsSection) analyticsSection.style.display = 'block';
        if (dashboardMainSection) dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navAnalytics) navAnalytics.classList.add('active');
        loadAnalyticsData();
    } else if (currentPath.includes('support.html')) {
        if (supportSection) supportSection.style.display = 'block';
        if (dashboardMainSection) dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navSupport) navSupport.classList.add('active');
        loadSupportRequests();
    } else if (currentPath.includes('resources.html')) {
        if (resourcesSection) resourcesSection.style.display = 'block';
        if (dashboardMainSection) dashboardMainSection.style.display = 'none';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navResources) navResources.classList.add('active');
    } else if (currentPath.includes('settings.html')) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navSettings) navSettings.classList.add('active');
        if (dashboardMainSection) dashboardMainSection.style.display = 'none';
    } else if (currentPath.includes('consultant-dashboard.html') || currentPath.endsWith('/') || currentPath.endsWith('index.html')) {
        // Fallback for dashboard
        if (dashboardMainSection) dashboardMainSection.style.display = 'block';
    }

    if (logoutBtn) logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });
    if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });
    if (addStudentBtn) addStudentBtn.addEventListener('click', openAddStudentModal);
    if (quickAddStudent) quickAddStudent.addEventListener('click', openAddStudentModal);
    if (closeModal) closeModal.addEventListener('click', closeStudentModal);
    if (cancelModal) cancelModal.addEventListener('click', closeStudentModal);
    if (studentForm) studentForm.addEventListener('submit', submitStudentForm);
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (closeTestModalBtn) closeTestModalBtn.addEventListener('click', closeTestModal);
    if (cancelTestModalBtn) cancelTestModalBtn.addEventListener('click', closeTestModal);
    if (testForm) testForm.addEventListener('submit', submitTestForm);
    // Unified navigation handler for Students
    if (navStudents) {
        const originalHandler = () => {
            // Hide other sections
            if (analyticsSection) analyticsSection.style.display = 'none';
            if (supportSection) supportSection.style.display = 'none';
            if (resourcesSection) resourcesSection.style.display = 'none';

            // Show students section
            if (studentsSection) studentsSection.style.display = 'block';

            // Update active nav
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navStudents.classList.add('active');

            // Stop support polling
            if (supportPollInterval) clearInterval(supportPollInterval);
        };
        navStudents.addEventListener('click', (e) => {
            // No preventDefault to allow navigation to students.html
            originalHandler();
        });
    }

    // Event delegation for table actions
    const tableBody = document.getElementById('studentTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const name = btn.dataset.name;

            if (action === 'edit') {
                editStudent(id);
            } else if (action === 'test') {
                // Direct redirect to game as requested
                window.location.href = `game/index.html?student=${id}&name=${encodeURIComponent(name)}`;
            } else if (action === 'delete') {
                deleteStudent(id, name);
            }
        });
    }

    /* Support Request Logic */
    const refreshSupportBtn = document.getElementById('refreshSupportBtn');

    if (navSupport) {
        navSupport.addEventListener('click', (e) => {
            // No preventDefault to allow navigation to support.html
            // Toggle visibility
            if (studentsSection) studentsSection.style.display = 'none';
            if (supportSection) supportSection.style.display = 'block';

            // Update active nav
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navSupport.classList.add('active');

            loadSupportRequests();
        });
    }

    if (refreshSupportBtn) {
        refreshSupportBtn.addEventListener('click', loadSupportRequests);
    }


    async function loadSupportRequests() {
        try {
            const data = await apiRequest('/chat/admin/flagged');
            const requests = data.data || [];

            const tbody = document.getElementById('supportTableBody');
            const emptyState = document.getElementById('supportEmptyState');
            const tableContainer = document.getElementById('supportTableContainer');

            if (requests.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                if (tableContainer) tableContainer.style.display = 'none';
            } else {
                if (emptyState) emptyState.style.display = 'none';
                if (tableContainer) tableContainer.style.display = 'block';

                tbody.innerHTML = requests.map(req => `
                    <tr>
                        <td>
                            <div class="student-name">
                                <span>${req.userId ? (req.userId.firstName + ' ' + req.userId.lastName) : 'Unknown'}</span>
                                <small style="display:block; color:#64748b; font-size: 0.8em">${req.userId ? req.userId.email : ''}</small>
                            </div>
                        </td>
                        <td>${req.message}</td>
                        <td>${new Date(req.createdAt).toLocaleString()}</td>
                        <td><span class="badge badge-warning">Flagged</span></td>
                        <td>
                             <button class="action-btn" title="Mark Resolved" onclick="alert('Feature coming soon')">
                                <i class="fas fa-check"></i>
                            </button>
                        </td>
                    </tr>
                 `).join('');
            }

        } catch (err) {
            console.error('Failed to load support requests', err);
            // Show exact error from server if possible
            showToast(err.message || 'Failed to load support requests', 'error');
        }
    }

    /* Resources Navigation */
    if (navResources) {
        navResources.addEventListener('click', (e) => {
            // No preventDefault to allow navigation to resources.html
            // Hide other sections
            if (studentsSection) studentsSection.style.display = 'none';
            if (supportSection) supportSection.style.display = 'none';
            if (analyticsSection) analyticsSection.style.display = 'none';

            // Show resources section
            if (resourcesSection) resourcesSection.style.display = 'block';

            // Update active nav
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navResources.classList.add('active');

            // Stop support polling
            if (supportPollInterval) clearInterval(supportPollInterval);
        });
    }

    /* Analytics Logic */
    let analyticsCharts = {};

    if (navAnalytics) {
        navAnalytics.addEventListener('click', (e) => {
            // No preventDefault to allow navigation to analytics.html
            // Hide other sections
            if (studentsSection) studentsSection.style.display = 'none';
            if (supportSection) supportSection.style.display = 'none';
            const resourcesSection = document.getElementById('resourcesSection');
            if (resourcesSection) resourcesSection.style.display = 'none';

            // Show analytics section
            if (analyticsSection) analyticsSection.style.display = 'block';

            // Update active nav
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navAnalytics.classList.add('active');

            // Load analytics data
            loadAnalyticsData();
        });
    }

    async function loadAnalyticsData() {
        try {
            const data = await apiRequest('/users/analytics');
            const analytics = data.analytics || {};

            // Update stats with null checks
            const totalEl = document.getElementById('analyticsTotalStudents');
            const needingEl = document.getElementById('analyticsNeedingSupport');
            const activeEl = document.getElementById('analyticsActiveStudents');
            const avgEl = document.getElementById('analyticsAvgScore');

            if (totalEl) totalEl.textContent = analytics.totalStudents || 0;
            if (needingEl) needingEl.textContent = analytics.studentsNeedingSupport || 0;
            if (activeEl) activeEl.textContent = analytics.activeStudents || 0;
            if (avgEl) avgEl.textContent = Math.round(analytics.overallAverageScore || 0) + '%';

            // Render charts
            renderDyslexiaTypeChart(analytics.dyslexiaBreakdown || {});
            renderSeverityChart(analytics.severityBreakdown || {});
            renderDyslexiaChancesChart(analytics.dyslexiaChances || {});

            // Populate student table
            const analyticsBody = document.getElementById('analyticsStudentTableBody');
            if (analyticsBody) {
                if (typeof populateAnalyticsStudentTable_Enhanced === 'function') {
                    populateAnalyticsStudentTable_Enhanced(analytics.studentsWithProgress || []);
                } else {
                    populateAnalyticsStudentTable(analytics.studentsWithProgress || []);
                }
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            if (window.location.pathname.includes('analytics.html')) {
                showToast('Failed to load analytics data', 'error');
            }
        }
    }

    function renderDyslexiaTypeChart(breakdown) {
        const ctx = document.getElementById('dyslexiaTypeChart');
        if (!ctx) return;

        // Destroy existing chart if present
        if (analyticsCharts.dyslexiaType) {
            analyticsCharts.dyslexiaType.destroy();
        }

        const labels = Object.keys(breakdown).map(key => {
            const labelsMap = {
                'none': 'None',
                'dyslexia': 'Dyslexia',
                'dyscalculia': 'Dyscalculia',
                'dysgraphia': 'Dysgraphia',
                'dysphasia': 'Dysphasia'
            };
            return labelsMap[key] || key;
        });
        const data = Object.values(breakdown);
        const colors = ['#7c3aed', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

        analyticsCharts.dyslexiaType = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderSeverityChart(breakdown) {
        const ctx = document.getElementById('severityChart');
        if (!ctx) return;

        if (analyticsCharts.severity) {
            analyticsCharts.severity.destroy();
        }

        const labels = Object.keys(breakdown).map(key => {
            return key.charAt(0).toUpperCase() + key.slice(1);
        });
        const data = Object.values(breakdown);
        const colors = ['#10b981', '#f59e0b', '#ef4444'];

        analyticsCharts.severity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderDyslexiaChancesChart(chances) {
        const ctx = document.getElementById('dyslexiaChancesChart');
        if (!ctx) return;

        if (analyticsCharts.dyslexiaChances) {
            analyticsCharts.dyslexiaChances.destroy();
        }

        analyticsCharts.dyslexiaChances = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                datasets: [{
                    label: 'Number of Students',
                    data: [chances.high || 0, chances.medium || 0, chances.low || 0],
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                    borderColor: ['#dc2626', '#d97706', '#059669'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Students: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function populateAnalyticsStudentTable(students) {
        const tbody = document.getElementById('analyticsStudentTableBody');
        if (!tbody) return;

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">No student data available</td></tr>';
            return;
        }

        tbody.innerHTML = students.map(student => {
            const dyslexiaType = student.learningProfile?.dyslexiaType || 'none';
            const severity = student.learningProfile?.severity || 'N/A';
            const progress = student.progress || {};
            const avgScore = Math.round(progress.averageScore || 0);
            const accuracy = Math.round(progress.averageAccuracy || 0);
            const sessions = progress.totalSessions || 0;
            const latestDate = progress.latestDate ? new Date(progress.latestDate).toLocaleDateString() : 'Never';

            const dyslexiaTypeLabels = {
                'none': 'None',
                'dyslexia': 'Dyslexia',
                'dyscalculia': 'Dyscalculia',
                'dysgraphia': 'Dysgraphia',
                'dysphasia': 'Dysphasia'
            };

            const severityColors = {
                'mild': '#10b981',
                'moderate': '#f59e0b',
                'severe': '#ef4444'
            };

            return `
                <tr>
                    <td>
                        <div class="student-name">
                            <span>${student.firstName} ${student.lastName}</span>
                            <small style="display:block; color:#64748b; font-size: 0.8em">${student.email || ''}</small>
                        </div>
                    </td>
                    <td>${student.studentId || 'N/A'}</td>
                    <td><span class="badge" style="background: #7c3aed;">${dyslexiaTypeLabels[dyslexiaType] || dyslexiaType}</span></td>
                    <td><span class="badge" style="background: ${severityColors[severity] || '#6b7280'};">${severity.charAt(0).toUpperCase() + severity.slice(1)}</span></td>
                    <td><strong>${avgScore}%</strong></td>
                    <td>${accuracy}%</td>
                    <td>${sessions}</td>
                    <td>${latestDate}</td>
                </tr>
            `;
        }).join('');
    }

    /* Dashboard Logic */
    let dashboardCharts = {};

    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            // No preventDefault to allow navigation to consultant-dashboard.html
            // Hide other sections
            if (studentsSection) studentsSection.style.display = 'none';
            if (supportSection) supportSection.style.display = 'none';
            if (analyticsSection) analyticsSection.style.display = 'none';
            if (resourcesSection) resourcesSection.style.display = 'none';

            // Show dashboard section
            if (dashboardMainSection) dashboardMainSection.style.display = 'block';

            // Update active nav
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navDashboard.classList.add('active');

            // Load dashboard data
            loadDashboardData();
        });
    }

    async function loadDashboardData() {
        try {
            const data = await apiRequest('/users/analytics');
            const analytics = data.analytics || {};

            // Update enhanced stats
            updateDashboardStats(analytics);

            // Render charts
            renderPerformanceTrendChart(analytics.studentsWithProgress || []);
            renderDashboardDyslexiaChart(analytics.dyslexiaBreakdown || {});

            // Populate widgets
            populateActivityTimeline(analytics.studentsWithProgress || []);
            populateTopPerformers(analytics.studentsWithProgress || []);
            populateAttentionStudents(analytics.studentsWithProgress || []);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            showToast(error.message || 'Failed to load dashboard data', 'error');
        }
    }

    function updateDashboardStats(analytics) {
        const students = analytics.studentsWithProgress || [];
        const total = analytics.totalStudents || 0;
        const needingSupport = analytics.studentsNeedingSupport || 0;
        const active = analytics.activeStudents || 0;
        const avgPerformance = Math.round(analytics.overallAverageScore || 0);

        // Count tests completed
        const testsCompleted = students.reduce((sum, s) => sum + (s.progress?.totalSessions || 0), 0);

        // Count improving students
        const improving = students.filter(s => {
            const progress = s.progress || {};
            return progress.averageScore > 50 && progress.averageAccuracy > 60;
        }).length;

        // Add null checks for all dashboard stat elements
        const totalEl = document.getElementById('totalStudents');
        const needingEl = document.getElementById('needingSupport');
        const testsEl = document.getElementById('testsCompleted');
        const activeEl = document.getElementById('activeStudents');
        const avgEl = document.getElementById('avgPerformance');
        const improvingEl = document.getElementById('improvingStudents');

        if (totalEl) totalEl.textContent = total;
        if (needingEl) needingEl.textContent = needingSupport;
        if (testsEl) testsEl.textContent = testsCompleted;
        if (activeEl) activeEl.textContent = active;
        if (avgEl) avgEl.textContent = avgPerformance + '%';
        if (improvingEl) improvingEl.textContent = improving;
    }

    function renderPerformanceTrendChart(students) {
        const ctx = document.getElementById('performanceTrendChart');
        if (!ctx) return;

        if (dashboardCharts.performanceTrend) {
            dashboardCharts.performanceTrend.destroy();
        }

        // Generate last 30 days data
        const days = 30;
        const labels = [];
        const scores = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // Calculate average score for this day (simplified - in real app, use actual date-based data)
            const avgScore = students.length > 0
                ? students.reduce((sum, s) => sum + (s.progress?.averageScore || 0), 0) / students.length
                : 0;
            scores.push(avgScore + (Math.random() * 10 - 5)); // Add some variance
        }

        dashboardCharts.performanceTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Performance',
                    data: scores,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function (value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    function renderDashboardDyslexiaChart(breakdown) {
        const ctx = document.getElementById('dashboardDyslexiaChart');
        if (!ctx) return;

        if (dashboardCharts.dyslexia) {
            dashboardCharts.dyslexia.destroy();
        }

        const labels = Object.keys(breakdown).map(key => {
            const labelsMap = {
                'none': 'None',
                'dyslexia': 'Dyslexia',
                'dyscalculia': 'Dyscalculia',
                'dysgraphia': 'Dysgraphia',
                'dysphasia': 'Dysphasia'
            };
            return labelsMap[key] || key;
        });
        const data = Object.values(breakdown);
        const colors = ['#10b981', '#7c3aed', '#ef4444', '#f59e0b', '#3b82f6'];

        dashboardCharts.dyslexia = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    function populateActivityTimeline(students) {
        const timeline = document.getElementById('activityTimeline');
        if (!timeline) return;

        // Sort by latest activity
        const recent = students
            .filter(s => s.progress?.latestDate)
            .sort((a, b) => new Date(b.progress.latestDate) - new Date(a.progress.latestDate))
            .slice(0, 5);

        if (recent.length === 0) {
            timeline.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">No recent activity</p>';
            return;
        }

        timeline.innerHTML = recent.map(student => {
            const date = new Date(student.progress.latestDate);
            const timeAgo = getTimeAgo(date);
            return `
                <div class="activity-item">
                    <div class="activity-dot"></div>
                    <div class="activity-content">
                        <div class="activity-text">
                            <strong>${student.firstName} ${student.lastName}</strong> completed an assessment
                        </div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function populateTopPerformers(students) {
        const list = document.getElementById('topPerformersList');
        if (!list) return;

        const topPerformers = students
            .filter(s => s.progress?.averageScore)
            .sort((a, b) => (b.progress?.averageScore || 0) - (a.progress?.averageScore || 0))
            .slice(0, 5);

        if (topPerformers.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">No performance data</p>';
            return;
        }

        list.innerHTML = topPerformers.map((student, index) => {
            const score = Math.round(student.progress?.averageScore || 0);
            return `
                <div class="performer-item">
                    <div class="performer-rank">#${index + 1}</div>
                    <div class="performer-info">
                        <div class="performer-name">${student.firstName} ${student.lastName}</div>
                        <div class="performer-details">${student.studentId || 'N/A'}</div>
                    </div>
                    <div class="performer-score">${score}%</div>
                </div>
            `;
        }).join('');
    }

    function populateAttentionStudents(students) {
        const list = document.getElementById('attentionStudentsList');
        if (!list) return;

        const attentionNeeded = students
            .filter(s => {
                const progress = s.progress || {};
                const hasLowScore = progress.averageScore < 50 || progress.averageAccuracy < 60;
                const hasSeverity = s.learningProfile?.severity === 'severe';
                return hasLowScore || hasSeverity;
            })
            .slice(0, 5);

        if (attentionNeeded.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #10b981; padding: 2rem;">All students are doing well! 🎉</p>';
            return;
        }

        list.innerHTML = attentionNeeded.map(student => {
            const progress = student.progress || {};
            const score = Math.round(progress.averageScore || 0);
            const severity = student.learningProfile?.severity || 'N/A';
            return `
                <div class="attention-item">
                    <div class="attention-avatar">
                        ${student.firstName.charAt(0)}${student.lastName.charAt(0)}
                    </div>
                    <div class="attention-info">
                        <div class="attention-name">${student.firstName} ${student.lastName}</div>
                        <div class="attention-details">
                            Score: ${score}% | Severity: ${severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </div>
                    </div>
                    <button class="attention-action-btn" onclick="window.location.href='game/index.html?student=${student._id}'">
                        <i class="fas fa-clipboard-check"></i> Assign Test
                    </button>
                </div>
            `;
        }).join('');
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    // Refresh activity handler
    const refreshActivity = document.getElementById('refreshActivity');
    if (refreshActivity) {
        refreshActivity.addEventListener('click', () => {
            loadDashboardData();
        });
    }

    // Initialize dashboard on load
    if (dashboardMainSection && dashboardMainSection.style.display !== 'none') {
        loadDashboardData();
    }

    /* ========================================
       QUICK ACTIONS FUNCTIONALITY
       ======================================== */

    // 1. Add Student - Auto-generate unique Student ID
    const quickActionAddStudent = document.getElementById('quickActionAddStudent');
    if (quickActionAddStudent) {
        quickActionAddStudent.addEventListener('click', async function () {
            // Generate unique student ID
            const uniqueStudentId = await generateUniqueStudentId();

            // Open the modal
            openAddStudentModal();

            // Pre-fill the student ID field
            const studentIdInput = document.getElementById('studentIdInput');
            if (studentIdInput) {
                studentIdInput.value = uniqueStudentId;
                studentIdInput.disabled = false; // Allow editing if needed
            }

            showToast(`Student ID ${uniqueStudentId} generated!`, 'success');
        });
    }

    // Helper function to generate unique student ID
    async function generateUniqueStudentId() {
        try {
            // Fetch existing students to find the highest ID number
            const data = await apiRequest('/users/students?limit=1000');
            const students = data.students || [];

            // Extract numeric part from student IDs (e.g., STU001 -> 001)
            const existingIds = students
                .map(s => s.studentId)
                .filter(id => id && id.startsWith('STU'))
                .map(id => parseInt(id.replace('STU', '')))
                .filter(num => !isNaN(num));

            // Find the max and increment
            const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
            const newId = maxId + 1;

            // Format as STU001, STU002, etc.
            return `STU${String(newId).padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating student ID:', error);
            // Fallback: use timestamp-based ID
            return `STU${String(Date.now()).slice(-6)}`;
        }
    }

    // 2. View Analytics - Navigate to analytics with student details & game scores
    const quickActionViewAnalytics = document.getElementById('quickActionViewAnalytics');
    if (quickActionViewAnalytics) {
        quickActionViewAnalytics.addEventListener('click', function () {
            // Click the nav analytics button
            if (navAnalytics) {
                navAnalytics.click();
            }

            showToast('Opening Analytics - View student details and game scores', 'success');
        });
    }

    // 3. Start Assessment - Redirect to Game Level 1
    const quickActionStartAssessment = document.getElementById('quickActionStartAssessment');
    if (quickActionStartAssessment) {
        quickActionStartAssessment.addEventListener('click', function () {
            // Redirect to game index (Level 1)
            window.location.href = 'game/index.html';
        });
    }

    // 4. Support Requests - Show support section with contact option
    const quickActionSupportRequests = document.getElementById('quickActionSupportRequests');
    if (quickActionSupportRequests) {
        quickActionSupportRequests.addEventListener('click', function () {
            // Click the nav support button to show support section
            if (navSupport) {
                navSupport.click();
            }

            showToast('Support section opened - View and manage support requests', 'success');
        });
    }
};
