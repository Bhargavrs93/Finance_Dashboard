const db = require('./database');

class PortfolioService {
  // Get all zerodha holdings
  static getZerodhaHoldings(callback) {
    db.all(
      'SELECT * FROM zerodha_holdings',
      [],
      (err, rows) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, rows || []);
      }
    );
  }

  // Get all metals
  static getMetals(callback) {
    db.all(
      'SELECT * FROM metals',
      [],
      (err, rows) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, rows || []);
      }
    );
  }

  // Get all global assets
  static getGlobalAssets(callback) {
    db.all(
      'SELECT * FROM global_assets',
      [],
      (err, rows) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, rows || []);
      }
    );
  }

  // Get all debt funds
  static getDebtFunds(callback) {
    db.all(
      'SELECT * FROM debt_funds WHERE status = "active"',
      [],
      (err, rows) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, rows || []);
      }
    );
  }

  // Get all retirement accounts
  static getRetirements(callback) {
    db.all(
      'SELECT * FROM retirements',
      [],
      (err, rows) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, rows || []);
      }
    );
  }

  // Calculate portfolio summary
  static getPortfolioSummary(callback) {
    console.log('🔍 Calculating portfolio summary...');

    const summary = {
      equity: { value: 0, invested: 0, gainLoss: 0, percent: 0, count: 0 },
      metals: { value: 0, invested: 0, gainLoss: 0, percent: 0, count: 0 },
      global: { value: 0, invested: 0, gainLoss: 0, percent: 0, count: 0 },
      debt: { value: 0, invested: 0, gainLoss: 0, percent: 0, count: 0 },
      retirement: { value: 0, invested: 0, gainLoss: 0, percent: 0, count: 0 }
    };

    let completed = 0;
    const total = 5; // Number of categories

    // Get Zerodha holdings
    this.getZerodhaHoldings((err, equities) => {
      if (!err && equities) {
        equities.forEach(equity => {
          summary.equity.value += parseFloat(equity.current_value || 0);
          summary.equity.invested += parseFloat(equity.cost_basis || 0);
          summary.equity.gainLoss += parseFloat(equity.gain_loss || 0);
          summary.equity.count++;
        });
      }
      completed++;
      if (completed === total) calculateTotals();
    });

    // Get metals
    this.getMetals((err, metals) => {
      if (!err && metals) {
        metals.forEach(metal => {
          summary.metals.value += parseFloat(metal.current_value || 0);
          summary.metals.invested += parseFloat(metal.cost_basis || 0);
          summary.metals.gainLoss += parseFloat(metal.gain_loss || 0);
          summary.metals.count++;
        });
      }
      completed++;
      if (completed === total) calculateTotals();
    });

    // Get global assets
    this.getGlobalAssets((err, globals) => {
      if (!err && globals) {
        globals.forEach(asset => {
          summary.global.value += parseFloat(asset.current_value || 0);
          summary.global.invested += parseFloat(asset.cost_basis || 0);
          summary.global.gainLoss += parseFloat(asset.gain_loss || 0);
          summary.global.count++;
        });
      }
      completed++;
      if (completed === total) calculateTotals();
    });

    // Get debt funds
    this.getDebtFunds((err, debts) => {
      if (!err && debts) {
        debts.forEach(debt => {
          summary.debt.value += parseFloat(debt.invested_amount || 0);
          summary.debt.invested += parseFloat(debt.invested_amount || 0);
          summary.debt.count++;
        });
      }
      completed++;
      if (completed === total) calculateTotals();
    });

    // Get retirements
    this.getRetirements((err, retirements) => {
      if (!err && retirements) {
        retirements.forEach(ret => {
          summary.retirement.value += parseFloat(ret.current_balance || 0);
          summary.retirement.invested += parseFloat(ret.cost_basis || 0);
          summary.retirement.gainLoss += parseFloat(ret.gain_loss || 0);
          summary.retirement.count++;
        });
      }
      completed++;
      if (completed === total) calculateTotals();
    });

    const calculateTotals = () => {
      // Calculate total
      let totalValue = 0;
      let totalInvested = 0;
      let totalGainLoss = 0;

      Object.keys(summary).forEach(key => {
        // Calculate percent of each category
        if (summary[key].invested > 0) {
          summary[key].percent = (summary[key].gainLoss / summary[key].invested) * 100;
        }

        totalValue += summary[key].value;
        totalInvested += summary[key].invested;
        totalGainLoss += summary[key].gainLoss;
      });

      // Calculate total percent
      let totalPercent = 0;
      if (totalInvested > 0) {
        totalPercent = (totalGainLoss / totalInvested) * 100;
      }

      // Calculate allocation percentages
      Object.keys(summary).forEach(key => {
        if (totalValue > 0) {
          summary[key].allocation = (summary[key].value / totalValue) * 100;
        } else {
          summary[key].allocation = 0;
        }
      });

      console.log('✅ Portfolio summary calculated');

      callback(null, {
        summary: {
          totalValue: parseFloat(totalValue.toFixed(2)),
          totalInvested: parseFloat(totalInvested.toFixed(2)),
          gainLoss: parseFloat(totalGainLoss.toFixed(2)),
          gainLossPercent: parseFloat(totalPercent.toFixed(2)),
          lastUpdated: new Date().toISOString()
        },
        breakdown: summary
      });
    };
  }
}

module.exports = PortfolioService;