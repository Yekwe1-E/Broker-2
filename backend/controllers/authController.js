const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { fullname, email, password, phone, referral_code } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({ message: "Please provide all required fields." });
        }

        const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already in use." });
        }

        let referred_by = null;
        if (referral_code) {
            const [referrer] = await db.execute("SELECT id FROM users WHERE referral_code = ?", [referral_code]);
            if (referrer.length > 0) {
                referred_by = referrer[0].id;
            }
        }

        const hashedPassword = await bcrypt.hash(password, 8);
        const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const [result] = await db.execute(
            "INSERT INTO users (fullname, email, password, phone, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)",
            [fullname, email, hashedPassword, phone || null, myReferralCode, referred_by]
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password." });
        }

        const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users[0];
        const passwordIsValid = await bcrypt.compare(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ message: "Invalid Password!" });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });

        res.status(200).json({
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            accessToken: token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};
