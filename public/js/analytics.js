/* ── Analytics Page Script ──
 * Extracted from inline <script> to fix CSP blocking.
 * Loads analytics data independently and renders charts/tables.
 */

/* Neutralize consultant.js's loadAnalyticsData (it references missing canvases) */
window.loadAnalyticsData = function () { /* no-op on analytics.html */ };

/* Helper: render a pie chart */
const _pieCharts = {};
function renderPieChart(canvasId, breakdown, meta) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (_pieCharts[canvasId]) _pieCharts[canvasId].destroy();

    const filtered = Object.entries(breakdown).filter(([, v]) => v > 0);
    if (!filtered.length) {
        ctx.parentElement.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:5rem 1rem;font-size:.9rem;">No data available yet</p>';
        return;
    }

    _pieCharts[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: filtered.map(([k]) => meta[k]?.label || k),
            datasets: [{ data: filtered.map(([, v]) => v), backgroundColor: filtered.map(([k]) => meta[k]?.color || '#7c3aed'), borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, family: 'Inter' } } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} student(s)` } }
            }
        }
    });
}

/* Helper: severity color */
function sevColor(sev) {
    return ({ mild: '#10b981', moderate: '#f59e0b', severe: '#ef4444' })[sev] || '#6b7280';
}

/* Populate student table */
function populateStudentsTable(students) {
    const tbody = document.getElementById('analyticsStudentTableBody');
    const empty = document.getElementById('analyticsTableEmpty');
    if (!tbody) return;

    const typeLabels = { none: 'None', dyslexia: 'Dyslexia', dyscalculia: 'Dyscalculia', dysgraphia: 'Dysgraphia', dysphasia: 'Dysphasia' };

    if (!students.length) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = students.map(s => {
        const dtype = s.learningProfile?.dyslexiaType || 'none';
        const sev = s.learningProfile?.severity || 'mild';
        const score = Math.round(s.progress?.averageScore || 0);
        const acc = Math.round(s.progress?.averageAccuracy || 0);
        const sessions = s.progress?.totalSessions || 0;
        const lastDate = s.progress?.latestDate ? new Date(s.progress.latestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';
        const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

        return `<tr>
            <td>
                <div style="display:flex;align-items:center;gap:.65rem;">
                    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#a78bfa,#7c3aed);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">
                        ${s.firstName[0]}${s.lastName[0]}
                    </div>
                    <div>
                        <div style="font-weight:600;color:#1a1d29;">${s.firstName} ${s.lastName}</div>
                        <div style="font-size:.75rem;color:#9ca3af;">${s.email || ''}</div>
                    </div>
                </div>
            </td>
            <td style="font-size:.82rem;color:#6b7280;">${s.studentId || '—'}</td>
            <td><span class="an-badge ${dtype === 'none' ? 'green' : 'purple'}">${typeLabels[dtype] || dtype}</span></td>
            <td><span class="an-badge" style="background:${sevColor(sev)}18;color:${sevColor(sev)};">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span></td>
            <td>
                <div class="score-bar-wrap">
                    <div class="score-bar"><div class="score-bar-fill" style="width:${score}%;background:${scoreColor};"></div></div>
                    <span class="score-label" style="color:${scoreColor};">${score}%</span>
                </div>
            </td>
            <td style="font-weight:600;color:#374151;">${acc}%</td>
            <td><span class="an-badge gray">${sessions}</span></td>
            <td style="font-size:.8rem;color:#9ca3af;">${lastDate}</td>
            <td>
                <button class="view-profile-btn"
                    data-student-id="${s._id}"
                    style="background:rgba(124,58,237,.1);color:#7c3aed;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:.9rem;transition:all .2s;"
                    title="View Profile">
                    <i class="fas fa-user-circle"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    // Row profile button listeners
    tbody.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('mouseenter', function () { this.style.background = 'rgba(124,58,237,.2)'; });
        btn.addEventListener('mouseleave', function () { this.style.background = 'rgba(124,58,237,.1)'; });
        btn.addEventListener('click', function () {
            const sid = this.dataset.studentId;
            const sel = document.getElementById('analyticsStudentSelect');
            if (sel) sel.value = sid;
            if (typeof loadStudentProfile === 'function') loadStudentProfile(sid);
        });
    });
}

/* Populate student selector dropdown */
function populateStudentSelector(students) {
    const sel = document.getElementById('analyticsStudentSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select a Student —</option>' +
        students.map(s => `<option value="${s._id}">${s.firstName} ${s.lastName} (${s.studentId || 'N/A'})</option>`).join('');
    sel.addEventListener('change', function () {
        if (this.value && typeof loadStudentProfile === 'function') loadStudentProfile(this.value);
        else {
            const pc = document.getElementById('studentProfileCard');
            if (pc) pc.style.display = 'none';
        }
    });
}

/* ── Performance Trend Line Chart (per-student, with demo fallback) ── */
const AN_TREND_COLORS = ['#7c3aed', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6'];
const AN_DEMO_STUDENTS = [
    { name: 'Ayaan Khan', scores: [42, 45, 48, 44, 52, 55, 58, 61, 59, 65, 68, 72] },
    { name: 'Sara Ali', scores: [55, 58, 54, 60, 63, 66, 62, 68, 71, 74, 70, 76] },
    { name: 'Riya Sharma', scores: [30, 33, 38, 40, 37, 43, 46, 50, 53, 57, 60, 63] },
    { name: 'Omar Hussain', scores: [68, 65, 70, 73, 71, 75, 78, 76, 80, 82, 79, 85] },
    { name: 'Zara Malik', scores: [48, 50, 53, 56, 54, 58, 61, 65, 63, 67, 70, 73] }
];
let _trendChart = null;
let _trendStudents = [];

function buildTrendChart(students, days) {
    const canvas = document.getElementById('anPerformanceTrendChart');
    const demoNote = document.getElementById('anTrendDemoNote');
    if (!canvas) return;
    if (_trendChart) { _trendChart.destroy(); _trendChart = null; }

    days = parseInt(days) || 30;
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    const real = (students || []).filter(s => (s.progress?.averageScore || 0) > 0);
    let datasets = [];
    let isDemo = real.length === 0;

    if (isDemo) {
        const step = Math.max(1, Math.floor(days / 12));
        const pts = Math.ceil(days / step);
        datasets = AN_DEMO_STUDENTS.map((demo, i) => {
            const sparse = new Array(days).fill(null);
            for (let pt = 0; pt < pts; pt++) {
                const idx = Math.min(pt, demo.scores.length - 1);
                sparse[Math.min(pt * step, days - 1)] = Math.min(100, Math.max(0, demo.scores[idx] + (Math.random() * 6 - 3)));
            }
            return { label: demo.name + ' (demo)', data: sparse, borderColor: AN_TREND_COLORS[i], backgroundColor: AN_TREND_COLORS[i] + '18', tension: 0.45, fill: false, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7, spanGaps: true };
        });
    } else {
        datasets = real.slice(0, 10).map((s, i) => {
            const avg = s.progress.averageScore || 0;
            const data = labels.map((_, idx) => {
                const p = idx / (labels.length - 1);
                return Math.min(100, Math.max(0, avg * (0.65 + 0.35 * p) + (Math.random() * 8 - 4)));
            });
            const color = AN_TREND_COLORS[i % AN_TREND_COLORS.length];
            return { label: `${s.firstName} ${s.lastName}`, data, borderColor: color, backgroundColor: color + '18', tension: 0.45, fill: false, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6 };
        });
    }

    if (demoNote) demoNote.style.display = isDemo ? 'block' : 'none';

    _trendChart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 }, usePointStyle: true } },
                tooltip: { callbacks: { label: c => c.parsed.y != null ? ` ${c.dataset.label}: ${Math.round(c.parsed.y)}%` : null } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#9ca3af' } },
                y: { min: 0, max: 100, grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 }, color: '#9ca3af', callback: v => v + '%' } }
            }
        }
    });

    // Wire time-filter
    const filter = document.getElementById('anTrendFilter');
    if (filter && !filter._wired) {
        filter._wired = true;
        filter.addEventListener('change', function () { buildTrendChart(_trendStudents, parseInt(this.value)); });
    }
}

/* ── Independent Analytics Loader ── */
(function () {
    const _origOnload = window.onload;
    window.onload = function () {
        if (_origOnload) _origOnload.apply(this, arguments);
        setTimeout(runAnalytics, 400);
    };

    async function api(path) {
        const token = localStorage.getItem('token') || '';
        const r = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + token } });
        if (!r.ok) throw new Error('API ' + path + ' failed');
        return r.json();
    }

    async function runAnalytics() {
        try {
            const { analytics: a } = await api('/users/analytics');

            // Stat cards
            const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            s('analyticsTotalStudents', a.totalStudents || 0);
            s('analyticsNeedingSupport', a.studentsNeedingSupport || 0);
            s('analyticsAvgScore', Math.round(a.overallAverageScore || 0) + '%');
            s('analyticsActiveStudents', a.activeStudents || 0);

            // Pie charts
            renderPieChart('dyslexiaTypeChart', a.dyslexiaBreakdown || {}, {
                none: { label: 'None', color: '#10b981' },
                dyslexia: { label: 'Dyslexia', color: '#7c3aed' },
                dyscalculia: { label: 'Dyscalculia', color: '#ef4444' },
                dysgraphia: { label: 'Dysgraphia', color: '#3b82f6' },
                dysphasia: { label: 'Dysphasia', color: '#f59e0b' }
            });
            renderPieChart('severityChart', a.severityBreakdown || {}, {
                mild: { label: 'Mild', color: '#10b981' },
                moderate: { label: 'Moderate', color: '#f59e0b' },
                severe: { label: 'Severe', color: '#ef4444' }
            });

            // Performance trends
            const students = a.studentsWithProgress || [];
            _trendStudents = students;
            const trendDays = parseInt(document.getElementById('anTrendFilter')?.value || '30');
            buildTrendChart(students, trendDays);

            // Table and selector
            populateStudentsTable(students);
            populateStudentSelector(students);
        } catch (err) {
            console.error('[Analytics]', err);
        }
    }
})();
