const db = require('../config/db');

const PLANS = {
    'Starter': { minDeposit: 100, roi: 5, durationDays: 7 },
    'Standard': { minDeposit: 500, roi: 12, durationDays: 14 },
    'Premium': { minDeposit: 2000, roi: 25, durationDays: 30 }
};

exports.createInvestment = async (req, res) => {
    try {
        const { plan_name, amount } = req.body;
        const plan = PLANS[plan_name];

        if (!plan) return res.status(400).json({ message: "Invalid plan name" });
        if (amount < plan.minDeposit) return res.status(400).json({ message: `Minimum deposit for this plan is ${plan.minDeposit}` });

        const [users] = await db.execute("SELECT balance FROM users WHERE id = ?", [req.userId]);
        const user = users[0];

        if (user.balance < amount) return res.status(400).json({ message: "Insufficient balance." });

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        // Deduct balance and create investment and transaction
        await db.execute("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, req.userId]);
        await db.execute(
            "INSERT INTO investments (user_id, plan_name, amount, start_date, end_date) VALUES (?, ?, ?, NOW(), ?)",
            [req.userId, plan_name, amount, endDate]
        );
        await db.execute(
            "INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'investment', ?, 'completed')",
            [req.userId, amount]
        );

        res.status(201).json({ message: "Investment started successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.getInvestments = async (req, res) => {
    try {
        const [investments] = await db.execute("SELECT * FROM investments WHERE user_id = ?", [req.userId]);
        res.status(200).json(investments);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
};
