// Support Page JavaScript

// ---- FAQ Accordion ----
document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
        const item = q.closest('.faq-item');
        const wasOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

        // Toggle clicked
        if (!wasOpen) item.classList.add('open');
    });
});

// ---- Load user info into form ----
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const user = data.user;
            document.getElementById('supportName').value = `${user.firstName} ${user.lastName}`;
            document.getElementById('supportEmail').value = user.email || '';
        }
    } catch (e) {
        console.error('Could not load user info:', e);
    }
}
loadUserInfo();

// ---- Support Form Submit ----
const supportForm = document.getElementById('supportForm');
const supportSuccess = document.getElementById('supportSuccess');

supportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitSupportBtn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    // Simulate sending
    await new Promise(r => setTimeout(r, 1200));

    supportForm.style.display = 'none';
    supportSuccess.style.display = 'block';

    btn.innerHTML = origText;
    btn.disabled = false;
});

// ---- New Ticket button ----
document.getElementById('newTicketBtn').addEventListener('click', () => {
    supportSuccess.style.display = 'none';
    supportForm.style.display = 'block';
    supportForm.reset();
    loadUserInfo();
});

// ---- Logout ----
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
});

const headerLogout = document.getElementById('headerLogoutBtn');
if (headerLogout) {
    headerLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });
}
