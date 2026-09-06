const db = require('./database');

console.log('🔨 Creating database tables...\n');

// SQL to create all 8 tables
const createTablesSQL = [
  // Table 1: users
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Table 2: zerodha_holdings
  `CREATE TABLE IF NOT EXISTS zerodha_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tradingsymbol VARCHAR(50) UNIQUE NOT NULL,
    instrument_token INTEGER,
    category VARCHAR(20),
    source VARCHAR(20) DEFAULT 'zerodha',
    quantity DECIMAL(10, 2) NOT NULL,
    average_cost DECIMAL(10, 2),
    cost_basis DECIMAL(12, 2),
    current_price DECIMAL(10, 2),
    current_value DECIMAL(12, 2),
    gain_loss DECIMAL(12, 2),
    gain_loss_percent DECIMAL(5, 2),
    currency VARCHAR(3),
    last_updated TIMESTAMP,
    synced_at TIMESTAMP
  )`,

  // Table 3: metals
  `CREATE TABLE IF NOT EXISTS metals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metal_type VARCHAR(20),
    purity VARCHAR(20),
    location VARCHAR(100),
    quantity DECIMAL(10, 2) NOT NULL,
    cost_per_unit DECIMAL(10, 2),
    cost_basis DECIMAL(12, 2),
    purchase_date DATE,
    current_price DECIMAL(10, 2),
    current_value DECIMAL(12, 2),
    gain_loss DECIMAL(12, 2),
    gain_loss_percent DECIMAL(5, 2),
    notes TEXT,
    last_updated TIMESTAMP
  )`,

  // Table 4: global_assets
  `CREATE TABLE IF NOT EXISTS global_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_type VARCHAR(30),
    symbol VARCHAR(20),
    name VARCHAR(100),
    quantity DECIMAL(10, 2) NOT NULL,
    cost_per_unit DECIMAL(10, 2),
    cost_basis DECIMAL(12, 2),
    purchase_date DATE,
    current_price DECIMAL(10, 2),
    current_value DECIMAL(12, 2),
    gain_loss DECIMAL(12, 2),
    gain_loss_percent DECIMAL(5, 2),
    currency VARCHAR(3),
    notes TEXT,
    last_updated TIMESTAMP
  )`,

  // Table 5: debt_funds
  `CREATE TABLE IF NOT EXISTS debt_funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30),
    quantity DECIMAL(10, 2),
    invested_amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2),
    expected_return DECIMAL(12, 2),
    maturity_date DATE,
    currency VARCHAR(3),
    status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )`,

  // Table 6: retirements
  `CREATE TABLE IF NOT EXISTS retirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_type VARCHAR(30) NOT NULL,
    provider VARCHAR(50),
    name VARCHAR(100),
    current_balance DECIMAL(12, 2) NOT NULL,
    cost_basis DECIMAL(12, 2),
    has_live_data BOOLEAN,
    provider_api VARCHAR(100),
    gain_loss DECIMAL(12, 2),
    gain_loss_percent DECIMAL(5, 2),
    currency VARCHAR(3),
    monthly_contribution DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )`,

  // Table 7: price_history
  `CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_type VARCHAR(30),
    symbol VARCHAR(50),
    price DECIMAL(10, 4),
    price_date DATE,
    source VARCHAR(50),
    recorded_at TIMESTAMP
  )`,

  // Table 8: portfolio_snapshots
  `CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date DATE UNIQUE,
    total_value_inr DECIMAL(12, 2),
    total_value_aud DECIMAL(12, 2),
    total_invested DECIMAL(12, 2),
    total_gain_loss DECIMAL(12, 2),
    gain_loss_percent DECIMAL(5, 2),
    equity_value DECIMAL(12, 2),
    metals_value DECIMAL(12, 2),
    global_value DECIMAL(12, 2),
    debt_value DECIMAL(12, 2),
    retirement_value DECIMAL(12, 2),
    exchange_rate DECIMAL(6, 4),
    created_at TIMESTAMP,
    synced_at TIMESTAMP
  )`
];

// Execute each CREATE TABLE statement
let completedCount = 0;

createTablesSQL.forEach((sql, index) => {
  const tableNames = [
    'users',
    'zerodha_holdings',
    'metals',
    'global_assets',
    'debt_funds',
    'retirements',
    'price_history',
    'portfolio_snapshots'
  ];

  db.run(sql, (err) => {
    if (err) {
      console.error(`❌ Error creating ${tableNames[index]} table:`, err.message);
    } else {
      console.log(`✅ Table created/verified: ${tableNames[index]}`);
      completedCount++;

      // All tables created
      if (completedCount === createTablesSQL.length) {
        console.log('\n✅ All 8 tables created successfully!');
        console.log('📊 Tables:');
        console.log('   1. users');
        console.log('   2. zerodha_holdings');
        console.log('   3. metals');
        console.log('   4. global_assets');
        console.log('   5. debt_funds');
        console.log('   6. retirements');
        console.log('   7. price_history');
        console.log('   8. portfolio_snapshots');
        console.log('\n✨ Database is ready!');
        db.close();
      }
    }
  });
});