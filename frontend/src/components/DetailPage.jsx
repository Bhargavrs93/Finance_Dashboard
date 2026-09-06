import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI, manualAPI } from '../api';
import '../styles/DetailPage.css';

export default function DetailPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '₹0.00';
    return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
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
    const { holdings = [], summary = {} } = data;
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(summary.totalValue)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(summary.totalInvested)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Stocks:</span>
              <strong>{summary.totalStocks || 0}</strong>
            </div>
            <div className="summary-item">
              <span>Total MFs:</span>
              <strong>{summary.totalMFs || 0}</strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <h3>All Holdings</h3>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Cost Basis</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.symbol || 'N/A'}</td>
                    <td>{holding.instrument_name || 'N/A'}</td>
                    <td>{holding.quantity}</td>
                    <td>{formatCurrency(holding.cost_basis)}</td>
                    <td>{formatCurrency(holding.current_value)}</td>
                    <td className={holding.gain_loss >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(holding.gain_loss)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No equity holdings found</p>
          )}
        </div>
      </>
    );
  };

  const renderMetals = () => {
    const { holdings = [], summary = {} } = data;
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(summary.totalValue)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(summary.totalInvested)}</strong>
            </div>
            <div className="summary-item">
              <span>Gain/Loss:</span>
              <strong className={summary.gainLoss >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(summary.gainLoss)}
              </strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <h3>Metal Holdings</h3>
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
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(summary.totalValue)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(summary.totalInvested)}</strong>
            </div>
            <div className="summary-item">
              <span>Gain/Loss:</span>
              <strong className={summary.gainLoss >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(summary.gainLoss)}
              </strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <h3>Global Assets</h3>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Cost Per Unit</th>
                  <th>Cost Basis</th>
                  <th>Current Price</th>
                  <th>Current Value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.name}</td>
                    <td>{holding.symbol}</td>
                    <td>{holding.quantity}</td>
                    <td>{holding.currency} {holding.cost_per_unit}</td>
                    <td>{holding.currency} {holding.cost_basis}</td>
                    <td>{holding.currency} {holding.current_price}</td>
                    <td>{holding.currency} {holding.current_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No global assets found</p>
          )}
        </div>
      </>
    );
  };

  const renderDebt = () => {
    const { holdings = [], summary = {} } = data;
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(summary.totalValue)}</strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <h3>Debt Funds</h3>
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
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.name}</td>
                    <td>{holding.type}</td>
                    <td>{formatCurrency(holding.invested_amount)}</td>
                    <td>{holding.interest_rate}%</td>
                    <td>{holding.currency}</td>
                    <td>{holding.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No debt funds found</p>
          )}
        </div>
      </>
    );
  };

  const renderRetirement = () => {
    const { holdings = [], summary = {} } = data;
    return (
      <>
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Value:</span>
              <strong>{formatCurrency(summary.totalValue)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invested:</span>
              <strong>{formatCurrency(summary.totalInvested)}</strong>
            </div>
          </div>
        </div>

        <div className="holdings-section">
          <h3>Retirement Accounts</h3>
          {holdings.length > 0 ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Balance</th>
                  <th>Currency</th>
                  <th>Monthly Contribution</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td>{holding.name}</td>
                    <td>{holding.account_type}</td>
                    <td>{holding.provider}</td>
                    <td>{formatCurrency(holding.current_balance)}</td>
                    <td>{holding.currency}</td>
                    <td>{formatCurrency(holding.monthly_contribution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No retirement accounts found</p>
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
    </div>
  );
}