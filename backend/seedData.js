const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding database with sample data...\n');

// 1. Insert test user
const hashedPassword = bcrypt.hashSync('password123', 10);

db.run(
  `INSERT OR IGNORE INTO users (username, password_hash, email) 
   VALUES (?, ?, ?)`,
  ['testuser', hashedPassword, 'test@example.com'],
  function(err) {
    if (err) {
      console.error('❌ Error inserting user:', err.message);
    } else {
      console.log('✅ Test user created (username: testuser, password: password123)');
    }
  }
);

// 2. Insert sample Zerodha holdings
const zerodhaData = [
  ['HDFC', 211, 735.26, 155359.00, 727.50, 153503.50, -1855.50, -1.20, 'INR'],
  ['ITC', 525, 269.81, 141700.25, 269.40, 141435.00, -265.25, -0.19, 'INR'],
  ['HDFCBANK', 211, 735.26, 155359.00, 727.50, 153503.50, -1855.50, -1.20, 'INR']
];

zerodhaData.forEach((data) => {
  db.run(
    `INSERT OR IGNORE INTO zerodha_holdings 
     (tradingsymbol, quantity, average_cost, cost_basis, current_price, current_value, gain_loss, gain_loss_percent, currency) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data,
    function(err) {
      if (!err) {
        console.log(`✅ Zerodha holding inserted: ${data[0]}`);
      }
    }
  );
});

// 3. Insert sample metal (gold)
db.run(
  `INSERT OR IGNORE INTO metals 
   (metal_type, purity, location, quantity, cost_per_unit, cost_basis, current_price, current_value) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ['gold', '24k', 'physical', 500.0, 7500.00, 7500000.00, 7400.00, 3700000.00],
  function(err) {
    if (!err) {
      console.log('✅ Gold holding inserted: 500g @ 7400/gram');
    }
  }
);

// 4. Insert VDHG
db.run(
  `INSERT OR IGNORE INTO global_assets 
   (asset_type, symbol, name, quantity, cost_per_unit, cost_basis, current_price, current_value, currency) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ['vdhg', 'VDHG.AX', 'Vanguard High Growth ETF', 29.0, 79.69, 2310.00, 77.28, 2241.12, 'AUD'],
  function(err) {
    if (!err) {
      console.log('✅ VDHG holding inserted: 29 units @ $77.28');
    }
  }
);

// 5. Insert debt fund
db.run(
  `INSERT OR IGNORE INTO debt_funds 
   (name, type, invested_amount, interest_rate, currency, status) 
   VALUES (?, ?, ?, ?, ?, ?)`,
  ['HDFC Bank FD', 'fixed_deposit', 500000.00, 6.50, 'INR', 'active'],
  function(err) {
    if (!err) {
      console.log('✅ Debt fund inserted: HDFC FD ₹500k');
    }
  }
);

// 6. Insert retirement account
db.run(
  `INSERT OR IGNORE INTO retirements 
   (account_type, provider, name, current_balance, currency) 
   VALUES (?, ?, ?, ?, ?)`,
  ['super', 'Hesta', 'My Hesta Super', 41303.00, 'AUD'],
  function(err) {
    if (!err) {
      console.log('✅ Retirement account inserted: Hesta Super A$41,303');
    }
  }
);

// Wait for all inserts to complete
setTimeout(() => {
  console.log('\n✨ Sample data inserted successfully!');
  console.log('\n📋 Sample data created:');
  console.log('   ✅ 1 test user');
  console.log('   ✅ 3 Zerodha holdings');
  console.log('   ✅ 1 metal (gold)');
  console.log('   ✅ 1 global asset (VDHG)');
  console.log('   ✅ 1 debt fund');
  console.log('   ✅ 1 retirement account');
  console.log('\n🔐 Test Login:');
  console.log('   Username: testuser');
  console.log('   Password: password123');
  db.close();
}, 1000);