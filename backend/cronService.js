const cron = require('node-cron');
const db = require('./database');
const PriceService = require('./priceService');

class CronService {
  // Start cron job for daily sync at 8 AM AEST/AEDT
  static startDailySyncJob() {
    console.log('⏰ Starting cron job for daily price sync (Sydney AEST)...');

    // 8 AM Sydney time = 10 PM UTC previous day (AEST)
    // Using 0 22 * * * = 10 PM UTC = 8 AM AEST+2 hours (accounting for daylight)
    // Better: use 0 21 * * * = 9 PM UTC = 7 AM AEST, 8 AM AEDT
    
    const cronTime = '0 21 * * *'; // 9 PM UTC = 7 AM AEST / 8 AM AEDT (Sydney time)

    try {
      cron.schedule(cronTime, async () => {
        const sydneyTime = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
        console.log(`🕐 Cron job triggered at ${sydneyTime} (Sydney time) - Syncing prices...`);
        await CronService.syncPrices();
      });

      console.log('✅ Cron job scheduled for 8 AM Sydney time daily');
      console.log('📍 Current Sydney time:', new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
    } catch (err) {
      console.error('❌ Error scheduling cron job:', err.message);
    }
  }

  // Sync prices - fetch and store in database
  static async syncPrices() {
    console.log('📊 Starting price sync from Sydney...');

    try {
      // Use the same gold-price-per-gram helper as Metal Holdings and the
      // retirement live-gold feature, so all three stay consistent and this
      // doesn't drift into a separate (and previously buggy) conversion path.
      const { pricePerGram: priceInINR } = await PriceService.getGoldPricePerGramINR();

      console.log(`💰 Gold price: ₹${priceInINR.toFixed(2)}/gram`);

      // Save to price_history table
      db.run(
        `INSERT INTO price_history (asset_type, price, currency, source, recorded_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['gold', parseFloat(priceInINR.toFixed(2)), 'INR', 'daily-sync', new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('❌ Error saving price history:', err.message);
          } else {
            console.log(`✅ Price saved to history: ₹${priceInINR.toFixed(2)}/gram at ${new Date().toISOString()}`);
          }
        }
      );

      // Update all gold holdings with new price
      db.run(
        `UPDATE metals SET current_price = ?, last_updated = ? WHERE metal_type = 'gold'`,
        [parseFloat(priceInINR.toFixed(2)), new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('❌ Error updating metals:', err.message);
          } else {
            console.log(`✅ Updated ${this.changes} gold records with new price: ₹${priceInINR.toFixed(2)}/gram`);
          }
        }
      );

      // Fetch and sync VDHG price alongside gold
      const vdhgPrice = await PriceService.getVDHGPrice();

      db.run(
        `INSERT INTO price_history (asset_type, price, currency, source, recorded_at)
         VALUES (?, ?, ?, ?, ?)`,
        ['vdhg', vdhgPrice.price, 'AUD', vdhgPrice.source, new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('❌ Error saving VDHG price history:', err.message);
          } else {
            console.log(`✅ VDHG price saved to history: A$${vdhgPrice.price}`);
          }
        }
      );

      db.run(
        `UPDATE global_assets SET current_price = ?, last_updated = ? WHERE asset_type = 'vdhg'`,
        [vdhgPrice.price, new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('❌ Error updating global assets:', err.message);
          } else {
            console.log(`✅ Updated ${this.changes} VDHG records with new price: A$${vdhgPrice.price}`);
          }
        }
      );

      const sydneyTime = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
      console.log(`✅ Price sync completed at ${sydneyTime} (Sydney time)`);
    } catch (err) {
      console.error('❌ Error during price sync:', err.message);
    }
  }

  // Manually trigger sync (for testing/refresh button)
  static async triggerManualSync(callback) {
    console.log('🔄 Manual price sync triggered from Sydney...');
    await this.syncPrices();
    callback(null, { 
      success: true, 
      message: 'Prices synced successfully',
      timestamp: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
    });
  }
}

module.exports = CronService;