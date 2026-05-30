const db = require('../config/db');

exports.getUsers = async (req, res) => {
    try {
        const [users] = await db.execute(
            "SELECT id, fullname, email, phone, balance, kyc_status, role, created_at FROM users ORDER BY created_at DESC"
        );
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};

exports.getPendingTransactions = async (req, res) => {
    try {
        const [txs] = await db.execute(`
            SELECT t.*, u.fullname, u.email 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.status = 'pending' 
            ORDER BY t.created_at DESC
        `);
        res.status(200).json(txs);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const [txs] = await db.execute(`
            SELECT t.*, u.fullname, u.email 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
            LIMIT 100
        `);
        res.status(200).json(txs);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};

exports.approveTransaction = async (req, res) => {
    try {
        const { transaction_id, action } = req.body;

        const [transactions] = await db.execute(
            "SELECT * FROM transactions WHERE id = ? AND status = 'pending'", [transaction_id]
        );
        if (transactions.length === 0) return res.status(404).json({ message: "Pending transaction not found." });

        const tx = transactions[0];

        if (action === 'approve') {
            await db.execute("UPDATE transactions SET status = 'approved' WHERE id = ?", [transaction_id]);
            if (tx.type === 'deposit') {
                await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]);
            }
            res.status(200).json({ message: "Transaction approved." });
        } else if (action === 'reject') {
            await db.execute("UPDATE transactions SET status = 'rejected' WHERE id = ?", [transaction_id]);
            if (tx.type === 'withdrawal') {
                await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]);
            }
            res.status(200).json({ message: "Transaction rejected." });
        } else {
            res.status(400).json({ message: "Invalid action." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.getPendingKyc = async (req, res) => {
    try {
        const [kycs] = await db.execute(`
            SELECT k.*, u.fullname, u.email 
            FROM kyc k 
            JOIN users u ON k.user_id = u.id 
            WHERE k.status = 'pending' 
            ORDER BY k.submitted_at DESC
        `);
        res.status(200).json(kycs);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};

exports.approveKyc = async (req, res) => {
    try {
        const { kyc_id, action } = req.body; // action: 'approve' or 'reject'
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        const [kycs] = await db.execute("SELECT * FROM kyc WHERE id = ?", [kyc_id]);
        if (kycs.length === 0) return res.status(404).json({ message: "KYC record not found." });

        await db.execute("UPDATE kyc SET status = ? WHERE id = ?", [newStatus, kyc_id]);
        await db.execute("UPDATE users SET kyc_status = ? WHERE id = ?", [newStatus, kycs[0].user_id]);

        res.status(200).json({ message: `KYC ${newStatus}.` });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};

exports.updateUserBalance = async (req, res) => {
    try {
        const { user_id, balance } = req.body;
        await db.execute("UPDATE users SET balance = ? WHERE id = ?", [balance, user_id]);
        res.status(200).json({ message: "Balance updated." });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const [userCount] = await db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
        const [totalDeposits] = await db.execute("SELECT SUM(amount) as sum FROM transactions WHERE type='deposit' AND status='approved'");
        const [totalWithdrawals] = await db.execute("SELECT SUM(amount) as sum FROM transactions WHERE type='withdrawal' AND status='approved'");
        const [activeInvestments] = await db.execute("SELECT COUNT(*) as count FROM investments WHERE status='active'");
        const [pendingDeposits] = await db.execute("SELECT COUNT(*) as count FROM transactions WHERE type='deposit' AND status='pending'");
        const [pendingWithdrawals] = await db.execute("SELECT COUNT(*) as count FROM transactions WHERE type='withdrawal' AND status='pending'");
        const [pendingKyc] = await db.execute("SELECT COUNT(*) as count FROM kyc WHERE status='pending'");

        res.status(200).json({
            users: userCount[0].count,
            deposits: totalDeposits[0].sum || 0,
            withdrawals: totalWithdrawals[0].sum || 0,
            investments: activeInvestments[0].count || 0,
            pendingDeposits: pendingDeposits[0].count || 0,
            pendingWithdrawals: pendingWithdrawals[0].count || 0,
            pendingKyc: pendingKyc[0].count || 0
        });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};
