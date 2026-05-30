const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api'; // Use relative path for production if served from same domain, or update this to your production URL


// =====================================================
// Shared Utilities (used by app.js, admin.js)
// =====================================================

const showAlert = (message, type = 'error') => {
    const el = document.getElementById('global-alert');
    if (!el) { alert(message); return; }
    el.textContent = message;
    el.className = `alert ${type}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 4000);
};

const authFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        // Clear auth and redirect to login on unauthorized
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = 'login.html';
        throw new Error(payload.message || 'Unauthorized');
    }

    if (!response.ok) {
        // Surface server errors to the caller so UI can show alerts
        throw new Error(payload.message || `Request failed with status ${response.status}`);
    }

    return payload;
};

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Global logout
window.logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = 'login.html';
};

// =====================================================
// Page Router — initialise the correct page on load
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body.id;

    // Landing page mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }

    // Registration form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(registerForm));
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    window.location.href = 'login.html?registered=true';
                } else {
                    showAlert(result.message || 'Registration failed');
                }
            } catch (err) {
                showAlert('Network error — is the server running?');
            }
        });
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Show success banner if redirected from register
        if (window.location.search.includes('registered=true')) {
            showAlert('Account created! Please log in.', 'success');
        }
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(loginForm));
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', result.accessToken);
                    localStorage.setItem('userRole', result.role);
                    window.location.href = result.role === 'admin' ? 'admin.html' : 'dashboard.html';
                } else {
                    showAlert(result.message || 'Invalid credentials');
                }
            } catch (err) {
                showAlert('Network error — is the server running?');
            }
        });
    }

    // User dashboard
    if (body === 'dashboard-app') {
        guardAuth('user');
        initDashboard();
    }

    // Admin panel — admin.js handles everything; we just guard access here
    if (body === 'admin-app') {
        guardAuth('admin');
        // admin.js DOMContentLoaded fires separately and handles all admin logic
    }
});

// =====================================================
// Auth Guard — redirect if wrong role or no token
// =====================================================
function guardAuth(requiredRole) {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('userRole');
    if (!token) { window.location.href = 'login.html'; return; }
    if (requiredRole === 'admin' && role !== 'admin') { window.location.href = 'dashboard.html'; }
    if (requiredRole === 'user'  && role === 'admin')  { window.location.href = 'admin.html'; }
}

// =====================================================
// User Dashboard
// =====================================================
async function initDashboard() {
    // Sidebar navigation
    const links    = document.querySelectorAll('.sidebar-link[data-target]');
    const sections = document.querySelectorAll('.view-section');

    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.target).classList.add('active');
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Mobile hamburger
    const hamb = document.getElementById('dash-hamburger');
    if (hamb) hamb.addEventListener('click', () =>
        document.getElementById('sidebar').classList.toggle('open'));

    await loadDashboardData();
    setupDashboardActions();
}

async function loadDashboardData() {
    try {
        const data = await authFetch('/user/dashboard');
        const { user, investments, transactions, referrals } = data;

        document.getElementById('ui-user-name').textContent = user.fullname;
        document.getElementById('dash-balance').textContent = formatCurrency(user.balance);

        const activeTotal = investments
            .filter(i => i.status === 'active')
            .reduce((acc, i) => acc + parseFloat(i.amount), 0);
        document.getElementById('dash-active-investments').textContent = formatCurrency(activeTotal);

        const refTotal = referrals.reduce((acc, r) => acc + parseFloat(r.bonus), 0);
        document.getElementById('dash-referral-earnings').textContent = formatCurrency(refTotal);

        const refCodeEl = document.getElementById('ref-code-display');
        if (refCodeEl) refCodeEl.value = user.referral_code;

        renderTransactions(transactions);
        renderInvestments(investments);
    } catch (e) {
        console.error('Failed to load dashboard data:', e);
    }
}

function renderTransactions(txs) {
    const tbody = document.getElementById('tx-table-body');
    if (!tbody) return;
    tbody.innerHTML = !txs.length
        ? '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#94a3b8;">No transactions yet</td></tr>'
        : txs.map(tx => `
            <tr>
                <td>${formatDate(tx.created_at)}</td>
                <td style="text-transform:capitalize;">${tx.type}</td>
                <td>${formatCurrency(tx.amount)}</td>
                <td><span class="status ${tx.status}">${tx.status}</span></td>
            </tr>`).join('');
}

function renderInvestments(invs) {
    const tbody = document.getElementById('inv-table-body');
    if (!tbody) return;
    tbody.innerHTML = !invs.length
        ? '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#94a3b8;">No active investments</td></tr>'
        : invs.map(inv => `
            <tr>
                <td>${inv.plan_name}</td>
                <td>${formatCurrency(inv.amount)}</td>
                <td>${formatDate(inv.start_date)}</td>
                <td>${formatDate(inv.end_date)}</td>
                <td><span class="status ${inv.status}">${inv.status}</span></td>
            </tr>`).join('');
}

function setupDashboardActions() {
    // Deposit
    const depForm = document.getElementById('deposit-form');
    if (depForm) depForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('deposit-amount').value;
        const res = await authFetch('/transaction/deposit', { method: 'POST', body: JSON.stringify({ amount }) });
        showAlert(res.message, res.message.includes('submitted') ? 'success' : 'error');
        if (res.message.includes('submitted')) setTimeout(() => location.reload(), 1500);
    });

    // Withdraw
    const wdForm = document.getElementById('withdraw-form');
    if (wdForm) wdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('withdraw-amount').value;
        const res = await authFetch('/transaction/withdraw', { method: 'POST', body: JSON.stringify({ amount }) });
        showAlert(res.message, res.message.includes('submitted') ? 'success' : 'error');
        if (res.message.includes('submitted')) setTimeout(() => location.reload(), 1500);
    });

    // Invest
    document.querySelectorAll('.invest-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.plan-card');
            const plan_name = card.dataset.plan;
            const amountStr = "2000"; //prompt(`Enter amount to invest in ${plan_name} plan:`);
            if (!amountStr) return;
            const amount = parseFloat(amountStr);
            const res = await authFetch('/investment/invest', { method: 'POST', body: JSON.stringify({ plan_name, amount }) });
            showAlert(res.message, res.message.includes('successfully') ? 'success' : 'error');
            if (res.message.includes('successfully')) setTimeout(() => location.reload(), 1500);
        });
    });

    // AI Chat
    const chatBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    if (chatBtn && chatInput) {
        const sendMsg = async () => {
            const msg = chatInput.value.trim();
            if (!msg) return;
            appendChatMessage('user', msg);
            chatInput.value = '';
            try {
                const res = await authFetch('/ai-chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
                appendChatMessage('bot', res.reply);
            } catch (e) {
                appendChatMessage('bot', 'AI Advisor is temporarily offline.');
            }
        };
        chatBtn.addEventListener('click', sendMsg);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });
    }
}

function appendChatMessage(sender, text) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}
