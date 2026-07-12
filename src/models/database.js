const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../../database/nexoryn.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Database connected successfully.');
        initializeTables();
    }
});

function initializeTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'staff'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            major TEXT NOT NULL,
            degree TEXT NOT NULL,
            organization TEXT NOT NULL,
            issue_date TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            status TEXT DEFAULT 'VALID',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            target_id TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
            if (row && row.count === 0) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
            }
        });
    });
}

module.exports = db;