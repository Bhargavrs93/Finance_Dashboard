import React, { createContext, useState, useContext } from 'react';
import { authAPI } from './api';

const PrivacyContext = createContext(null);

export function PrivacyProvider({ children }) {
  // Always starts masked - this is in-memory only (not persisted to
  // localStorage), so a fresh login or page reload always re-masks values.
  const [masked, setMasked] = useState(true);

  const mask = () => setMasked(true);

  // Verifies the PIN against the backend (never stored/checked client-side)
  // and unmasks values only if it's correct.
  const unmask = async (pin) => {
    const response = await authAPI.verifyPrivacyPin(pin);
    if (response.success) {
      setMasked(false);
    }
    return response.success;
  };

  const value = { masked, mask, unmask };

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);

  if (!context) {
    throw new Error('usePrivacy must be used within PrivacyProvider');
  }

  return context;
}

export default PrivacyContext;
