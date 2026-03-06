// Settings Page JavaScript
const API_BASE = '';

// ---- API Helper ----
async function apiRequest(path, method = 'GET', body) {
    const token = localStorage.getItem('token');
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

// ---- Toast ----
function showToast(message, type = 'success') {
    const existing = document.querySelector('.settings-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `settings-toast`;
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
        padding: 1rem 1.5rem; border-radius: 14px; font-size: 0.92rem;
        font-weight: 500; display: flex; align-items: center; gap: 0.6rem;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15); animation: settingsToastIn 0.35s ease;
        ${type === 'success'
            ? 'background: linear-gradient(135deg, #22c55e, #16a34a); color: white;'
            : 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;'}
    `;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ---- Tab Switching ----
function initTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const panels = document.querySelectorAll('.settings-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            panels.forEach(p => {
                p.classList.remove('active');
                if (p.id === `panel-${target}`) {
                    p.classList.add('active');
                }
            });
        });
    });
}

// ---- Load Profile ----
async function loadProfile() {
    try {
        const data = await apiRequest('/api/auth/me');
        const user = data.user;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('profileFirstName', user.firstName);
        setVal('profileLastName', user.lastName);
        setVal('profileEmail', user.email);
        setVal('profilePhone', user.consultantPhone);

        // Show consultant ID if available
        const cidEl = document.getElementById('profileConsultantId');
        if (cidEl && user.consultantId) {
            cidEl.value = user.consultantId;
        }
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

// ---- Save Profile ----
async function saveProfile(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const payload = {
            firstName: document.getElementById('profileFirstName').value,
            lastName: document.getElementById('profileLastName').value,
            email: document.getElementById('profileEmail').value,
            consultantPhone: document.getElementById('profilePhone').value
        };
        await apiRequest('/api/settings/profile', 'PUT', payload);
        showToast('Profile updated successfully!');
    } catch (err) {
        showToast(err.message || 'Failed to update profile', 'error');
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

// ---- Delete Account ----
async function deleteAccount() {
    const confirmText = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmText !== 'DELETE') {
        if (confirmText !== null) showToast('Account deletion cancelled.', 'error');
        return;
    }

    try {
        await apiRequest('/api/settings/account', 'DELETE');
        showToast('Account deleted.');
        localStorage.clear();
        setTimeout(() => { window.location.href = '/index.html'; }, 1500);
    } catch (err) {
        showToast(err.message || 'Failed to delete account', 'error');
    }
}

// ---- Change Password ----
async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (newPass !== confirm) {
        showToast('New passwords do not match', 'error');
        return;
    }

    if (newPass.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
    btn.disabled = true;

    try {
        await apiRequest('/api/auth/change-password', 'POST', {
            currentPassword: current,
            newPassword: newPass
        });
        showToast('Password changed successfully!');
        e.target.reset();
        updatePasswordStrength('');
    } catch (err) {
        showToast(err.message || 'Failed to change password', 'error');
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

// ---- Password Strength ----
function updatePasswordStrength(password) {
    const bars = document.querySelectorAll('.password-strength-bar');
    const text = document.getElementById('strengthText');
    if (!bars.length) return;

    bars.forEach(b => b.className = 'password-strength-bar');

    if (!password) {
        if (text) text.textContent = '';
        return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = ['', 'weak', 'medium', 'medium', 'strong'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

    for (let i = 0; i < Math.min(strength, bars.length); i++) {
        bars[i].classList.add(levels[strength]);
    }
    if (text) text.textContent = labels[strength] || '';
}

// ---- Appearance ----
function initAppearance() {
    // Theme picker
    const themeOptions = document.querySelectorAll('.theme-option');
    const savedTheme = localStorage.getItem('neurolex-theme') || 'light';

    // Clear default active state and set the saved theme
    themeOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.theme === savedTheme) opt.classList.add('active');
        opt.addEventListener('click', () => {
            themeOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            localStorage.setItem('neurolex-theme', opt.dataset.theme);
            applyTheme(opt.dataset.theme);
            showToast(`${opt.dataset.theme === 'dark' ? 'Dark' : 'Light'} mode activated`);
        });
    });

    // Apply saved theme immediately
    applyTheme(savedTheme);

    // Font size slider
    const slider = document.getElementById('fontSizeSlider');
    const preview = document.getElementById('fontPreview');
    const savedSize = localStorage.getItem('neurolex-fontsize') || '16';

    if (slider) {
        slider.value = savedSize;
        applyFontSize(savedSize);
        if (preview) {
            preview.style.fontSize = savedSize + 'px';
            preview.textContent = `Preview text at ${savedSize}px`;
        }

        slider.addEventListener('input', () => {
            const size = slider.value;
            if (preview) {
                preview.style.fontSize = size + 'px';
                preview.textContent = `Preview text at ${size}px`;
            }
        });

        slider.addEventListener('change', () => {
            const size = slider.value;
            localStorage.setItem('neurolex-fontsize', size);
            applyFontSize(size);
            showToast(`Font size set to ${size}px`);
        });
    }
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function applyFontSize(size) {
    document.documentElement.style.setProperty('--user-font-size', size + 'px');
}

// ---- Notification Toggles ----
function initNotifications() {
    const toggles = document.querySelectorAll('#panel-notifications .toggle-switch input');
    toggles.forEach(toggle => {
        const key = `neurolex-notif-${toggle.id}`;
        toggle.checked = localStorage.getItem(key) !== 'false';

        toggle.addEventListener('change', () => {
            localStorage.setItem(key, toggle.checked);
            showToast(toggle.checked ? 'Notification enabled' : 'Notification disabled');
        });
    });
}

// ---- Data Export ----
async function exportData(format = 'json') {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/settings/export?format=${format}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Export failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neurolex-data.${format === 'csv' ? 'csv' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast(`Data exported as ${format.toUpperCase()}`);
    } catch (err) {
        showToast(err.message || 'Export failed', 'error');
    }
}

// ---- Export Results (Level 1 & Level 2 Assessment Results) ----
async function exportResults() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/settings/export-results`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Export failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'neurolex-results.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Assessment results exported as CSV');
    } catch (err) {
        showToast(err.message || 'Export failed', 'error');
    }
}

// ---- Clear Cache ----
function clearCache() {
    if (!confirm('This will clear all local preferences (theme, font size, notifications). Continue?')) return;

    const token = localStorage.getItem('token');
    localStorage.clear();
    if (token) localStorage.setItem('token', token);
    showToast('Cache cleared! Reloading...');
    setTimeout(() => location.reload(), 1200);
}

// ---- Logout ----
function settingsLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully');
    setTimeout(() => { window.location.href = '/index.html'; }, 1000);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    initTabs();
    loadProfile();
    initAppearance();
    initNotifications();

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', saveProfile);

    // Delete account
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteAccount);

    // Password form
    const passForm = document.getElementById('passwordForm');
    if (passForm) passForm.addEventListener('submit', changePassword);

    // Password strength
    const newPassInput = document.getElementById('newPassword');
    if (newPassInput) {
        newPassInput.addEventListener('input', () => updatePasswordStrength(newPassInput.value));
    }

    // Export buttons
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => exportData('json'));

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportData('csv'));

    // Download data sheet
    const downloadSheetBtn = document.getElementById('downloadSheetBtn');
    if (downloadSheetBtn) downloadSheetBtn.addEventListener('click', () => exportData('csv'));

    // Download results (Level 1 & Level 2)
    const downloadResultsBtn = document.getElementById('downloadResultsBtn');
    if (downloadResultsBtn) downloadResultsBtn.addEventListener('click', exportResults);

    // Clear cache
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearCache);

    // Logout
    const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');
    if (logoutConfirmBtn) logoutConfirmBtn.addEventListener('click', settingsLogout);

    // Sidebar logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); settingsLogout(); });

    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
    if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', settingsLogout);

    // Data sharing toggle
    const dataSharingToggle = document.getElementById('toggleDataSharing');
    if (dataSharingToggle) {
        dataSharingToggle.checked = localStorage.getItem('neurolex-data-sharing') !== 'false';
        dataSharingToggle.addEventListener('change', () => {
            localStorage.setItem('neurolex-data-sharing', dataSharingToggle.checked);
            showToast(dataSharingToggle.checked ? 'Data sharing enabled' : 'Data sharing disabled');
        });
    }
});

// Toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `
@keyframes settingsToastIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}`;
document.head.appendChild(toastStyle);
