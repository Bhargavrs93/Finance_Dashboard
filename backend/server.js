// Must run before any local module is required - several (e.g. financialGoals
// config, loaded transitively via cronService -> portfolioService) read
// process.env at require-time, so loading dotenv late means those modules
// permanently cache the fallback default instead of the real .env value.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const PriceService = require('./priceService');
const CronService = require('./cronService');

console.log('🔍 Starting server...');

let db;
try {
  db = require('./database');
  console.log('✅ Database module loaded');
} catch (err) {
  console.error('❌ Error loading database:', err.message);
  process.exit(1);
}

const AuthService = require('./authService');
const { verifyToken } = require('./authMiddleware');
const PortfolioService = require('./portfolioService');
const ManualDataService = require('./manualDataService');
const ZerodhaImportService = require('./zerodhaImportService');

// Start cron job for daily sync
CronService.startDailySyncJob();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

console.log('🔧 Middleware configured');

// ============ PUBLIC ROUTES ============

app.get('/', (req, res) => {
  console.log('📍 GET / called');
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  console.log('📍 GET /api/health called');
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/db-health', (req, res) => {
  console.log('📍 GET /api/db-health called');
  console.log('🔍 Checking database...');
  
  if (!db) {
    return res.status(500).json({ status: 'ERROR', message: 'Database not initialized' });
  }
  
  db.get('SELECT 1', (err) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      res.status(500).json({ status: 'ERROR', message: 'Database connection failed: ' + err.message });
    } else {
      console.log('✅ Database query successful');
      res.json({ status: 'OK', message: 'Database connection successful' });
    }
  });
});

// ============ AUTHENTICATION ROUTES ============

app.post('/api/auth/login', (req, res) => {
  console.log('📍 POST /api/auth/login called');
  
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('❌ Missing username or password');
    return res.status(400).json({
      success: false,
      message: 'Username and password are required',
      error: 'BAD_REQUEST'
    });
  }

  console.log(`🔐 Login attempt for user: ${username}`);

  AuthService.loginUser(username, password, (err, result) => {
    if (err) {
      console.error(`❌ Login failed for ${username}:`, err.message);
      return res.status(401).json({
        success: false,
        message: err.message,
        error: 'UNAUTHORIZED'
      });
    }

    console.log(`✅ Login successful for ${username}`);
    res.json(result);
  });
});

app.post('/api/auth/register', (req, res) => {
  console.log('📍 POST /api/auth/register called');
  
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required',
      error: 'BAD_REQUEST'
    });
  }

  console.log(`📝 Register attempt for user: ${username}`);

  AuthService.createUser(username, password, email, (err, result) => {
    if (err) {
      console.error(`❌ Registration failed for ${username}:`, err.message);
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'BAD_REQUEST'
      });
    }

    console.log(`✅ Registration successful for ${username}`);
    res.status(201).json(result);
  });
});

// ============ PROTECTED ROUTES ============

app.get('/api/protected', verifyToken, (req, res) => {
  console.log('📍 GET /api/protected called');
  res.json({
    success: true,
    message: 'This is a protected route',
    user: req.user
  });
});

// ============ PORTFOLIO ROUTES ============

app.get('/api/portfolio', verifyToken, (req, res) => {
  console.log('📍 GET /api/portfolio called');
  console.log('👤 User:', req.user.username);

  PortfolioService.getPortfolioSummary((err, data) => {
    if (err) {
      console.error('❌ Error getting portfolio:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching portfolio',
        error: err.message
      });
    }

    console.log('✅ Portfolio summary retrieved');
    res.json({
      success: true,
      data: data
    });
  });
});

app.get('/api/portfolio/equity', verifyToken, (req, res) => {
  console.log('📍 GET /api/portfolio/equity called');

  PortfolioService.getZerodhaHoldings((err, holdings) => {
    if (err) {
      console.error('❌ Error getting equity:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching equity holdings',
        error: err.message
      });
    }

    const stocks = holdings.filter(h => h.category === 'stock' || !h.category);
    const mutualFunds = holdings.filter(h => h.category === 'mutual_fund');

    const totalValue = holdings.reduce((sum, h) => sum + parseFloat(h.current_value || 0), 0);
    const totalInvested = holdings.reduce((sum, h) => sum + parseFloat(h.cost_basis || 0), 0);
    const gainLoss = totalValue - totalInvested;

    console.log(`✅ Equity retrieved: ${stocks.length} stocks, ${mutualFunds.length} MFs`);
    res.json({
      success: true,
      category: 'equity',
      data: {
        stocks: stocks,
        mutualFunds: mutualFunds,
        summary: {
          totalStocks: stocks.length,
          totalMFs: mutualFunds.length,
          totalValue,
          totalInvested,
          gainLoss,
          gainLossPercent: totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
        }
      }
    });
  });
});

app.post('/api/portfolio/equity/import', verifyToken, (req, res) => {
  console.log('📍 POST /api/portfolio/equity/import called');
  const { file } = req.body;

  if (!file) {
    return res.status(400).json({ success: false, message: 'File is required' });
  }

  ZerodhaImportService.importHoldingsWorkbook(file, (err, result) => {
    if (err) {
      console.error('❌ Error importing holdings:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error importing holdings'
      });
    }

    res.json({
      success: true,
      message: `Imported ${result.stocksImported} stock(s) and ${result.mfImported} mutual fund(s)`,
      ...result
    });
  });
});

app.get('/api/portfolio/metals', verifyToken, (req, res) => {
  console.log('📍 GET /api/portfolio/metals called (with live prices)');

  PriceService.getMetalsWithLivePrices((err, metals) => {
    if (err) {
      console.error('❌ Error getting metals:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching metals',
        error: err.message
      });
    }

    const totalValue = metals.reduce((sum, m) => sum + parseFloat(m.current_value || 0), 0);
    const totalInvested = metals.reduce((sum, m) => sum + parseFloat(m.cost_basis || 0), 0);

    console.log(`✅ Metals retrieved with live prices: ${metals.length} entries`);
    res.json({
      success: true,
      category: 'metals',
      data: {
        holdings: metals,
        summary: {
          totalValue: parseFloat(totalValue.toFixed(2)),
          totalInvested: parseFloat(totalInvested.toFixed(2)),
          gainLoss: parseFloat((totalValue - totalInvested).toFixed(2)),
          priceSource: 'mixed (live + manual)',
          lastUpdated: new Date().toISOString()
        }
      }
    });
  });
});

app.get('/api/portfolio/global', verifyToken, (req, res) => {
  console.log('📍 GET /api/portfolio/global called (with live VDHG price)');

  PriceService.getGlobalAssetsWithLivePrices((err, assets) => {
    if (err) {
      console.error('❌ Error getting global assets:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching global assets',
        error: err.message
      });
    }

    const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.current_value || 0), 0);
    const totalInvested = assets.reduce((sum, a) => sum + parseFloat(a.cost_basis || 0), 0);
    const gainLoss = totalValue - totalInvested;

    console.log(`✅ Global assets retrieved with live prices: ${assets.length} entries`);
    res.json({
      success: true,
      category: 'global',
      data: {
        holdings: assets,
        summary: {
          totalValue,
          totalInvested,
          gainLoss,
          gainLossPercent: totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
        }
      }
    });
  });
});

app.get('/api/portfolio/debt', verifyToken, (req, res) => {
  console.log('📍 GET /api/portfolio/debt called');

  PortfolioService.getDebtFunds((err, debts) => {
    if (err) {
      console.error('❌ Error getting debt funds:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching debt funds',
        error: err.message
      });
    }

    // Currency conversion for the summary total (mixed INR/AUD/USD entries) is
    // handled client-side using the shared currency toggle and live rates from
    // /api/exchange-rates, so the totals stay consistent with Equity/Metals/Global.
    const totalValue = debts.reduce((sum, d) => sum + parseFloat(d.invested_amount || 0), 0);

    console.log(`✅ Debt funds retrieved: ${debts.length} entries`);
    res.json({
      success: true,
      category: 'debt',
      data: {
        holdings: debts,
        summary: {
          totalValue: parseFloat(totalValue.toFixed(2)),
          totalInvested: parseFloat(totalValue.toFixed(2))
        }
      }
    });
  });
});

app.get('/api/exchange-rates', verifyToken, async (req, res) => {
  console.log('📍 GET /api/exchange-rates called');

  try {
    const [audToInr, usdToInr] = await Promise.all([
      PriceService.getAUDToINRRate(),
      PriceService.getExchangeRate()
    ]);

    res.json({
      success: true,
      data: {
        audToInr,
        usdToInr,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('❌ Error fetching exchange rates:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange rates',
      error: err.message
    });
  }
});

app.post('/api/auth/verify-privacy-pin', verifyToken, (req, res) => {
  console.log('📍 POST /api/auth/verify-privacy-pin called');
  const { pin } = req.body;
  const correctPin = process.env.PRIVACY_PIN || '';

  const valid = !!pin && !!correctPin && pin === correctPin;
  res.json({ success: valid, message: valid ? 'PIN verified' : 'Incorrect PIN' });
});

app.get('/api/portfolio/retirement', verifyToken, (req, res) => {
  console.log('📍 GET /api/portfolio/retirement called (with live prices where applicable)');

  PriceService.getRetirementsWithLivePrices((err, retirements) => {
    if (err) {
      console.error('❌ Error getting retirements:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching retirement accounts',
        error: err.message
      });
    }

    const totalValue = retirements.reduce((sum, r) => sum + parseFloat(r.current_balance || 0), 0);
    const totalInvested = retirements.reduce((sum, r) => sum + parseFloat(r.cost_basis || 0), 0);

    console.log(`✅ Retirement accounts retrieved: ${retirements.length} entries`);
    res.json({
      success: true,
      category: 'retirement',
      data: {
        holdings: retirements,
        summary: {
          totalValue: totalValue,
          totalInvested: totalInvested,
          gainLoss: totalValue - totalInvested
        }
      }
    });
  });
});

// ============ PRICE SYNC ROUTES ============

app.post('/api/sync/prices', verifyToken, (req, res) => {
  console.log('📍 POST /api/sync/prices called');

  CronService.triggerManualSync((err, result) => {
    if (err) {
      console.error('❌ Error syncing prices:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error syncing prices',
        error: err.message
      });
    }

    console.log('✅ Prices synced manually');
    res.json({
      success: true,
      message: 'Prices synced successfully',
      timestamp: result.timestamp
    });
  });
});

// ============ MANUAL DATA ROUTES ============

// -------- METALS --------

app.post('/api/manual/metals', verifyToken, (req, res) => {
  console.log('📍 POST /api/manual/metals called');

  ManualDataService.createMetal(req.body, (err, metal) => {
    if (err) {
      console.error('❌ Error creating metal:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error creating metal',
        error: err.message
      });
    }

    console.log('✅ Metal created');
    res.status(201).json({ success: true, data: metal });
  });
});

app.put('/api/manual/metals/:id', verifyToken, (req, res) => {
  console.log('📍 PUT /api/manual/metals/:id called');
  const { id } = req.params;

  ManualDataService.updateMetal(id, req.body, (err, metal) => {
    if (err) {
      console.error('❌ Error updating metal:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating metal',
        error: err.message
      });
    }

    console.log('✅ Metal updated');
    res.json({ success: true, data: metal });
  });
});

app.delete('/api/manual/metals/:id', verifyToken, (req, res) => {
  console.log('📍 DELETE /api/manual/metals/:id called');
  const { id } = req.params;

  ManualDataService.deleteMetal(id, (err, result) => {
    if (err) {
      console.error('❌ Error deleting metal:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error deleting metal',
        error: err.message
      });
    }

    console.log('✅ Metal deleted');
    res.json({ success: true, data: result });
  });
});

// -------- MANUAL MUTUAL FUNDS --------

app.post('/api/manual/mutual-funds', verifyToken, (req, res) => {
  console.log('📍 POST /api/manual/mutual-funds called');

  ManualDataService.createManualMutualFund(req.body, (err, fund) => {
    if (err) {
      console.error('❌ Error creating manual mutual fund:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error creating manual mutual fund',
        error: err.message
      });
    }

    console.log('✅ Manual mutual fund created');
    res.status(201).json({ success: true, data: fund });
  });
});

app.put('/api/manual/mutual-funds/:id', verifyToken, (req, res) => {
  console.log('📍 PUT /api/manual/mutual-funds/:id called');
  const { id } = req.params;

  ManualDataService.updateManualMutualFund(id, req.body, (err, fund) => {
    if (err) {
      console.error('❌ Error updating manual mutual fund:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating manual mutual fund',
        error: err.message
      });
    }

    console.log('✅ Manual mutual fund updated');
    res.json({ success: true, data: fund });
  });
});

app.delete('/api/manual/mutual-funds/:id', verifyToken, (req, res) => {
  console.log('📍 DELETE /api/manual/mutual-funds/:id called');
  const { id } = req.params;

  ManualDataService.deleteManualMutualFund(id, (err, result) => {
    if (err) {
      console.error('❌ Error deleting manual mutual fund:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error deleting manual mutual fund',
        error: err.message
      });
    }

    console.log('✅ Manual mutual fund deleted');
    res.json({ success: true, data: result });
  });
});

// -------- GLOBAL ASSETS --------

app.get('/api/manual/global-assets', verifyToken, (req, res) => {
  console.log('📍 GET /api/manual/global-assets called');

  db.all('SELECT * FROM global_assets', [], (err, assets) => {
    if (err) {
      console.error('❌ Error getting assets:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching assets',
        error: err.message
      });
    }

    console.log(`✅ Retrieved ${assets.length} global assets`);
    res.json({ success: true, data: assets });
  });
});

app.post('/api/manual/global-assets', verifyToken, (req, res) => {
  console.log('📍 POST /api/manual/global-assets called');

  ManualDataService.createGlobalAsset(req.body, (err, asset) => {
    if (err) {
      console.error('❌ Error creating asset:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error creating asset',
        error: err.message
      });
    }

    console.log('✅ Global asset created');
    res.status(201).json({ success: true, data: asset });
  });
});

app.put('/api/manual/global-assets/:id', verifyToken, (req, res) => {
  console.log('📍 PUT /api/manual/global-assets/:id called');
  const { id } = req.params;

  ManualDataService.updateGlobalAsset(id, req.body, (err, asset) => {
    if (err) {
      console.error('❌ Error updating asset:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating asset',
        error: err.message
      });
    }

    console.log('✅ Global asset updated');
    res.json({ success: true, data: asset });
  });
});

app.delete('/api/manual/global-assets/:id', verifyToken, (req, res) => {
  console.log('📍 DELETE /api/manual/global-assets/:id called');
  const { id } = req.params;

  ManualDataService.deleteGlobalAsset(id, (err, result) => {
    if (err) {
      console.error('❌ Error deleting asset:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error deleting asset',
        error: err.message
      });
    }

    console.log('✅ Global asset deleted');
    res.json({ success: true, data: result });
  });
});

// -------- DEBT FUNDS --------

app.get('/api/manual/debt-funds', verifyToken, (req, res) => {
  console.log('📍 GET /api/manual/debt-funds called');

  db.all('SELECT * FROM debt_funds', [], (err, funds) => {
    if (err) {
      console.error('❌ Error getting debt funds:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching debt funds',
        error: err.message
      });
    }

    console.log(`✅ Retrieved ${funds.length} debt funds`);
    res.json({ success: true, data: funds });
  });
});

app.post('/api/manual/debt-funds', verifyToken, (req, res) => {
  console.log('📍 POST /api/manual/debt-funds called');

  ManualDataService.createDebtFund(req.body, (err, fund) => {
    if (err) {
      console.error('❌ Error creating debt fund:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error creating debt fund',
        error: err.message
      });
    }

    console.log('✅ Debt fund created');
    res.status(201).json({ success: true, data: fund });
  });
});

app.put('/api/manual/debt-funds/:id', verifyToken, (req, res) => {
  console.log('📍 PUT /api/manual/debt-funds/:id called');
  const { id } = req.params;

  ManualDataService.updateDebtFund(id, req.body, (err, fund) => {
    if (err) {
      console.error('❌ Error updating debt fund:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating debt fund',
        error: err.message
      });
    }

    console.log('✅ Debt fund updated');
    res.json({ success: true, data: fund });
  });
});

app.delete('/api/manual/debt-funds/:id', verifyToken, (req, res) => {
  console.log('📍 DELETE /api/manual/debt-funds/:id called');
  const { id } = req.params;

  ManualDataService.deleteDebtFund(id, (err, result) => {
    if (err) {
      console.error('❌ Error deleting debt fund:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error deleting debt fund',
        error: err.message
      });
    }

    console.log('✅ Debt fund deleted');
    res.json({ success: true, data: result });
  });
});

// -------- RETIREMENTS --------

app.get('/api/manual/retirements', verifyToken, (req, res) => {
  console.log('📍 GET /api/manual/retirements called');

  db.all('SELECT * FROM retirements', [], (err, retirements) => {
    if (err) {
      console.error('❌ Error getting retirements:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching retirements',
        error: err.message
      });
    }

    console.log(`✅ Retrieved ${retirements.length} retirement accounts`);
    res.json({ success: true, data: retirements });
  });
});

app.post('/api/manual/retirements', verifyToken, (req, res) => {
  console.log('📍 POST /api/manual/retirements called');

  ManualDataService.createRetirement(req.body, (err, retirement) => {
    if (err) {
      console.error('❌ Error creating retirement:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error creating retirement account',
        error: err.message
      });
    }

    console.log('✅ Retirement account created');
    res.status(201).json({ success: true, data: retirement });
  });
});

app.put('/api/manual/retirements/:id', verifyToken, (req, res) => {
  console.log('📍 PUT /api/manual/retirements/:id called');
  const { id } = req.params;

  ManualDataService.updateRetirement(id, req.body, (err, retirement) => {
    if (err) {
      console.error('❌ Error updating retirement:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating retirement account',
        error: err.message
      });
    }

    console.log('✅ Retirement account updated');
    res.json({ success: true, data: retirement });
  });
});

app.delete('/api/manual/retirements/:id', verifyToken, (req, res) => {
  console.log('📍 DELETE /api/manual/retirements/:id called');
  const { id } = req.params;

  ManualDataService.deleteRetirement(id, (err, result) => {
    if (err) {
      console.error('❌ Error deleting retirement:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error deleting retirement account',
        error: err.message
      });
    }

    console.log('✅ Retirement account deleted');
    res.json({ success: true, data: result });
  });
});

// -------- GOALS --------

app.get('/api/manual/goals', verifyToken, (req, res) => {
  console.log('📍 GET /api/manual/goals called');

  ManualDataService.getGoals((err, goals) => {
    if (err) {
      console.error('❌ Error getting goals:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching goals',
        error: err.message
      });
    }

    console.log(`✅ Retrieved ${goals.length} goals`);
    res.json({ success: true, data: goals });
  });
});

app.post('/api/manual/goals', verifyToken, (req, res) => {
  console.log('📍 POST /api/manual/goals called');

  ManualDataService.createGoal(req.body, (err, goal) => {
    if (err) {
      console.error('❌ Error creating goal:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error creating goal',
        error: err.message
      });
    }

    console.log('✅ Goal created');
    res.status(201).json({ success: true, data: goal });
  });
});

app.put('/api/manual/goals/:id', verifyToken, (req, res) => {
  console.log('📍 PUT /api/manual/goals/:id called');
  const { id } = req.params;

  ManualDataService.updateGoal(id, req.body, (err, goal) => {
    if (err) {
      console.error('❌ Error updating goal:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error updating goal',
        error: err.message
      });
    }

    console.log('✅ Goal updated');
    res.json({ success: true, data: goal });
  });
});

app.delete('/api/manual/goals/:id', verifyToken, (req, res) => {
  console.log('📍 DELETE /api/manual/goals/:id called');
  const { id } = req.params;

  ManualDataService.deleteGoal(id, (err, result) => {
    if (err) {
      console.error('❌ Error deleting goal:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error deleting goal',
        error: err.message
      });
    }

    console.log('✅ Goal deleted');
    res.json({ success: true, data: result });
  });
});

// ============ ERROR HANDLING ============

console.log('🛣️  Routes configured');

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Test it: http://localhost:${PORT}`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`✅ Server is stable and waiting for requests...`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});