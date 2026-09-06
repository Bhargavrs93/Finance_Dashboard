import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useCurrency } from '../CurrencyContext.jsx';
import { portfolioAPI, manualAPI } from '../api.js';
import '../styles/Dashboard.css';
import AddEntryModal from './AddEntryModal.jsx';
import DonutChart from './DonutChart.jsx';

const CATEGORY_META = {
  equity: { label: 'Equity', color: '#667eea' },
  metals: { label: 'Metals', color: '#f5576c' },
  global: { label: 'Global', color: '#00f2fe' },
  debt: { label: 'Debt / Cash', color: '#38f9d7' }
};

const CURRENCY_META = {
  INR: { color: '#FF9933' },
  AUD: { color: '#00247D' },
  USD: { color: '#2E7D32' }
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { currency, setCurrency, convertAmount } = useCurrency();
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Fetch portfolio + goals on load
  useEffect(() => {
    fetchPortfolioData();
    fetchGoals();
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

  const fetchGoals = async () => {
    try {
      const response = await manualAPI.goals.getAll();
      setGoals(response.data || []);
    } catch (err) {
      console.error('❌ Error fetching goals:', err);
    }
  };

  const openAddGoalModal = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const openEditGoalModal = (goal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleGoalSubmit = async (formData) => {
    const isEdit = !!editingGoal;
    try {
      const response = isEdit
        ? await manualAPI.goals.update(editingGoal.id, formData)
        : await manualAPI.goals.create(formData);

      if (response.success) {
        setShowGoalModal(false);
        setEditingGoal(null);
        fetchGoals();
      } else {
        alert(`❌ Error: ${response.message || 'Error saving goal'}`);
      }
    } catch (err) {
      alert(`❌ Error ${isEdit ? 'updating' : 'adding'} goal: ` + err.message);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await manualAPI.goals.delete(id);
      fetchGoals();
    } catch (err) {
      alert('❌ Error deleting goal: ' + err.message);
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

  // Format currency - the backend reports everything in INR, so convert to
  // the toggled currency (using live rates) before formatting, rather than
  // just swapping the symbol on the same underlying number.
  const formatCurrency = (value) => {
    const converted = convertAmount(value || 0, 'INR', currency);
    if (currency === 'AUD') {
      return 'A$' + converted.toLocaleString('en-AU', { maximumFractionDigits: 2 });
    }
    return '₹' + converted.toLocaleString('en-IN', { maximumFractionDigits: 2 });
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

  const { summary, breakdown, fi } = portfolioData;

  const assetSegments = (fi.assetAllocation || []).map(item => ({
    label: CATEGORY_META[item.category]?.label || item.category,
    percent: item.percent,
    color: CATEGORY_META[item.category]?.color || '#ccc'
  }));

  const geoSegments = (fi.geographicExposure || []).map(item => ({
    label: item.currency,
    percent: item.percent,
    color: CURRENCY_META[item.currency]?.color || '#ccc'
  }));

  const accounts = [
    { name: 'Zerodha (IN)', description: 'Equities, mutual funds', value: breakdown.equity.value, route: '/details/equity' },
    { name: 'Vanguard (AU)', description: 'VDHG, diversified ETFs', value: breakdown.global.value, route: '/details/global' },
    { name: 'Debt / Cash holdings', description: 'FDs, cash deposits', value: breakdown.debt.value, route: '/details/debt' },
    { name: 'Precious metals', description: 'Gold, silver holdings', value: breakdown.metals.value, route: '/details/metals' },
    { name: 'Retirement (locked)', description: 'Super, PPF, physical gold', value: breakdown.retirement.value, route: '/details/retirement' }
  ];

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

      {/* Financial Independence Progress */}
      <section className="fi-section">
        <h2>Financial Independence progress</h2>
        <div className="fi-cards">
          <div className="fi-card">
            <span className="fi-label">Investable Assets</span>
            <strong className="fi-value blue">{formatCurrency(fi.investableAssets)}</strong>
            <span className="fi-note">Liquid + active</span>
          </div>
          <div className="fi-card">
            <span className="fi-label">FI Target ({fi.fiTarget ? '25x' : '—'})</span>
            <strong className="fi-value">{formatCurrency(fi.fiTarget)}</strong>
            <span className="fi-note">Annual expenses × 25</span>
          </div>
          <div className="fi-card">
            <span className="fi-label">Progress</span>
            <strong className="fi-value blue">{fi.progress.toFixed(0)}%</strong>
            <span className="fi-note">Toward financial independence</span>
          </div>
          <div className="fi-card">
            <span className="fi-label">Return</span>
            <strong className={`fi-value ${fi.returnPercent >= 0 ? 'positive' : 'negative'}`}>
              {fi.returnPercent.toFixed(1)}%
            </strong>
            <span className="fi-note">Overall return on liquid assets</span>
          </div>
        </div>
      </section>

      {/* Net Worth Waterfall */}
      <section className="waterfall-section">
        <h2>Total net worth waterfall</h2>
        <div className="waterfall-cards">
          <div className="waterfall-card">
            <span className="waterfall-label">Illiquid &amp; locked</span>
            <strong>{formatCurrency(fi.illiquidLocked)}</strong>
            <span className="waterfall-note">Super, PF, physical gold</span>
          </div>
          <div className="waterfall-card">
            <span className="waterfall-label">Semi-liquid</span>
            <strong className="neutral">{formatCurrency(fi.semiLiquid)}</strong>
            <span className="waterfall-note">Property, long-term holds</span>
          </div>
          <div className="waterfall-card">
            <span className="waterfall-label">Liquid investments</span>
            <strong className="positive">{formatCurrency(fi.investableAssets)}</strong>
            <span className="waterfall-note">Active portfolio</span>
          </div>
        </div>
        <div className="networth-banner">
          <strong>Total net worth: {formatCurrency(fi.totalNetWorth)}</strong>
          <p>For FI tracking, focus on liquid assets ({formatCurrency(fi.investableAssets)}). Illiquid assets are wealth, not income sources.</p>
        </div>
      </section>

      {/* Liquid Portfolio Allocation */}
      <section className="allocation-section">
        <h2>Liquid portfolio allocation</h2>
        <div className="donut-row">
          <div className="donut-card">
            <h4>By asset class</h4>
            {assetSegments.length > 0 ? <DonutChart segments={assetSegments} /> : <p>No liquid holdings yet</p>}
          </div>
          <div className="donut-card">
            <h4>Currency exposure</h4>
            {geoSegments.length > 0 ? <DonutChart segments={geoSegments} /> : <p>No liquid holdings yet</p>}
          </div>
        </div>
      </section>

      {/* Active Wealth-Building Goals */}
      <section className="goals-section">
        <div className="section-header-row">
          <h2>Active wealth-building goals</h2>
          <button className="add-entry-btn" onClick={openAddGoalModal} type="button">
            + Add Goal
          </button>
        </div>
        <div className="goals-list">
          {goals.length > 0 ? (
            goals.map(goal => (
              <div className="goal-item" key={goal.id}>
                <div className="goal-info">
                  <span className="goal-icon">{goal.icon || '🎯'}</span>
                  <div>
                    <p className="goal-name">{goal.name}</p>
                    {goal.description && <p className="goal-desc">{goal.description}</p>}
                  </div>
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill goal"
                      style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                    ></div>
                  </div>
                  <span className="goal-percent">{goal.progress_percent}%</span>
                  <button className="icon-btn" onClick={() => openEditGoalModal(goal)} type="button">✏️</button>
                  <button className="icon-btn" onClick={() => handleDeleteGoal(goal.id)} type="button">🗑️</button>
                </div>
              </div>
            ))
          ) : (
            <p>No goals yet. Add one to start tracking your progress.</p>
          )}
        </div>
      </section>

      {/* Accounts */}
      <section className="accounts-section">
        <h2>Accounts</h2>
        <div className="account-list">
          {accounts.map(acc => (
            <div className="account-item clickable" onClick={() => navigate(acc.route)} key={acc.name}>
              <div>
                <p className="account-name">{acc.name}</p>
                <p className="account-desc">{acc.description}</p>
              </div>
              <strong>{formatCurrency(acc.value)}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Refresh Button */}
      <footer className="dashboard-footer">
        <div className="footer-buttons">
          <button onClick={fetchPortfolioData} className="refresh-btn">
            🔄 Refresh Data
          </button>
        </div>

        <p className="last-updated">
          Last updated: {new Date(summary.lastUpdated).toLocaleString()}
        </p>
      </footer>

      {/* Add/Edit Goal Modal */}
      <AddEntryModal
        isOpen={showGoalModal}
        category="goal"
        initialData={editingGoal}
        onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        onSubmit={handleGoalSubmit}
      />
    </div>
  );
}
