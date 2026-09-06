import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DonutChart from './DonutChart.jsx';
import '../styles/CompoundCalculator.css';

const formatCurrency = (value) => '₹' + Math.round(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Lumpsum: standard compound interest, compounded annually
function calculateLumpsum(principal, annualRatePercent, years) {
  const rate = annualRatePercent / 100;
  const maturity = principal * Math.pow(1 + rate, years);
  return { invested: principal, maturity };
}

// SIP: standard future-value-of-annuity-due formula, compounded monthly
// (matches how Groww/most SIP calculators treat a monthly investment made at the start of each month)
function calculateSIP(monthlyInvestment, annualRatePercent, years) {
  const months = years * 12;
  const i = annualRatePercent / 100 / 12;
  const invested = monthlyInvestment * months;

  if (i === 0) {
    return { invested, maturity: invested };
  }

  const maturity = monthlyInvestment * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
  return { invested, maturity };
}

export default function CompoundCalculator() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('sip'); // 'sip' or 'lumpsum'
  const [amount, setAmount] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const result = useMemo(() => {
    const { invested, maturity } = mode === 'sip'
      ? calculateSIP(amount, rate, years)
      : calculateLumpsum(amount, rate, years);

    const returns = maturity - invested;

    // Year-by-year breakdown for the table
    const yearly = [];
    for (let y = 1; y <= years; y++) {
      const yearData = mode === 'sip'
        ? calculateSIP(amount, rate, y)
        : calculateLumpsum(amount, rate, y);
      yearly.push({
        year: y,
        invested: yearData.invested,
        value: yearData.maturity
      });
    }

    return { invested, maturity, returns, yearly };
  }, [mode, amount, rate, years]);

  const donutSegments = [
    {
      label: 'Invested Amount',
      percent: result.maturity > 0 ? (result.invested / result.maturity) * 100 : 0,
      color: '#667eea'
    },
    {
      label: 'Est. Returns',
      percent: result.maturity > 0 ? (result.returns / result.maturity) * 100 : 0,
      color: '#27ae60'
    }
  ];

  const amountConfig = mode === 'sip'
    ? { label: 'Monthly Investment', min: 500, max: 200000, step: 500 }
    : { label: 'Initial Investment', min: 1000, max: 10000000, step: 1000 };

  return (
    <div className="calc-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>

      <header className="calc-header">
        <h1>🧮 Compound Calculator</h1>
        <p>See how your investments could grow over time</p>
      </header>

      <div className="calc-mode-toggle">
        <button
          className={mode === 'sip' ? 'active' : ''}
          onClick={() => setMode('sip')}
        >
          Monthly SIP
        </button>
        <button
          className={mode === 'lumpsum' ? 'active' : ''}
          onClick={() => setMode('lumpsum')}
        >
          Lumpsum
        </button>
      </div>

      <div className="calc-body">
        <div className="calc-inputs">
          <div className="calc-input-group">
            <div className="calc-input-label-row">
              <label>{amountConfig.label}</label>
              <span className="calc-input-value">{formatCurrency(amount)}</span>
            </div>
            <input
              type="range"
              min={amountConfig.min}
              max={amountConfig.max}
              step={amountConfig.step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <input
              type="number"
              className="calc-number-input"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div className="calc-input-group">
            <div className="calc-input-label-row">
              <label>Expected Return Rate (p.a.)</label>
              <span className="calc-input-value">{rate}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <input
              type="number"
              className="calc-number-input"
              value={rate}
              onChange={(e) => setRate(Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div className="calc-input-group">
            <div className="calc-input-label-row">
              <label>Time Period</label>
              <span className="calc-input-value">{years} yr{years !== 1 ? 's' : ''}</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
            <input
              type="number"
              className="calc-number-input"
              value={years}
              onChange={(e) => setYears(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>

        <div className="calc-output">
          <DonutChart segments={donutSegments} size={200} strokeWidth={32} />
          <div className="calc-output-summary">
            <div className="calc-output-row">
              <span>Invested Amount</span>
              <strong>{formatCurrency(result.invested)}</strong>
            </div>
            <div className="calc-output-row">
              <span>Est. Returns</span>
              <strong className="positive">{formatCurrency(result.returns)}</strong>
            </div>
            <div className="calc-output-row total">
              <span>Total Value</span>
              <strong>{formatCurrency(result.maturity)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="calc-yearly-section">
        <h3>Year-by-year growth</h3>
        <div className="calc-yearly-table-wrapper">
          <table className="calc-yearly-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Invested</th>
                <th>Est. Returns</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {result.yearly.map(row => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{formatCurrency(row.invested)}</td>
                  <td className="positive">{formatCurrency(row.value - row.invested)}</td>
                  <td>{formatCurrency(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
