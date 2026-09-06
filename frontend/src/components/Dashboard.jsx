import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { portfolioAPI, manualAPI } from '../api.js';
import '../styles/Dashboard.css';
import AddEntryModal from './AddEntryModal.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch portfolio data on load
  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await portfolioAPI.getSummary();
      setPortfolioData(data.data);
      console.log('✅ Portfolio data loaded');
    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (formData) => {
    try {
      let response;

      if (selectedCategory === 'mutualFund') {
        // Add manual mutual fund entry
        response = await manualAPI.mutualFunds.create(formData);
      } else if (selectedCategory === 'metals') {
        // Add metal
        const metalPayload = {
          ...formData,
          metal_type: 'gold'
        };
        response = await manualAPI.metals.create(metalPayload);
      } else if (selectedCategory === 'debt') {
        // Add debt fund
        response = await manualAPI.debtFunds.create(formData);
      } else if (selectedCategory === 'retirement') {
        // Add retirement account
        response = await manualAPI.retirements.create(formData);
      }

      if (response.success) {
        alert('✅ Entry added successfully!');
        setShowAddModal(false);
        // Refresh data
        setTimeout(() => fetchPortfolioData(), 500);
      } else {
        alert(`❌ Error: ${response.message || 'Error adding entry'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error adding entry: ' + error.message);
    }
  };

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '₹0.00';
    if (currency === 'INR') {
      return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    } else {
      return 'A$' + value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <h2>Loading your portfolio...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error loading portfolio</h2>
        <p>{error}</p>
        <button onClick={fetchPortfolioData}>Retry</button>
      </div>
    );
  }

  if (!portfolioData) {
    return <div className="dashboard-loading"><h2>No data available</h2></div>;
  }

  const { summary, breakdown } = portfolioData;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎯 Portfolio Dashboard</h1>
          <p className="header-date">📅 {today}</p>
        </div>

        <div className="header-right">
          {/* Currency Toggle */}
          <div className="currency-toggle">
            <button
              className={currency === 'INR' ? 'active' : ''}
              onClick={() => setCurrency('INR')}
            >
              🇮🇳 INR
            </button>
            <button
              className={currency === 'AUD' ? 'active' : ''}
              onClick={() => setCurrency('AUD')}
            >
              🇦🇺 AUD
            </button>
          </div>

          {/* User Menu */}
          <div className="user-menu">
            <span className="username">👤 {user?.username}</span>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="summary-cards">
        <div className="card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <p className="card-label">Total Value</p>
            <p className="card-value">
              {formatCurrency(summary.totalValue)}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <p className="card-label">Total Invested</p>
            <p className="card-value">
              {formatCurrency(summary.totalInvested)}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <p className="card-label">Gain / Loss</p>
            <p className={`card-value ${summary.gainLoss >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.gainLoss)}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📉</div>
          <div className="card-content">
            <p className="card-label">Return %</p>
            <p className={`card-value ${summary.gainLossPercent >= 0 ? 'positive' : 'negative'}`}>
              {summary.gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio Breakdown */}
      <section className="portfolio-breakdown">
        <h2>Portfolio Allocation</h2>

        <div className="charts-container">
          {/* Equity */}
          <div 
            className="chart-item clickable"
            onClick={() => navigate('/details/equity')}
          >
            <div className="chart-header">
              <span className="chart-name">📊 Equity</span>
              <span className="chart-percent">{breakdown.equity.allocation?.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill equity"
                style={{ width: `${breakdown.equity.allocation || 0}%` }}
              ></div>
            </div>
            <div className="chart-details">
              <p>Value: {formatCurrency(breakdown.equity.value)}</p>
              <p>Holdings: {breakdown.equity.count}</p>
              <p className="api-source">📡 Live from Zerodha</p>
            </div>
          </div>

          {/* Metals */}
          <div 
            className="chart-item clickable"
            onClick={() => navigate('/details/metals')}
          >
            <div className="chart-header">
              <span className="chart-name">🪙 Metals</span>
              <span className="chart-percent">{breakdown.metals.allocation?.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill metals"
                style={{ width: `${breakdown.metals.allocation || 0}%` }}
              ></div>
            </div>
            <div className="chart-details">
              <p>Value: {formatCurrency(breakdown.metals.value)}</p>
              <p>Holdings: {breakdown.metals.count}</p>
              <p className="manual-source">✏️ Manual + Live Prices</p>
            </div>
          </div>

          {/* Global */}
          <div 
            className="chart-item clickable"
            onClick={() => navigate('/details/global')}
          >
            <div className="chart-header">
              <span className="chart-name">🌍 Global</span>
              <span className="chart-percent">{breakdown.global.allocation?.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill global"
                style={{ width: `${breakdown.global.allocation || 0}%` }}
              ></div>
            </div>
            <div className="chart-details">
              <p>Value: {formatCurrency(breakdown.global.value)}</p>
              <p>Holdings: {breakdown.global.count}</p>
              <p className="api-source">📡 Live from Vanguard</p>
            </div>
          </div>

          {/* Debt */}
          <div 
            className="chart-item clickable"
            onClick={() => navigate('/details/debt')}
          >
            <div className="chart-header">
              <span className="chart-name">💳 Debt</span>
              <span className="chart-percent">{breakdown.debt.allocation?.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill debt"
                style={{ width: `${breakdown.debt.allocation || 0}%` }}
              ></div>
            </div>
            <div className="chart-details">
              <p>Value: {formatCurrency(breakdown.debt.value)}</p>
              <p>Holdings: {breakdown.debt.count}</p>
              <p className="manual-source">✏️ Manual Entry</p>
            </div>
          </div>

          {/* Retirement */}
          <div 
            className="chart-item clickable"
            onClick={() => navigate('/details/retirement')}
          >
            <div className="chart-header">
              <span className="chart-name">🏦 Retirement</span>
              <span className="chart-percent">{breakdown.retirement.allocation?.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill retirement"
                style={{ width: `${breakdown.retirement.allocation || 0}%` }}
              ></div>
            </div>
            <div className="chart-details">
              <p>Value: {formatCurrency(breakdown.retirement.value)}</p>
              <p>Holdings: {breakdown.retirement.count}</p>
              <p className="manual-source">✏️ Manual Entry</p>
            </div>
          </div>
        </div>
      </section>

      {/* Refresh Button */}
      <footer className="dashboard-footer">
        <div className="footer-buttons">
          <button onClick={fetchPortfolioData} className="refresh-btn">
            🔄 Refresh Data
          </button>

          {/* Dropdown Add Entry Button */}
          <div className="dropdown-wrapper">
            <button className="refresh-btn">
              + Add Entry ▼
            </button>
            <div className="dropdown-menu">
              <button
                className="dropdown-item"
                onClick={() => {
                  setSelectedCategory('mutualFund');
                  setShowAddModal(true);
                }}
              >
                📈 Mutual Fund
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setSelectedCategory('metals');
                  setShowAddModal(true);
                }}
              >
                🪙 Metals
              </button>
              <button 
                className="dropdown-item"
                onClick={() => {
                  setSelectedCategory('debt');
                  setShowAddModal(true);
                }}
              >
                💳 Debt
              </button>
              <button 
                className="dropdown-item"
                onClick={() => {
                  setSelectedCategory('retirement');
                  setShowAddModal(true);
                }}
              >
                🏦 Retirement
              </button>
            </div>
          </div>
        </div>

        <p className="last-updated">
          Last updated: {new Date(summary.lastUpdated).toLocaleString()}
        </p>
      </footer>

      {/* Add Entry Modal */}
      <AddEntryModal 
        isOpen={showAddModal}
        category={selectedCategory}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddEntry}
      />
    </div>
  );
}