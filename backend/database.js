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

// Migration: add 'currency' column to price_history if it doesn't exist yet
// (gold/VDHG price sync inserts a currency value; without this column every
// price_history insert silently failed and history was never recorded)
db.all('PRAGMA table_info(price_history)', [], (err, columns) => {
  if (err) return;
  const hasCurrency = columns.some(col => col.name === 'currency');
  if (!hasCurrency && columns.length > 0) {
    db.run('ALTER TABLE price_history ADD COLUMN currency VARCHAR(3)', (err) => {
      if (!err) console.log('✅ Migrated price_history: added currency column');
    });
  }
});

// Migration: add 'quantity' column to retirements if it doesn't exist yet
// (used for retirement entries that track a physical asset like gold by
// weight, with the balance recomputed live from the current price)
db.all('PRAGMA table_info(retirements)', [], (err, columns) => {
  if (err) return;
  const hasQuantity = columns.some(col => col.name === 'quantity');
  if (!hasQuantity && columns.length > 0) {
    db.run('ALTER TABLE retirements ADD COLUMN quantity DECIMAL(10, 2)', (err) => {
      if (!err) console.log('✅ Migrated retirements: added quantity column');
    });
  }
});

// Export database connection
module.exports = db;