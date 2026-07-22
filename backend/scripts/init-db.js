const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'db', 'resume_analyzer.db');
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(schemaPath, 'utf-8'));
db.close();

console.log(`Database initialized at ${dbPath}`);
