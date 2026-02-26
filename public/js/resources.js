// Resources Page JavaScript

// ---- Filter Tabs ----
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filterResources();
    });
});

// ---- Search ----
document.getElementById('resourceSearch').addEventListener('input', filterResources);

function filterResources() {
    const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
    const searchQuery = document.getElementById('resourceSearch').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.resource-card');
    let visible = 0;

    cards.forEach(card => {
        const category = card.dataset.category;
        const text = card.textContent.toLowerCase();
        const matchesFilter = activeFilter === 'all' || category === activeFilter;
        const matchesSearch = !searchQuery || text.includes(searchQuery);

        if (matchesFilter && matchesSearch) {
            card.style.display = '';
            visible++;
        } else {
            card.style.display = 'none';
        }
    });

    document.getElementById('resourcesEmpty').style.display = visible === 0 ? 'block' : 'none';
}

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
