const db = require('../config/db');

exports.deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Invalid amount." });

        // Create a pending deposit transaction. An admin or a webhook would approve this.
        await db.execute(
            "INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'deposit', ?, 'pending')",
            [req.userId, amount]
        );

        res.status(201).json({ message: "Deposit request submitted. Waiting for approval." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.withdraw = async (req, res) => {
    try {
        const { amount } = req.body;
        if (amount <= 0) return res.status(400).json({ message: "Invalid amount." });

        const [users] = await db.execute("SELECT balance FROM users WHERE id = ?", [req.userId]);
        if (users[0].balance < amount) {
            return res.status(400).json({ message: "Insufficient balance for withdrawal." });
        }

        // Deduct from balance immediately to lock funds and create pending transaction
        await db.execute("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, req.userId]);
        await db.execute(
            "INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'withdrawal', ?, 'pending')",
            [req.userId, amount]
        );

        res.status(201).json({ message: "Withdrawal request submitted." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};
