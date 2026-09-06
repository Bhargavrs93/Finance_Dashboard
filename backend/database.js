const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, 'database', 'portfolio.db');

// Ensure database folder exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database at:', dbPath);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Migration: add 'source' column to zerodha_holdings if it doesn't exist yet
// (distinguishes Zerodha-imported rows from manually added ones so imports don't wipe manual entries)
db.all('PRAGMA table_info(zerodha_holdings)', [], (err, columns) => {
  if (err) return;
  const hasSource = columns.some(col => col.name === 'source');
  if (!hasSource && columns.length > 0) {
    db.run("ALTER TABLE zerodha_holdings ADD COLUMN source VARCHAR(20) DEFAULT 'zerodha'", (err) => {
      if (!err) console.log('✅ Migrated zerodha_holdings: added source column');
    });
  }
});

// Export database connection
module.exports = db;