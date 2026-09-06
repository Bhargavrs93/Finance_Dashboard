const db = require('./database');

// Node's native fetch ignores a `timeout` option entirely - it needs an
// AbortSignal to actually enforce a cutoff. Without this, a hung external
// API (metals.live, Perth Mint, etc.) can block a request far longer than
// intended, since there is no real timeout in place.
const fetchWithTimeout = (url, options = {}, timeoutMs = 5000) => {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
};

class PriceService {
  // Get last known gold price from database. price_history stores the final
  // converted INR/gram figure (that's what daily-sync and this fallback both
  // write), so this always returns INR/gram - never a raw USD/oz quote.
  static async getLastKnownGoldPrice() {
    return new Promise((resolve) => {
      console.log('📊 Fetching last known gold price from database...');

      db.get(
        `SELECT price FROM price_history
         WHERE asset_type = 'gold'
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [],
        (err, row) => {
          if (err || !row) {
            console.error('❌ No previous price found in database');
            // Ultimate fallback: ~₹16,104/gram (equivalent to $5300/oz)
            resolve(16104);
          } else {
            console.log(`✅ Last known price: ₹${row.price}/gram`);
            resolve(row.price);
          }
        }
      );
    });
  }

  // Fetch gold price from reliable API (with fallback for Australia)
  static async getGoldPrice() {
    console.log('🌍 Fetching live gold price (metals.live)...');

    try {
      const response = await fetchWithTimeout('https://api.metals.live/v1/spot/gold', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      
      const data = await response.json();
      const priceUSD = data.price;

      console.log(`✅ Gold price fetched from metals.live: $${priceUSD}/oz`);

      return {
        price: priceUSD,
        currency: 'USD',
        unit: 'per ounce',
        source: 'metals.live',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('❌ metals.live failed:', err.message);
      console.log('🔄 Trying alternative API (bullionbypost)...');
      return await this.getGoldPriceAU();
    }
  }

  // Australian gold price API - works better from Sydney
  static async getGoldPriceAU() {
    console.log('🇦🇺 Fetching gold price from Australian source...');

    try {
      const response = await fetchWithTimeout('https://www.perthmint.com.au/api/gold-price', {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Gold price from Perth Mint: A$${data.price}/oz`);
        return {
          price: data.price,
          currency: 'AUD',
          unit: 'per ounce',
          source: 'perth-mint',
          timestamp: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error('❌ Perth Mint API failed:', err.message);
    }

    // Fallback to last known price from database (already INR/gram - not a
    // raw USD/oz quote, so callers must not re-run oz->gram/currency conversion on it)
    console.log('🔄 Using last known price from database...');
    const lastPrice = await this.getLastKnownGoldPrice();

    return {
      price: lastPrice,
      currency: 'INR',
      unit: 'per gram',
      source: 'database-fallback',
      timestamp: new Date().toISOString(),
      isFallback: true
    };
  }

  // Get last known VDHG price from database
  static async getLastKnownVDHGPrice() {
    return new Promise((resolve) => {
      console.log('📊 Fetching last known VDHG price from database...');

      db.get(
        `SELECT price FROM price_history
         WHERE asset_type = 'vdhg'
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [],
        (err, row) => {
          if (err || !row) {
            console.error('❌ No previous VDHG price found in database');
            // Ultimate fallback: A$77.28 (original purchase-era price)
            resolve(77.28);
          } else {
            console.log(`✅ Last known VDHG price: A$${row.price}`);
            resolve(row.price);
          }
        }
      );
    });
  }

  // Fetch live VDHG.AX price from Yahoo Finance
  static async getVDHGPrice() {
    console.log('🌍 Fetching live VDHG price (Yahoo Finance)...');

    try {
      const response = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/VDHG.AX', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;

      if (!price) throw new Error('No price in response');

      console.log(`✅ VDHG price fetched from Yahoo Finance: A$${price}`);

      return {
        price,
        currency: 'AUD',
        source: 'yahoo-finance',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('❌ Yahoo Finance VDHG fetch failed:', err.message);
      console.log('🔄 Using last known VDHG price from database...');

      const lastPrice = await this.getLastKnownVDHGPrice();

      return {
        price: lastPrice,
        currency: 'AUD',
        source: 'database-fallback',
        timestamp: new Date().toISOString(),
        isFallback: true
      };
    }
  }

  // Get global assets (VDHG) with live prices
  static async getGlobalAssetsWithLivePrices(callback) {
    console.log('🌍 Fetching global assets with live prices...');

    try {
      const vdhgPriceData = await this.getVDHGPrice();

      db.all('SELECT * FROM global_assets', [], (err, assets) => {
        if (err) {
          console.error('❌ Database error:', err.message);
          return callback(err, null);
        }

        const updatedAssets = assets.map(asset => {
          if (asset.asset_type === 'vdhg') {
            const livePrice = vdhgPriceData.price;
            const currentValue = asset.quantity * livePrice;
            const gainLoss = currentValue - asset.cost_basis;
            const gainLossPercent = asset.cost_basis > 0
              ? (gainLoss / asset.cost_basis) * 100
              : 0;

            console.log(`📈 VDHG: A$${livePrice}, Value: A$${currentValue.toFixed(2)}`);

            return {
              ...asset,
              current_price: livePrice,
              current_value: parseFloat(currentValue.toFixed(2)),
              gain_loss: parseFloat(gainLoss.toFixed(2)),
              gain_loss_percent: parseFloat(gainLossPercent.toFixed(2)),
              price_source: 'live',
              price_timestamp: vdhgPriceData.timestamp,
              price_source_api: vdhgPriceData.source
            };
          }
          return asset;
        });

        console.log('✅ Global assets with live prices calculated');
        callback(null, updatedAssets);
      });
    } catch (err) {
      console.error('❌ Error in getGlobalAssetsWithLivePrices:', err.message);
      callback(err, null);
    }
  }

  // Get exchange rate (INR/USD)
  static async getExchangeRate() {
    console.log('💱 Fetching exchange rate (INR/USD)...');

    try {
      const response = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/USD', {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      
      const data = await response.json();
      const inrRate = data.rates.INR;

      console.log(`✅ Exchange rate fetched: 1 USD = ₹${inrRate} INR`);
      return inrRate;
    } catch (err) {
      console.error('❌ Exchange rate fetch failed:', err.message);
      console.log('⚠️  Using fallback rate: 1 USD = ₹95.74 INR');
      return 95.74;
    }
  }

  // Get exchange rate (INR/AUD) - used to convert AUD-denominated entries to INR
  static async getAUDToINRRate() {
    console.log('💱 Fetching exchange rate (INR/AUD)...');

    try {
      const response = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/AUD', {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json();
      const inrRate = data.rates.INR;

      console.log(`✅ Exchange rate fetched: 1 AUD = ₹${inrRate} INR`);
      return inrRate;
    } catch (err) {
      console.error('❌ AUD/INR exchange rate fetch failed:', err.message);
      console.log('⚠️  Using fallback rate: 1 AUD = ₹55 INR');
      return 55;
    }
  }

  // Convert gold price from USD/oz to INR/gram
  static convertGoldPrice(priceUSD, exchangeRate) {
    const gramsPerOz = 31.1035;
    const pricePerGram = (priceUSD / gramsPerOz) * exchangeRate;
    return parseFloat(pricePerGram.toFixed(2));
  }

  // Get the current gold price in INR/gram - shared by Metal Holdings and any
  // retirement entries that track physical gold with live pricing
  static async getGoldPricePerGramINR() {
    const goldPriceData = await this.getGoldPrice();

    // The database-fallback path already returns a final INR/gram figure
    // (from price_history) - re-running the oz->gram/currency conversion on
    // it would inflate it roughly 3x, so return it as-is.
    if (goldPriceData.unit === 'per gram' && goldPriceData.currency === 'INR') {
      return {
        pricePerGram: goldPriceData.price,
        source: goldPriceData.source,
        timestamp: goldPriceData.timestamp
      };
    }

    const exchangeRate = await this.getExchangeRate();

    console.log('📊 Exchange rate:', exchangeRate);
    console.log('💱 Gold price source:', goldPriceData.source);

    // If gold price is in AUD, convert to USD first
    let priceUSD = goldPriceData.price;
    if (goldPriceData.currency === 'AUD') {
      try {
        const audUsdResponse = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/AUD');
        const audUsdData = await audUsdResponse.json();
        priceUSD = goldPriceData.price * audUsdData.rates.USD;
        console.log(`💱 Converted A$${goldPriceData.price} to $${priceUSD} USD`);
      } catch (err) {
        console.error('❌ AUD/USD conversion failed:', err.message);
        priceUSD = goldPriceData.price / 1.5;
      }
    }

    return {
      pricePerGram: this.convertGoldPrice(priceUSD, exchangeRate),
      source: goldPriceData.source,
      timestamp: goldPriceData.timestamp
    };
  }

  // Get metals with live prices
  static async getMetalsWithLivePrices(callback) {
    console.log('🪙 Fetching metals with live prices (Sydney)...');

    try {
      const { pricePerGram, source, timestamp } = await this.getGoldPricePerGramINR();

      db.all('SELECT * FROM metals', [], (err, metals) => {
        if (err) {
          console.error('❌ Database error:', err.message);
          return callback(err, null);
        }

        // Process metals with live prices
        const updatedMetals = metals.map(metal => {
          if (metal.metal_type === 'gold') {
            const currentValue = metal.quantity * pricePerGram;
            const gainLoss = currentValue - metal.cost_basis;
            const gainLossPercent = metal.cost_basis > 0
              ? (gainLoss / metal.cost_basis) * 100
              : 0;

            console.log(`📈 Gold (${metal.purity}): ₹${pricePerGram}/gram, Value: ₹${currentValue.toFixed(2)}`);

            return {
              ...metal,
              current_price: pricePerGram,
              current_value: parseFloat(currentValue.toFixed(2)),
              gain_loss: parseFloat(gainLoss.toFixed(2)),
              gain_loss_percent: parseFloat(gainLossPercent.toFixed(2)),
              price_source: 'live',
              price_timestamp: timestamp,
              price_source_api: source
            };
          }
          return metal;
        });

        console.log('✅ Metals with live prices calculated');
        callback(null, updatedMetals);
      });
    } catch (err) {
      console.error('❌ Error in getMetalsWithLivePrices:', err.message);
      callback(err, null);
    }
  }

  // Get retirement accounts with live prices - any entry marked
  // provider_api = 'gold' has its balance recomputed from quantity (grams) x
  // the live gold price, for physical gold tracked as a retirement asset
  static async getRetirementsWithLivePrices(callback) {
    console.log('🏦 Fetching retirements with live prices...');

    db.all('SELECT * FROM retirements', [], async (err, retirements) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return callback(err, null);
      }

      const hasLiveGold = retirements.some(r => r.provider_api === 'gold');
      if (!hasLiveGold) {
        return callback(null, retirements);
      }

      try {
        const { pricePerGram, source, timestamp } = await this.getGoldPricePerGramINR();

        const updated = retirements.map(ret => {
          if (ret.provider_api === 'gold') {
            const currentBalance = parseFloat(ret.quantity || 0) * pricePerGram;

            console.log(`📈 Retirement gold: ₹${pricePerGram}/gram, Value: ₹${currentBalance.toFixed(2)}`);

            return {
              ...ret,
              current_balance: parseFloat(currentBalance.toFixed(2)),
              current_price: pricePerGram,
              price_source: 'live',
              price_timestamp: timestamp,
              price_source_api: source
            };
          }
          return ret;
        });

        console.log('✅ Retirements with live prices calculated');
        callback(null, updated);
      } catch (err) {
        console.error('❌ Error in getRetirementsWithLivePrices:', err.message);
        callback(err, null);
      }
    });
  }

  // Save price history
  static savePriceHistory(metalType, price, priceSource, callback) {
    console.log(`📊 Saving price history for ${metalType}...`);

    db.run(
      `INSERT INTO price_history (asset_type, price, currency, source, recorded_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [metalType, price, 'INR', priceSource, new Date().toISOString()],
      function(err) {
        if (err) {
          return callback(err);
        }

        console.log(`✅ Price history saved`);
        callback(null, { id: this.lastID, price, source: priceSource });
      }
    );
  }
}

module.exports = PriceService;