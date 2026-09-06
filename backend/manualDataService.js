const db = require('./database');

class ManualDataService {
  // ============ METALS ============

  // Create metal
  static createMetal(data, callback) {
    console.log('📝 Creating metal entry...');

    db.run(
      `INSERT INTO metals 
       (metal_type, purity, location, quantity, cost_per_unit, cost_basis, purchase_date, current_price, current_value, gain_loss, gain_loss_percent, notes, last_updated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.metal_type || 'gold',
        data.purity || '24k',
        data.location || 'physical',
        data.quantity || 0,
        data.cost_per_unit || 0,
        data.cost_basis || (data.quantity * data.cost_per_unit),
        data.purchase_date || new Date().toISOString().split('T')[0],
        data.current_price || data.cost_per_unit || 0,
        data.current_value || (data.quantity * (data.current_price || data.cost_per_unit || 0)),
        data.gain_loss || ((data.quantity * (data.current_price || data.cost_per_unit || 0)) - data.cost_basis),
        data.gain_loss_percent || 0,
        data.notes || '',
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Metal created with ID: ${this.lastID}`);
        callback(null, { id: this.lastID, ...data });
      }
    );
  }

  // Update metal
  static updateMetal(id, data, callback) {
    console.log(`📝 Updating metal ID: ${id}`);

    // Calculate derived fields
    const cost_basis = data.quantity * data.cost_per_unit;
    const current_value = data.quantity * data.current_price;
    const gain_loss = current_value - cost_basis;
    const gain_loss_percent = cost_basis > 0 ? (gain_loss / cost_basis) * 100 : 0;

    db.run(
      `UPDATE metals 
       SET quantity = ?, cost_per_unit = ?, cost_basis = ?, current_price = ?, current_value = ?, gain_loss = ?, gain_loss_percent = ?, notes = ?, last_updated = ? 
       WHERE id = ?`,
      [
        data.quantity,
        data.cost_per_unit,
        cost_basis,
        data.current_price,
        current_value,
        gain_loss,
        gain_loss_percent,
        data.notes || '',
        new Date().toISOString(),
        id
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Metal updated: ID ${id}`);
        callback(null, { id, ...data });
      }
    );
  }

  // Delete metal
  static deleteMetal(id, callback) {
    console.log(`🗑️  Deleting metal ID: ${id}`);

    db.run(
      'DELETE FROM metals WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Metal deleted: ID ${id}`);
        callback(null, { success: true, id });
      }
    );
  }

  // ============ GLOBAL ASSETS ============

  // Create global asset
  static createGlobalAsset(data, callback) {
    console.log('📝 Creating global asset...');

    db.run(
      `INSERT INTO global_assets 
       (asset_type, symbol, name, quantity, cost_per_unit, cost_basis, purchase_date, current_price, current_value, gain_loss, gain_loss_percent, currency, notes, last_updated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.asset_type || 'vdhg',
        data.symbol || '',
        data.name || '',
        data.quantity || 0,
        data.cost_per_unit || 0,
        data.cost_basis || (data.quantity * data.cost_per_unit),
        data.purchase_date || new Date().toISOString().split('T')[0],
        data.current_price || data.cost_per_unit || 0,
        data.current_value || (data.quantity * (data.current_price || data.cost_per_unit || 0)),
        data.gain_loss || 0,
        data.gain_loss_percent || 0,
        data.currency || 'AUD',
        data.notes || '',
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Global asset created with ID: ${this.lastID}`);
        callback(null, { id: this.lastID, ...data });
      }
    );
  }

  // Update global asset
  static updateGlobalAsset(id, data, callback) {
    console.log(`📝 Updating global asset ID: ${id}`);

    const cost_basis = data.quantity * data.cost_per_unit;
    const current_value = data.quantity * data.current_price;
    const gain_loss = current_value - cost_basis;
    const gain_loss_percent = cost_basis > 0 ? (gain_loss / cost_basis) * 100 : 0;

    db.run(
      `UPDATE global_assets 
       SET quantity = ?, cost_per_unit = ?, cost_basis = ?, current_price = ?, current_value = ?, gain_loss = ?, gain_loss_percent = ?, notes = ?, last_updated = ? 
       WHERE id = ?`,
      [
        data.quantity,
        data.cost_per_unit,
        cost_basis,
        data.current_price,
        current_value,
        gain_loss,
        gain_loss_percent,
        data.notes || '',
        new Date().toISOString(),
        id
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Global asset updated: ID ${id}`);
        callback(null, { id, ...data });
      }
    );
  }

  // Delete global asset
  static deleteGlobalAsset(id, callback) {
    console.log(`🗑️  Deleting global asset ID: ${id}`);

    db.run(
      'DELETE FROM global_assets WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Global asset deleted: ID ${id}`);
        callback(null, { success: true, id });
      }
    );
  }

  // ============ DEBT FUNDS ============

  // Create debt fund
  static createDebtFund(data, callback) {
    console.log('📝 Creating debt fund...');

    db.run(
      `INSERT INTO debt_funds 
       (name, type, quantity, invested_amount, interest_rate, expected_return, maturity_date, currency, status, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name || '',
        data.type || 'fixed_deposit',
        data.quantity || null,
        data.invested_amount || 0,
        data.interest_rate || 0,
        data.expected_return || 0,
        data.maturity_date || null,
        data.currency || 'INR',
        data.status || 'active',
        data.notes || '',
        new Date().toISOString(),
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Debt fund created with ID: ${this.lastID}`);
        callback(null, { id: this.lastID, ...data });
      }
    );
  }

  // Update debt fund
  static updateDebtFund(id, data, callback) {
    console.log(`📝 Updating debt fund ID: ${id}`);

    db.run(
      `UPDATE debt_funds 
       SET name = ?, type = ?, quantity = ?, invested_amount = ?, interest_rate = ?, expected_return = ?, maturity_date = ?, currency = ?, status = ?, notes = ?, updated_at = ? 
       WHERE id = ?`,
      [
        data.name,
        data.type,
        data.quantity || null,
        data.invested_amount,
        data.interest_rate || 0,
        data.expected_return || 0,
        data.maturity_date || null,
        data.currency || 'INR',
        data.status || 'active',
        data.notes || '',
        new Date().toISOString(),
        id
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Debt fund updated: ID ${id}`);
        callback(null, { id, ...data });
      }
    );
  }

  // Delete debt fund
  static deleteDebtFund(id, callback) {
    console.log(`🗑️  Deleting debt fund ID: ${id}`);

    db.run(
      'DELETE FROM debt_funds WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Debt fund deleted: ID ${id}`);
        callback(null, { success: true, id });
      }
    );
  }

  // ============ RETIREMENTS ============

  // Create retirement account
  static createRetirement(data, callback) {
    console.log('📝 Creating retirement account...');

    db.run(
      `INSERT INTO retirements 
       (account_type, provider, name, current_balance, cost_basis, has_live_data, provider_api, gain_loss, gain_loss_percent, currency, monthly_contribution, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.account_type || 'super',
        data.provider || '',
        data.name || '',
        data.current_balance || 0,
        data.cost_basis || 0,
        data.has_live_data || false,
        data.provider_api || null,
        data.gain_loss || 0,
        data.gain_loss_percent || 0,
        data.currency || 'AUD',
        data.monthly_contribution || 0,
        data.notes || '',
        new Date().toISOString(),
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Retirement account created with ID: ${this.lastID}`);
        callback(null, { id: this.lastID, ...data });
      }
    );
  }

  // Update retirement account
  static updateRetirement(id, data, callback) {
    console.log(`📝 Updating retirement account ID: ${id}`);

    const gain_loss = (data.current_balance || 0) - (data.cost_basis || 0);
    const gain_loss_percent = data.cost_basis > 0 ? (gain_loss / data.cost_basis) * 100 : 0;

    db.run(
      `UPDATE retirements 
       SET account_type = ?, provider = ?, name = ?, current_balance = ?, cost_basis = ?, has_live_data = ?, provider_api = ?, gain_loss = ?, gain_loss_percent = ?, currency = ?, monthly_contribution = ?, notes = ?, updated_at = ? 
       WHERE id = ?`,
      [
        data.account_type,
        data.provider,
        data.name,
        data.current_balance,
        data.cost_basis,
        data.has_live_data || false,
        data.provider_api || null,
        gain_loss,
        gain_loss_percent,
        data.currency || 'AUD',
        data.monthly_contribution || 0,
        data.notes || '',
        new Date().toISOString(),
        id
      ],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Retirement account updated: ID ${id}`);
        callback(null, { id, ...data });
      }
    );
  }

  // Delete retirement account
  static deleteRetirement(id, callback) {
    console.log(`🗑️  Deleting retirement account ID: ${id}`);

    db.run(
      'DELETE FROM retirements WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return callback(err, null);
        }

        console.log(`✅ Retirement account deleted: ID ${id}`);
        callback(null, { success: true, id });
      }
    );
  }
}

module.exports = ManualDataService;