import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI, manualAPI } from '../api';
import { useCurrency } from '../CurrencyContext.jsx';
import { usePrivacy } from '../PrivacyContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import AddEntryModal from './AddEntryModal';
import '../styles/DetailPage.css';

export default function DetailPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { currency, convertAmount, rates } = useCurrency();
  const { masked } = usePrivacy();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importingHoldings, setImportingHoldings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [addEntryMode, setAddEntryMode] = useState('default');

  // Fetch category data on load
  useEffect(() => {
    fetchCategoryData();
  }, [category]);

  const fetchCategoryData = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;

      switch (category) {
        case 'equity':
          response = await portfolioAPI.getEquity();
          break;
        case 'metals':
          response = await portfolioAPI.getMetals();
          break;
        case 'global':
          response = await portfolioAPI.getGlobal();
          break;
        case 'debt':
          response = await portfolioAPI.getDebt();
          break;
        case 'retirement':
          response = await portfolioAPI.getRetirement();
          break;
        default:
          throw new Error('Unknown category');
      }

      setData(response.data);
      console.log(`✅ ${category} data loaded`);
    } catch (err) {
      setError(err.message);
      console.error(`❌ Error fetching ${category}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Get category icon and title
  const getCategoryInfo = () => {
    const info = {
      equity: { icon: '📊', title: 'Equity Holdings', color: '#667eea' },
      metals: { icon: '🪙', title: 'Metal Holdings', color: '#f5576c' },
      global: { icon: '🌍', title: 'Global Assets', color: '#00f2fe' },
      debt: { icon: '💳', title: 'Debt Funds', color: '#38f9d7' },
      retirement: { icon: '🏦', title: 'Retirement Accounts', color: '#fee140' }
    };
    return info[category] || { icon: '📈', title: 'Portfolio', color: '#667eea' };
  };

  // Format currency - shows the right symbol for the entry's own currency
  // (₹ for INR, A$ for AUD, $ for USD), rather than always assuming INR.
  // Whole numbers only (no decimals). When masked, returns a placeholder.
  const formatCurrency = (value, currency = 'INR') => {
    if (!value) value = 0;
    const symbols = { INR: '₹', AUD: 'A$', USD: '$' };
    const locales = { INR: 'en-IN', AUD: 'en-AU', USD: 'en-US' };
    const symbol = symbols[currency] || '₹';
    const locale = locales[currency] || 'en-IN';
    if (masked) return symbol + '••••••';
    return symbol + Math.round(value).toLocaleString(locale, { maximumFractionDigits: 0 });
  };

  // Open the modal to add a new entry. 'mode' picks a field-set variant for
  // this category - currently only used for Retirement's live-priced gold entry.
  const openAddModal = (mode = 'default') => {
    setEditingEntry(null);
    setAddEntryMode(mode);
    setShowAddModal(true);
  };

  // Open the modal pre-filled with an existing entry to edit
  const openEditModal = (holding) => {
    setEditingEntry(holding);
    setAddEntryMode(holding.provider_api === 'gold' ? 'gold' : 'default');
    setShowAddModal(true);
  };

  // Create or update a manual entry for the category currently shown on this page.
  // Current price for metals/global is filled in automatically from live price feeds.
  const handleAddEntry = async (formData) => {
    const isEdit = !!editingEntry;

    try {
      let response;
      if (category === 'metals') {
        const payload = { ...formData, metal_type: 'gold' };
        response = isEdit
          ? await manualAPI.metals.update(editingEntry.id, payload)
          : await manualAPI.metals.create(payload);
      } else if (category === 'global') {
        const payload = { ...formData, asset_type: 'vdhg', currency: 'AUD' };
        response = isEdit
          ? await manualAPI.globalAssets.update(editingEntry.id, payload)
          : await manualAPI.globalAssets.create(payload);
      } else if (category === 'debt') {
        response = isEdit
          ? await manualAPI.debtFunds.update(editingEntry.id, formData)
          : await manualAPI.debtFunds.create(formData);
      } else if (category === 'retirement') {
        // Live-priced gold entries don't take a manual currency/balance - both
        // come from the live gold price feed based on the quantity entered
        const payload = addEntryMode === 'gold'
          ? { ...formData, account_type: 'Physical Gold', currency: 'INR', provider_api: 'gold', has_live_data: true, current_balance: 0 }
          : formData;
        response = isEdit
          ? await manualAPI.retirements.update(editingEntry.id, payload)
          : await manualAPI.retirements.create(payload);
      }

      if (response.success) {
        alert(`✅ Entry ${isEdit ? 'updated' : 'added'} successfully!`);
        setShowAddModal(false);
        setEditingEntry(null);
        fetchCategoryData();
      } else {
        alert(`❌ Error: ${response.message || 'Error saving entry'}`);
      }
    } catch (err) {
      alert(`❌ Error ${isEdit ? 'updating' : 'adding'} entry: ` + err.message);
    }
  };

  // Read the uploaded Zerodha holdings statement (.xlsx) and send it to the backend as base64
  const handleHoldingsFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setImportingHoldings(true);
      try {
        const base64 = event.target.result.split(',')[1];
        const response = await portfolioAPI.importHoldings(base64);
        alert(`✅ ${response.message}`);
        fetchCategoryData();
      } catch (err) {
        alert(`❌ Import failed: ${err.message}`);
      } finally {
        setImportingHoldings(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="detail-page">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <div className="detail-loading">
          <h2>Loading {category} details...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-page">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <div className="detail-error">
          <h2>Error loading {category}</h2>
          <p>{error}</p>
          <button onClick={fetchCategoryData}>Retry</button>
          <button onClick={logout} className="logout-link-btn">Log out</button>
        </div>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo();

  // Render based on category type
  const renderContent = () => {
    if (!data) return <p>No data available</p>;

    switch (category) {
      case 'equity':
        return renderEquity();
      case 'metals':
        return renderMetals();
      case 'global':
        return renderGlobal();
      case 'debt':
        return renderDebt();
      case 'retirement':
        return renderRetirement();
      default:
        return <p>Unknown category</p>;
    }
  };

  const renderEquity = () => {
    const { stocks = [], mutualFunds = [], summary = {} } = data;
    // Equity/mutual fund holdings are always stored in INR - convert to the selected toggle currency
    const totalValue = convertAmount(summary.totalValue, 'INR', currency);
    const totalInvested = convertAmount(summary.totalInvested, 'INR', currency);
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(totalValue, currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(totalInvested, currency)}</strong>
            </div>
            <div className="summary-item">
              <span>% Returns:</span>
              <strong className={summary.gainLossPercent >= 0 ? 'positive' : 'negative'}>
                {summary.gainLossPercent?.toFixed(2)}%
              </strong>
            </div>
          </div>
        </div>

        <div className="import-section">
          <div className="import-card">
            <div>
              <h4>📥 Import Holdings</h4>
              <p>Zerodha Console → download the Holdings Statement (.xlsx). It has separate Equity and Mutual Funds tabs — both get imported automatically.</p>
            </div>
            <label className={`import-btn ${importingHoldings ? 'disabled' : ''}`}>
              {importingHoldings ? 'Importing…' : '📤 Import Holdings Statement (.xlsx)'}
              <input type="file" accept=".xlsx,.xls" onChange={handleHoldingsFileChange} disabled={importingHoldings} hidden />
            </label>
          </div>
        </div>

        <div className="holdings-section">
          <h3>Stocks ({stocks.length})</h3>
          {stocks.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Cost</th>
                  <th>Prev. Close</th>
                  <th>Invested</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                  <th>Gain/Loss %</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.tradingsymbol}</td>
                    <td>{holding.quantity}</td>
                    <td>{formatCurrency(holding.average_cost)}</td>
                    <td>{formatCurrency(holding.current_price)}</td>
                    <td>{formatCurrency(holding.cost_basis)}</td>
                    <td>{formatCurrency(holding.current_value)}</td>
                    <td className={holding.gain_loss >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(holding.gain_loss)}
                    </td>
                    <td className={holding.gain_loss_percent >= 0 ? 'positive' : 'negative'}>
                      {holding.gain_loss_percent?.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No stock holdings found. Import a holdings statement to get started.</p>
          )}
        </div>

        <div className="holdings-section">
          <h3>Mutual Funds ({mutualFunds.length})</h3>
          {mutualFunds.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Units</th>
                  <th>Avg NAV</th>
                  <th>Prev. Close</th>
                  <th>Invested</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                  <th>Gain/Loss %</th>
                </tr>
              </thead>
              <tbody>
                {mutualFunds.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.tradingsymbol}</td>
                    <td>{holding.quantity?.toFixed(3)}</td>
                    <td>{formatCurrency(holding.average_cost)}</td>
                    <td>{formatCurrency(holding.current_price)}</td>
                    <td>{formatCurrency(holding.cost_basis)}</td>
                    <td>{formatCurrency(holding.current_value)}</td>
                    <td className={holding.gain_loss >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(holding.gain_loss)}
                    </td>
                    <td className={holding.gain_loss_percent >= 0 ? 'positive' : 'negative'}>
                      {holding.gain_loss_percent?.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No mutual fund holdings found. Import a holdings statement to get started.</p>
          )}
        </div>
      </>
    );
  };

  const renderMetals = () => {
    const { holdings = [], summary = {} } = data;
    // Metal holdings are always priced in INR - convert to the selected toggle currency
    const totalValue = convertAmount(summary.totalValue, 'INR', currency);
    const totalInvested = convertAmount(summary.totalInvested, 'INR', currency);
    const gainLoss = convertAmount(summary.gainLoss, 'INR', currency);
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(totalValue, currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(totalInvested, currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Gain/Loss:</span>
              <strong className={summary.gainLoss >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(gainLoss, currency)}
              </strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <div className="holdings-section-header">
            <h3>Metal Holdings</h3>
            <button className="add-entry-btn" onClick={() => openAddModal()} type="button">
              + Add Entry
            </button>
          </div>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Purity</th>
                  <th>Quantity</th>
                  <th>Cost Per Unit</th>
                  <th>Cost Basis</th>
                  <th>Current Price</th>
                  <th>Current Value</th>
                  <th>Gain/Loss %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.metal_type}</td>
                    <td>{holding.purity}</td>
                    <td>{holding.quantity}</td>
                    <td>{formatCurrency(holding.cost_per_unit)}</td>
                    <td>{formatCurrency(holding.cost_basis)}</td>
                    <td>{formatCurrency(holding.current_price)}</td>
                    <td>{formatCurrency(holding.current_value)}</td>
                    <td className={holding.gain_loss_percent >= 0 ? 'positive' : 'negative'}>
                      {holding.gain_loss_percent?.toFixed(2)}%
                    </td>
                    <td>
                      <button className="edit-btn" onClick={() => openEditModal(holding)} type="button">
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No metal holdings found</p>
          )}
        </div>
      </>
    );
  };

  const renderGlobal = () => {
    const { holdings = [], summary = {} } = data;
    // Global (VDHG) holdings are always priced in AUD - convert to the selected toggle currency
    const totalValue = convertAmount(summary.totalValue, 'AUD', currency);
    const totalInvested = convertAmount(summary.totalInvested, 'AUD', currency);
    const gainLoss = convertAmount(summary.gainLoss, 'AUD', currency);
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(totalValue, currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(totalInvested, currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Gain/Loss:</span>
              <strong className={summary.gainLoss >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(gainLoss, currency)}
              </strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <div className="holdings-section-header">
            <h3>Global Assets</h3>
            <button className="add-entry-btn" onClick={() => openAddModal()} type="button">
              + Add Entry
            </button>
          </div>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Fund Name</th>
                  <th>Units</th>
                  <th>Unit Price</th>
                  <th>Purchase Date</th>
                  <th>Total Price</th>
                  <th>Current Price</th>
                  <th>Current Value</th>
                  <th>% Change</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.name}</td>
                    <td>{holding.quantity}</td>
                    <td>{formatCurrency(holding.cost_per_unit, holding.currency)}</td>
                    <td>{holding.purchase_date || 'N/A'}</td>
                    <td>{formatCurrency(holding.cost_basis, holding.currency)}</td>
                    <td>{formatCurrency(holding.current_price, holding.currency)}</td>
                    <td>{formatCurrency(holding.current_value, holding.currency)}</td>
                    <td className={holding.gain_loss_percent >= 0 ? 'positive' : 'negative'}>
                      {holding.gain_loss_percent?.toFixed(2)}%
                    </td>
                    <td>
                      <button className="edit-btn" onClick={() => openEditModal(holding)} type="button">
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No global assets found. Add an entry to get started.</p>
          )}
        </div>
      </>
    );
  };

  const renderDebt = () => {
    const { holdings = [], summary = {} } = data;
    // Debt entries can each have their own currency (INR/AUD/USD) - convert every
    // row to the selected toggle currency individually, then sum, so mixed-currency
    // funds add up correctly regardless of which toggle is selected.
    const totalValue = holdings.reduce(
      (sum, h) => sum + convertAmount(h.invested_amount, h.currency, currency),
      0
    );
    const hasOtherCurrency = holdings.some(h => (h.currency || 'INR') !== currency);
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(totalValue, currency)}</strong>
            </div>
          </div>
          {hasOtherCurrency && (
            <p className="summary-note">
              Converted to {currency} using live exchange rates (1 AUD = ₹{rates.audToInr.toFixed(2)}, 1 USD = ₹{rates.usdToInr.toFixed(2)})
            </p>
          )}
        </div>

        <div className="holdings-section">
          <div className="holdings-section-header">
            <h3>Debt Funds</h3>
            <button className="add-entry-btn" onClick={() => openAddModal()} type="button">
              + Add Entry
            </button>
          </div>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Fund Name</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Interest Rate</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.name}</td>
                    <td>{holding.type}</td>
                    <td>{formatCurrency(holding.invested_amount, holding.currency)}</td>
                    <td>{holding.interest_rate}%</td>
                    <td>{holding.currency}</td>
                    <td>{holding.status}</td>
                    <td>
                      <button className="edit-btn" onClick={() => openEditModal(holding)} type="button">
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No debt funds found. Add an entry to get started.</p>
          )}
        </div>
      </>
    );
  };

  const renderRetirement = () => {
    const { holdings = [] } = data;
    // Retirement accounts can each have their own currency (INR/AUD/USD) - convert
    // every row to the selected toggle currency individually, then sum, same as Debt.
    const totalValue = holdings.reduce(
      (sum, h) => sum + convertAmount(h.current_balance, h.currency, currency),
      0
    );
    const hasOtherCurrency = holdings.some(h => (h.currency || 'INR') !== currency);
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(totalValue, currency)}</strong>
            </div>
          </div>
          {hasOtherCurrency && (
            <p className="summary-note">
              Converted to {currency} using live exchange rates (1 AUD = ₹{rates.audToInr.toFixed(2)}, 1 USD = ₹{rates.usdToInr.toFixed(2)})
            </p>
          )}
        </div>

        <div className="holdings-section">
          <div className="holdings-section-header">
            <h3>Retirement Accounts</h3>
            <div>
              <button className="add-entry-btn" onClick={() => openAddModal('gold')} type="button">
                + Add Gold Holding
              </button>{' '}
              <button className="add-entry-btn" onClick={() => openAddModal()} type="button">
                + Add Entry
              </button>
            </div>
          </div>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Quantity</th>
                  <th>Current Price</th>
                  <th>Balance</th>
                  <th>Currency</th>
                  <th>Monthly Contribution</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.name}</td>
                    <td>{holding.account_type}</td>
                    <td>{holding.provider}</td>
                    <td>{holding.provider_api === 'gold' ? `${holding.quantity}g` : 'N/A'}</td>
                    <td>
                      {holding.price_source === 'live'
                        ? `${formatCurrency(holding.current_price, holding.currency)}/g 🔴 Live`
                        : 'N/A'}
                    </td>
                    <td>{formatCurrency(holding.current_balance, holding.currency)}</td>
                    <td>{holding.currency}</td>
                    <td>{formatCurrency(holding.monthly_contribution, holding.currency)}</td>
                    <td>
                      <button className="edit-btn" onClick={() => openEditModal(holding)} type="button">
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No retirement accounts found. Add an entry to get started.</p>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="detail-page">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>

      {/* Header */}
      <header className="detail-header" style={{ borderLeftColor: categoryInfo.color }}>
        <div className="header-content">
          <h1>
            <span className="category-icon">{categoryInfo.icon}</span>
            {categoryInfo.title}
          </h1>
          <p>View detailed holdings for this category</p>
        </div>
        <button onClick={fetchCategoryData} className="refresh-btn">
          🔄 Refresh
        </button>
      </header>

      {/* Content */}
      <div className="detail-content">
        {renderContent()}
      </div>

      {/* Add Entry Modal */}
      <AddEntryModal
        isOpen={showAddModal}
        category={category === 'retirement' && addEntryMode === 'gold' ? 'retirementGold' : category}
        initialData={editingEntry}
        onClose={() => { setShowAddModal(false); setEditingEntry(null); setAddEntryMode('default'); }}
        onSubmit={handleAddEntry}
      />
    </div>
  );
}