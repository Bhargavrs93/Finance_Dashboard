import React, { useState } from 'react';
import '../styles/AddEntryModal.css';

export default function UnmaskModal({ isOpen, onClose, onUnmask }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const success = await onUnmask(pin);
      if (success) {
        setPin('');
        onClose();
      } else {
        setError('Incorrect PIN');
      }
    } catch (err) {
      setError('Error verifying PIN: ' + err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unmask Values</h2>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="privacy-pin">Enter PIN</label>
            <input
              id="privacy-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
              required
            />
          </div>

          {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: '0 0 10px 0' }}>{error}</p>}

          <div className="modal-buttons">
            <button type="submit" className="btn-submit" disabled={checking}>
              {checking ? 'Checking…' : 'Unmask'}
            </button>
            <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
