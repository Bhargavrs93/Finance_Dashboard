const db = require('./database');
const PriceService = require('./priceService');
const { ANNUAL_EXPENSES, ANNUAL_EXPENSES_CURRENCY, FI_MULTIPLE } = require('./config/financialGoals');

class PortfolioService {
  // Get all zerodha holdings
  static getZerodhaHoldings(callback) {
    db.all(
      `SELECT * FROM zerodha_holdings
       ORDER BY CASE WHEN source = 'manual' THEN 1 ELSE 0 END, id`,
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

    // Liquid categories' INR-normalized value broken down by original
    // currency, used for the geographic exposure chart (currency as a proxy
    // for geography, since that's what's actually tracked per holding)
    const byCurrency = { INR: 0, AUD: 0, USD: 0 };

    // Global, debt, and retirement entries can be denominated in AUD/USD.
    // Everything is normalized to INR here (using live rates) before being
    // summed, so the grand total isn't silently mixing currencies.
    Promise.all([
      PriceService.getAUDToINRRate(),
      PriceService.getExchangeRate() // USD -> INR
    ]).then(([audRate, usdRate]) => {
      const toINR = (amount, currency) => {
        const amt = parseFloat(amount || 0);
        if (currency === 'AUD') return amt * audRate;
        if (currency === 'USD') return amt * usdRate;
        return amt; // INR, or no currency recorded (assume INR)
      };

      const trackCurrency = (amount, currency) => {
        const key = ['INR', 'AUD', 'USD'].includes(currency) ? currency : 'INR';
        byCurrency[key] += toINR(amount, currency);
      };

      let completed = 0;
      const total = 5; // Number of categories

      // Get Zerodha holdings (always INR)
      this.getZerodhaHoldings((err, equities) => {
        if (!err && equities) {
          equities.forEach(equity => {
            summary.equity.value += parseFloat(equity.current_value || 0);
            summary.equity.invested += parseFloat(equity.cost_basis || 0);
            summary.equity.gainLoss += parseFloat(equity.gain_loss || 0);
            summary.equity.count++;
            trackCurrency(equity.current_value, 'INR');
          });
        }
        completed++;
        if (completed === total) calculateTotals(audRate);
      });

      // Get metals with live gold price (always INR) - matches the Metal
      // Holdings page, instead of a possibly-stale stored current_value
      PriceService.getMetalsWithLivePrices((err, metals) => {
        if (!err && metals) {
          metals.forEach(metal => {
            summary.metals.value += parseFloat(metal.current_value || 0);
            summary.metals.invested += parseFloat(metal.cost_basis || 0);
            summary.metals.gainLoss += parseFloat(metal.gain_loss || 0);
            summary.metals.count++;
            trackCurrency(metal.current_value, 'INR');
          });
        }
        completed++;
        if (completed === total) calculateTotals(audRate);
      });

      // Get global assets with live VDHG price (always AUD - normalize to
      // INR), matching the Global Assets page instead of a stale stored value
      PriceService.getGlobalAssetsWithLivePrices((err, globals) => {
        if (!err && globals) {
          globals.forEach(asset => {
            summary.global.value += toINR(asset.current_value, asset.currency);
            summary.global.invested += toINR(asset.cost_basis, asset.currency);
            summary.global.gainLoss += toINR(asset.gain_loss, asset.currency);
            summary.global.count++;
            trackCurrency(asset.current_value, asset.currency);
          });
        }
        completed++;
        if (completed === total) calculateTotals(audRate);
      });

      // Get debt funds (currency varies per entry - normalize to INR)
      this.getDebtFunds((err, debts) => {
        if (!err && debts) {
          debts.forEach(debt => {
            const investedINR = toINR(debt.invested_amount, debt.currency);
            summary.debt.value += investedINR;
            summary.debt.invested += investedINR;
            summary.debt.count++;
            trackCurrency(debt.invested_amount, debt.currency);
          });
        }
        completed++;
        if (completed === total) calculateTotals(audRate);
      });

      // Get retirements with live prices where applicable (e.g. physical gold
      // tracked as a retirement asset) - currency varies per entry, normalize to INR.
      // Retirement is illiquid/locked, so it's excluded from byCurrency (liquid-only).
      PriceService.getRetirementsWithLivePrices((err, retirements) => {
        if (!err && retirements) {
          retirements.forEach(ret => {
            summary.retirement.value += toINR(ret.current_balance, ret.currency);
            summary.retirement.invested += toINR(ret.cost_basis, ret.currency);
            summary.retirement.gainLoss += toINR(ret.gain_loss, ret.currency);
            summary.retirement.count++;
          });
        }
        completed++;
        if (completed === total) calculateTotals(audRate);
      });
    }).catch(err => {
      console.error('❌ Error fetching exchange rates for portfolio summary:', err.message);
      callback(err, null);
    });

    const calculateTotals = (audRate) => {
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

      // --- Financial Independence metrics ---
      // Liquid = Equity + Metals + Global + Debt. Illiquid & locked = Retirement
      // (which already includes any physical-gold entries tracked there).
      const liquidValue = summary.equity.value + summary.metals.value + summary.global.value + summary.debt.value;
      const liquidInvested = summary.equity.invested + summary.metals.invested + summary.global.invested + summary.debt.invested;
      const liquidGainLoss = summary.equity.gainLoss + summary.metals.gainLoss + summary.global.gainLoss + summary.debt.gainLoss;
      const illiquidLocked = summary.retirement.value;
      const semiLiquid = 0; // no property tracked yet
      const totalNetWorth = liquidValue + illiquidLocked + semiLiquid;

      const fiTarget = FI_MULTIPLE * ANNUAL_EXPENSES * (ANNUAL_EXPENSES_CURRENCY === 'AUD' ? audRate : 1);
      const fiProgress = fiTarget > 0 ? (liquidValue / fiTarget) * 100 : 0;
      const returnPercent = liquidInvested > 0 ? (liquidGainLoss / liquidInvested) * 100 : 0;

      const assetAllocation = ['equity', 'metals', 'global', 'debt']
        .map(key => ({
          category: key,
          value: parseFloat(summary[key].value.toFixed(2)),
          percent: liquidValue > 0 ? parseFloat(((summary[key].value / liquidValue) * 100).toFixed(2)) : 0
        }))
        .filter(item => item.value > 0);

      const geographicExposure = Object.keys(byCurrency)
        .map(cur => ({
          currency: cur,
          value: parseFloat(byCurrency[cur].toFixed(2)),
          percent: liquidValue > 0 ? parseFloat(((byCurrency[cur] / liquidValue) * 100).toFixed(2)) : 0
        }))
        .filter(item => item.value > 0);

      console.log('✅ Portfolio summary calculated');

      callback(null, {
        summary: {
          totalValue: parseFloat(totalValue.toFixed(2)),
          totalInvested: parseFloat(totalInvested.toFixed(2)),
          gainLoss: parseFloat(totalGainLoss.toFixed(2)),
          gainLossPercent: parseFloat(totalPercent.toFixed(2)),
          lastUpdated: new Date().toISOString()
        },
        breakdown: summary,
        fi: {
          investableAssets: parseFloat(liquidValue.toFixed(2)),
          fiTarget: parseFloat(fiTarget.toFixed(2)),
          progress: parseFloat(fiProgress.toFixed(2)),
          returnPercent: parseFloat(returnPercent.toFixed(2)),
          illiquidLocked: parseFloat(illiquidLocked.toFixed(2)),
          semiLiquid: parseFloat(semiLiquid.toFixed(2)),
          totalNetWorth: parseFloat(totalNetWorth.toFixed(2)),
          assetAllocation,
          geographicExposure
        }
      });
    };
  }
}

module.exports = PortfolioService;