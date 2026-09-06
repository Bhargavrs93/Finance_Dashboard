const db = require('./database');

class PriceService {
  // Get last known gold price from database
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
            // Ultimate fallback: $5300/oz
            resolve(5300);
          } else {
            console.log(`✅ Last known price: ₹${row.price}/gram`);
            // Convert back to USD/oz if needed
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
      const response = await fetch('https://api.metals.live/v1/spot/gold', {
        timeout: 5000,
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
      const response = await fetch('https://www.perthmint.com.au/api/gold-price', {
        timeout: 5000,
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

    // Fallback to last known price from database
    console.log('🔄 Using last known price from database...');
    const lastPrice = await this.getLastKnownGoldPrice();
    
    return {
      price: lastPrice,
      currency: 'USD',
      unit: 'per ounce',
      source: 'database-fallback',
      timestamp: new Date().toISOString(),
      isFallback: true
    };
  }

  // Get exchange rate (INR/USD)
  static async getExchangeRate() {
    console.log('💱 Fetching exchange rate (INR/USD)...');

    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 5000,
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

  // Convert gold price from USD/oz to INR/gram
  static convertGoldPrice(priceUSD, exchangeRate) {
    const gramsPerOz = 31.1035;
    const pricePerGram = (priceUSD / gramsPerOz) * exchangeRate;
    return parseFloat(pricePerGram.toFixed(2));
  }

  // Get metals with live prices
  static async getMetalsWithLivePrices(callback) {
    console.log('🪙 Fetching metals with live prices (Sydney)...');

    try {
      // Fetch all data first
      const goldPriceData = await this.getGoldPrice();
      let exchangeRate = await this.getExchangeRate();

      console.log('📊 Exchange rate:', exchangeRate);
      console.log('💱 Gold price source:', goldPriceData.source);

      // If gold price is in AUD, convert to USD first
      let priceUSD = goldPriceData.price;
      if (goldPriceData.currency === 'AUD') {
        try {
          const audUsdResponse = await fetch('https://api.exchangerate-api.com/v4/latest/AUD');
          const audUsdData = await audUsdResponse.json();
          priceUSD = goldPriceData.price * audUsdData.rates.USD;
          console.log(`💱 Converted A$${goldPriceData.price} to $${priceUSD} USD`);
        } catch (err) {
          console.error('❌ AUD/USD conversion failed:', err.message);
          priceUSD = goldPriceData.price / 1.5;
        }
      }

      // Now query database
      db.all('SELECT * FROM metals', [], (err, metals) => {
        if (err) {
          console.error('❌ Database error:', err.message);
          return callback(err, null);
        }

        // Process metals with live prices
        const updatedMetals = metals.map(metal => {
          if (metal.metal_type === 'gold') {
            const livePrice = PriceService.convertGoldPrice(priceUSD, exchangeRate);
            const currentValue = metal.quantity * livePrice;
            const gainLoss = currentValue - metal.cost_basis;
            const gainLossPercent = metal.cost_basis > 0 
              ? (gainLoss / metal.cost_basis) * 100 
              : 0;

            console.log(`📈 Gold (${metal.purity}): ₹${livePrice}/gram, Value: ₹${currentValue.toFixed(2)}`);

            return {
              ...metal,
              current_price: livePrice,
              current_value: parseFloat(currentValue.toFixed(2)),
              gain_loss: parseFloat(gainLoss.toFixed(2)),
              gain_loss_percent: parseFloat(gainLossPercent.toFixed(2)),
              price_source: 'live',
              price_timestamp: goldPriceData.timestamp,
              price_source_api: goldPriceData.source
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