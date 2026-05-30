const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function insertAdmin() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    try {
        const username = 'admin';
        const password = 'adminpassword123'; // Change this!
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // We use the users table with role 'admin' for main authentication usually
        // But schema.sql also has an 'admins' table. Let's check which one the app uses.
        
        // Checking users table first
        await conn.execute(
            'INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
            ['System Admin', 'admin@broker.com', hashedPassword, 'admin', hashedPassword]
        );
        
        console.log(`Admin user inserted/updated: admin@broker.com / ${password}`);
    } catch(e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}

insertAdmin();
