const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const [users] = await db.execute("SELECT id, fullname, email, balance, referral_code, kyc_status FROM users WHERE id = ?", [req.userId]);
        if (users.length === 0) return res.status(404).json({ message: "User not found." });

        const user = users[0];

        const [investments] = await db.execute("SELECT * FROM investments WHERE user_id = ? ORDER BY start_date DESC", [req.userId]);
        const [transactions] = await db.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [req.userId]);
        const [referrals] = await db.execute(`
            SELECT r.bonus, u.fullname, r.created_at 
            FROM referrals r 
            JOIN users u ON r.referred_user_id = u.id 
            WHERE r.referrer_id = ?`, 
        [req.userId]);

        res.status(200).json({
            user,
            investments,
            transactions,
            referrals
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.submitKyc = async (req, res) => {
    try {
        const { document_type, document_file } = req.body;
        // Mock file upload processing, assume document_file is a base64 or url
        await db.execute("INSERT INTO kyc (user_id, document_type, document_file) VALUES (?, ?, ?)", [req.userId, document_type, document_file]);
        await db.execute("UPDATE users SET kyc_status = 'pending' WHERE id = ?", [req.userId]);
        
        res.status(200).json({ message: "KYC submitted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
}
