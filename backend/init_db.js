const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const path = require('path');
const schemaPath = path.join(__dirname, '../database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

async function initDB() {
    console.log('Connecting to database...');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        multipleStatements: true
    });
    console.log('Connected! Executing schema...');
    try {
        await conn.query(schema);
        console.log('Database schema successfully created/updated.');
    } catch(e) {
        console.error('Error executing schema:', e);
    } finally {
        await conn.end();
    }
}

initDB();
