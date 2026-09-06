import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useCurrency } from '../CurrencyContext.jsx';
import { usePrivacy } from '../PrivacyContext.jsx';
import { portfolioAPI, manualAPI } from '../api.js';
import '../styles/Dashboard.css';
import AddEntryModal from './AddEntryModal.jsx';
import DonutChart from './DonutChart.jsx';
import UnmaskModal from './UnmaskModal.jsx';

const CATEGORY_META = {
  equity: { label: 'Equity', color: '#667eea' },
  metals: { label: 'Metals', color: '#f5576c' },
  global: { label: 'Global', color: '#00f2fe' },
  debt: { label: 'Debt / Cash', color: '#38f9d7' },
  retirement: { label: 'Retirement', color: '#9b59b6' }
};

const CURRENCY_META = {
  INR: { color: '#FF9933' },
  AUD: { color: '#00247D' },
  USD: { color: '#2E7D32' }
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { currency, setCurrency, convertAmount } = useCurrency();
  const { masked, mask, unmask } = usePrivacy();
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUnmaskModal, setShowUnmaskModal] = useState(false);

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
  // just swapping the symbol on the same underlying number. Whole numbers
  // only (no decimals) - percentages are formatted separately and unaffected.
  // When masked, returns a placeholder instead of the real amount.
  const formatCurrency = (value) => {
    const symbol = currency === 'AUD' ? 'A$' : '₹';
    if (masked) return symbol + '••••••';

    const converted = convertAmount(value || 0, 'INR', currency);
    const locale = currency === 'AUD' ? 'en-AU' : 'en-IN';
    return symbol + Math.round(converted).toLocaleString(locale, { maximumFractionDigits: 0 });
  };

  const scrollToAccounts = () => {
    document.getElementById('accounts-section')?.scrollIntoView({ behavior: 'smooth' });
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
        <button onClick={logout} className="logout-link-btn">Log out</button>
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

  // Percent shown per account reflects its share of Liquid portfolio
  // allocation only (matching the donut chart above) - Retirement is
  // illiquid/locked and excluded from that allocation, so it gets no percent.
  const accounts = [
    { name: 'Zerodha (IN)', description: 'Equities, mutual funds', value: breakdown.equity.value, route: '/details/equity', category: 'equity' },
    { name: 'Vanguard (AU)', description: 'VDHG, diversified ETFs', value: breakdown.global.value, route: '/details/global', category: 'global' },
    { name: 'Debt / Cash holdings', description: 'FDs, cash deposits', value: breakdown.debt.value, route: '/details/debt', category: 'debt' },
    { name: 'Precious metals', description: 'Gold, silver holdings', value: breakdown.metals.value, route: '/details/metals', category: 'metals' }
  ].map(acc => ({
    ...acc,
    percent: fi.investableAssets > 0 ? (acc.value / fi.investableAssets) * 100 : 0
  }));

  const retirementAccount = {
    name: 'Retirement (locked)',
    description: 'Super, PPF, physical gold',
    value: breakdown.retirement.value,
    route: '/details/retirement',
    category: 'retirement'
  };

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

          {/* Privacy Toggle */}
          <button
            className="privacy-toggle-btn"
            onClick={() => (masked ? setShowUnmaskModal(true) : mask())}
            type="button"
          >
            {masked ? '🔒 Masked' : '🔓 Unmasked'}
          </button>

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
        <h2>Digital Pocket</h2>
        <div className="fi-cards">
          <div className="fi-card clickable" onClick={scrollToAccounts} title="View accounts breakdown">
            <span className="fi-label">Investable Assets</span>
            <strong className="fi-value blue">{formatCurrency(fi.investableAssets)}</strong>
            <span className="fi-note">Liquid + active</span>
          </div>
          <div className="fi-card">
            <span className="fi-label">FI Target ({fi.fiTarget ? '25x' : '—'})</span>
            <strong className="fi-value">{formatCurrency(fi.fiTarget)}</strong>
            <span className="fi-note">Financial Independence</span>
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
          <div
            className="waterfall-card clickable"
            onClick={() => navigate('/details/retirement')}
            title="View Retirement Accounts"
          >
            <span className="waterfall-label">Illiquid &amp; locked</span>
            <strong>{formatCurrency(fi.illiquidLocked)}</strong>
            <span className="waterfall-note">Super, PF, physical gold</span>
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
      <section className="accounts-section" id="accounts-section">
        <h2>Accounts</h2>
        <div className="account-list">
          {accounts.map(acc => (
            <div className="account-item clickable" onClick={() => navigate(acc.route)} key={acc.name}>
              <div className="account-main">
                <div className="account-name-row">
                  <p className="account-name">{acc.name}</p>
                  <span
                    className="account-badge"
                    style={{ background: CATEGORY_META[acc.category]?.color }}
                  >
                    {CATEGORY_META[acc.category]?.label}
                  </span>
                </div>
                <p className="account-desc">{acc.description}</p>
                <div className="progress-bar account-progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(acc.percent, 100)}%`,
                      background: CATEGORY_META[acc.category]?.color
                    }}
                  ></div>
                </div>
              </div>
              <div className="account-value-col">
                <strong>{formatCurrency(acc.value)}</strong>
                <span className="account-percent">{acc.percent.toFixed(0)}% of liquid assets</span>
              </div>
            </div>
          ))}

          {/* Retirement is illiquid/locked - shown separately, without a
              percent-of-liquid-allocation bar since it isn't part of that pool */}
          <div className="account-item clickable" onClick={() => navigate(retirementAccount.route)}>
            <div className="account-main">
              <div className="account-name-row">
                <p className="account-name">{retirementAccount.name}</p>
                <span
                  className="account-badge"
                  style={{ background: CATEGORY_META[retirementAccount.category]?.color }}
                >
                  {CATEGORY_META[retirementAccount.category]?.label}
                </span>
              </div>
              <p className="account-desc">{retirementAccount.description}</p>
            </div>
            <div className="account-value-col">
              <strong>{formatCurrency(retirementAccount.value)}</strong>
              <span className="account-percent">Locked</span>
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
          <button onClick={() => navigate('/calculator')} className="refresh-btn">
            🧮 Compound Calculator
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

      {/* Unmask PIN Modal */}
      <UnmaskModal
        isOpen={showUnmaskModal}
        onClose={() => setShowUnmaskModal(false)}
        onUnmask={unmask}
      />
    </div>
  );
}
