// =========================================
// Admin-specific JS — loaded only on admin.html
// =========================================

const PAGE_TITLES = {
    'view-overview':    'Overview',
    'view-deposits':    'Deposit Approvals',
    'view-withdrawals': 'Withdrawal Approvals',
    'view-kyc':         'KYC Verification',
    'view-users':       'User Management',
    'view-all-tx':      'All Transactions'
};

let allPendingTxs = [];
let currentEditUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link[data-target]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            const target = link.dataset.target;
            document.getElementById(target).classList.add('active');
            document.getElementById('page-title').textContent = PAGE_TITLES[target] || 'Admin';

            // Load section data on switch
            if (target === 'view-deposits')    loadPendingTransactions('deposit');
            if (target === 'view-withdrawals') loadPendingTransactions('withdrawal');
            if (target === 'view-kyc')         loadPendingKyc();
            if (target === 'view-users')       loadUsers();
            if (target === 'view-all-tx')      loadAllTransactions();

            // Mobile close
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Mobile hamburger
    const hamb = document.getElementById('dash-hamburger');
    if (hamb) hamb.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Load analytics for overview
    await loadAnalytics();
});

// ---- Analytics ----
async function loadAnalytics() {
    try {
        const data = await authFetch('/admin/analytics');
        document.getElementById('admin-stat-users').textContent      = data.users;
        document.getElementById('admin-stat-deposits').textContent   = formatCurrency(data.deposits);
        document.getElementById('admin-stat-withdrawals').textContent= formatCurrency(data.withdrawals);
        document.getElementById('admin-stat-investments').textContent = data.investments;
        document.getElementById('admin-pending-dep').textContent     = data.pendingDeposits;
        document.getElementById('admin-pending-wd').textContent      = data.pendingWithdrawals;
        document.getElementById('admin-pending-kyc').textContent     = data.pendingKyc;

        // Update sidebar badges
        document.getElementById('badge-deposits').textContent    = data.pendingDeposits;
        document.getElementById('badge-withdrawals').textContent = data.pendingWithdrawals;
        document.getElementById('badge-kyc').textContent        = data.pendingKyc;
    } catch(e) {
        console.error('Analytics error', e);
        showAlert(e.message || 'Error loading analytics.');
    }
}

// ---- Pending Transactions (deposit / withdrawal) ----
window.loadPendingTransactions = async (type) => {
    const bodyId = type === 'deposit' ? 'deposits-table-body' : 'withdrawals-table-body';
    const tbody = document.getElementById(bodyId);
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">Loading…</td></tr>`;

    try {
        const txs = await authFetch('/admin/transactions/pending');
        const filtered = txs.filter(t => t.type === type);

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No pending ${type}s ✅</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(tx => `
            <tr id="tx-row-${tx.id}">
                <td>#${tx.id}</td>
                <td>${escHtml(tx.fullname)}</td>
                <td>${escHtml(tx.email)}</td>
                <td><strong>${formatCurrency(tx.amount)}</strong></td>
                <td>${formatDate(tx.created_at)}</td>
                <td>
                    <button class="action-btn approve-btn" onclick="handleTransaction(${tx.id},'approve','${type}')">✔ Approve</button>
                    <button class="action-btn reject-btn"  onclick="handleTransaction(${tx.id},'reject','${type}')">✘ Reject</button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error loading data.</td></tr>`;
        showAlert(e.message || 'Error loading pending transactions.');
    }
};

window.handleTransaction = async (txId, action, type) => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    if (!confirm(`${label} transaction #${txId}?`)) return;

    try {
        const res = await authFetch('/admin/approve', {
            method: 'POST',
            body: JSON.stringify({ transaction_id: txId, action })
        });
        showAlert(res.message, 'success');
        // Remove row and reload analytics
        const row = document.getElementById(`tx-row-${txId}`);
        if (row) row.remove();
        await loadAnalytics();
    } catch(e) {
        showAlert(e.message || 'Error processing action.');
    }
};

// ---- KYC ----
window.loadPendingKyc = async () => {
    const tbody = document.getElementById('kyc-table-body');
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">Loading…</td></tr>`;

    try {
        const kycs = await authFetch('/admin/kyc/pending');

        if (!kycs.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No pending KYC submissions ✅</td></tr>`;
            return;
        }

        tbody.innerHTML = kycs.map(k => `
            <tr id="kyc-row-${k.id}">
                <td>#${k.id}</td>
                <td>${escHtml(k.fullname)}</td>
                <td>${escHtml(k.email)}</td>
                <td>${escHtml(k.document_type)}</td>
                <td>${formatDate(k.submitted_at)}</td>
                <td>
                    <button class="action-btn approve-btn" onclick="handleKyc(${k.id},'approve')">✔ Approve</button>
                    <button class="action-btn reject-btn"  onclick="handleKyc(${k.id},'reject')">✘ Reject</button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error loading data.</td></tr>`;
        showAlert(e.message || 'Error loading KYC queue.');
    }
};

window.handleKyc = async (kycId, action) => {
    if (!confirm(`${action === 'approve' ? 'Approve' : 'Reject'} KYC #${kycId}?`)) return;
    try {
        const res = await authFetch('/admin/kyc/approve', {
            method: 'POST',
            body: JSON.stringify({ kyc_id: kycId, action })
        });
        showAlert(res.message, 'success');
        const row = document.getElementById(`kyc-row-${kycId}`);
        if (row) row.remove();
        await loadAnalytics();
    } catch(e) {
        showAlert(e.message || 'Error processing KYC action.');
    }
};

// ---- User Management ----
window.loadUsers = async () => {
    const tbody = document.getElementById('admin-users-table');
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">Loading…</td></tr>`;

    try {
        const users = await authFetch('/admin/users');

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${escHtml(u.fullname)}</td>
                <td>${escHtml(u.email)}</td>
                <td>${formatCurrency(u.balance)}</td>
                <td><span class="status ${u.kyc_status}">${u.kyc_status}</span></td>
                <td><span class="status ${u.role === 'admin' ? 'active' : 'completed'}">${u.role}</span></td>
                <td>${formatDate(u.created_at)}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="openBalanceModal(${u.id}, '${escHtml(u.fullname)}', ${u.balance})">✏️ Balance</button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" class="no-data">Error loading users.</td></tr>`;
        showAlert(e.message || 'Error loading users.');
    }
};

// ---- Balance Edit Modal ----
window.openBalanceModal = (userId, name, currentBalance) => {
    currentEditUserId = userId;
    document.getElementById('modal-user-name').value    = name;
    document.getElementById('modal-new-balance').value  = currentBalance;
    document.getElementById('balance-modal').classList.add('open');
};

window.closeModal = (id) => {
    document.getElementById(id).classList.remove('open');
};

document.getElementById('modal-save-btn').addEventListener('click', async () => {
    const newBalance = parseFloat(document.getElementById('modal-new-balance').value);
    if (isNaN(newBalance) || newBalance < 0) { showAlert('Enter a valid balance.'); return; }

    try {
        const res = await authFetch('/admin/users/balance', {
            method: 'POST',
            body: JSON.stringify({ user_id: currentEditUserId, balance: newBalance })
        });
        showAlert(res.message, 'success');
        closeModal('balance-modal');
        loadUsers();
    } catch(e) {
        showAlert(e.message || 'Error updating balance.');
    }
});

// ---- All Transactions ----
window.loadAllTransactions = async () => {
    const tbody = document.getElementById('all-tx-table-body');
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">Loading…</td></tr>`;

    try {
        const txs = await authFetch('/admin/transactions/all');

        if (!txs.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No transactions yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = txs.map(tx => `
            <tr>
                <td>#${tx.id}</td>
                <td>${escHtml(tx.fullname)}</td>
                <td style="text-transform:capitalize;">${tx.type}</td>
                <td>${formatCurrency(tx.amount)}</td>
                <td><span class="status ${tx.status}">${tx.status}</span></td>
                <td>${formatDate(tx.created_at)}</td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error loading transactions.</td></tr>`;
        showAlert(e.message || 'Error loading transactions.');
    }
};

// ---- Utility ----
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

