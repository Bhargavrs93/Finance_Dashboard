const db = require('./database');
const XLSX = require('xlsx');

class ZerodhaImportService {
  static toNumber(value) {
    if (value === undefined || value === null || value === '') return 0;
    return parseFloat(String(value).replace(/,/g, '')) || 0;
  }

  // Round to 2 decimal places to avoid floating-point artifacts (e.g. 12 * 75.39 = 904.6800000000001)
  static round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  static findSheet(workbook, nameContains) {
    const name = workbook.SheetNames.find(n => n.toLowerCase().includes(nameContains));
    return name ? workbook.Sheets[name] : null;
  }

  static findColumn(headers, predicate) {
    return headers.findIndex(h => predicate(h));
  }

  // Locate the holdings table inside a Console statement sheet (which has
  // several preamble rows: Client ID, statement title, summary block) by
  // scanning for the row whose first cell is "Symbol".
  static extractHoldingRows(sheet) {
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const headerRowIdx = rows.findIndex(row => String(row[0] || '').trim().toLowerCase() === 'symbol');
    if (headerRowIdx === -1) return [];

    const headers = rows[headerRowIdx].map(h => String(h || '').trim().toLowerCase());
    const quantityIdx = this.findColumn(headers, h => h.startsWith('quantity available'));
    const avgPriceIdx = this.findColumn(headers, h => h.startsWith('average price'));
    const prevCloseIdx = this.findColumn(headers, h => h.startsWith('previous closing'));
    const gainLossIdx = this.findColumn(headers, h => h.startsWith('unrealized p&l') && !h.includes('pct'));
    const gainLossPctIdx = this.findColumn(headers, h => h.startsWith('unrealized p&l') && h.includes('pct'));

    const dataRows = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const symbol = String(rows[i][0] || '').trim();
      if (!symbol) break; // blank row marks the end of the table

      dataRows.push({
        tradingsymbol: symbol,
        quantity: this.toNumber(rows[i][quantityIdx]),
        average_cost: this.toNumber(rows[i][avgPriceIdx]),
        current_price: this.toNumber(rows[i][prevCloseIdx]),
        gain_loss: this.toNumber(rows[i][gainLossIdx]),
        gain_loss_percent: this.toNumber(rows[i][gainLossPctIdx])
      });
    }
    return dataRows;
  }

  // Replace Zerodha-sourced holdings of a given category with rows built by
  // rowMapper. Manually-added rows (source = 'manual') are never touched, so
  // re-importing a statement doesn't wipe out manual entries. 'stock' also
  // clears legacy rows with a NULL category, since the equity endpoint
  // treats those as stocks too.
  static replaceCategory(category, rows, rowMapper, callback) {
    const deleteSql = category === 'stock'
      ? "DELETE FROM zerodha_holdings WHERE (category = ? OR category IS NULL) AND (source IS NULL OR source = 'zerodha')"
      : "DELETE FROM zerodha_holdings WHERE category = ? AND (source IS NULL OR source = 'zerodha')";

    db.run(deleteSql, [category], (err) => {
      if (err) return callback(err, null);

      let inserted = 0;
      let failed = 0;

      const insertNext = (idx) => {
        if (idx >= rows.length) {
          console.log(`✅ ${category} import complete: ${inserted} inserted, ${failed} failed`);
          return callback(null, { imported: inserted, failed });
        }

        const mapped = rowMapper(rows[idx]);
        if (!mapped) {
          failed++;
          return insertNext(idx + 1);
        }

        db.run(
          `INSERT OR REPLACE INTO zerodha_holdings
           (tradingsymbol, category, quantity, average_cost, cost_basis, current_price, current_value, gain_loss, gain_loss_percent, currency, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?)`,
          [
            mapped.tradingsymbol,
            category,
            mapped.quantity,
            mapped.average_cost,
            mapped.cost_basis,
            mapped.current_price,
            mapped.current_value,
            mapped.gain_loss,
            mapped.gain_loss_percent,
            new Date().toISOString()
          ],
          (err) => {
            if (err) {
              console.error(`❌ Failed to insert ${mapped.tradingsymbol}:`, err.message);
              failed++;
            } else {
              inserted++;
            }
            insertNext(idx + 1);
          }
        );
      };

      insertNext(0);
    });
  }

  static toHoldingRecord(row) {
    if (!row.tradingsymbol) return null;

    return {
      tradingsymbol: row.tradingsymbol,
      quantity: row.quantity,
      average_cost: row.average_cost,
      current_price: row.current_price,
      cost_basis: this.round2(row.quantity * row.average_cost),
      current_value: this.round2(row.quantity * row.current_price),
      gain_loss: row.gain_loss,
      gain_loss_percent: row.gain_loss_percent
    };
  }

  // Import a full Zerodha Console "Holdings Statement" export (.xlsx), which
  // has an "Equity" tab and a "Mutual Funds" tab. Replaces both categories.
  static importHoldingsWorkbook(fileBase64, callback) {
    let workbook;
    try {
      const buffer = Buffer.from(fileBase64, 'base64');
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (err) {
      return callback(new Error('Could not read the uploaded file. Please upload the Zerodha Console holdings statement (.xlsx).'), null);
    }

    const stockRows = this.extractHoldingRows(this.findSheet(workbook, 'equity'));
    const mfRows = this.extractHoldingRows(this.findSheet(workbook, 'mutual fund'));

    if (stockRows.length === 0 && mfRows.length === 0) {
      return callback(new Error('No holdings found in the file. Make sure it is the Console statement with Equity/Mutual Funds tabs.'), null);
    }

    this.replaceCategory('stock', stockRows, this.toHoldingRecord.bind(this), (err, stockResult) => {
      if (err) return callback(err, null);

      this.replaceCategory('mutual_fund', mfRows, this.toHoldingRecord.bind(this), (err, mfResult) => {
        if (err) return callback(err, null);

        callback(null, {
          stocksImported: stockResult.imported,
          stocksFailed: stockResult.failed,
          mfImported: mfResult.imported,
          mfFailed: mfResult.failed
        });
      });
    });
  }
}

module.exports = ZerodhaImportService;
