import React, { createContext, useState, useContext, useEffect } from 'react';
import { priceAPI } from './api';

const CurrencyContext = createContext(null);

// Fallback rates used until the live rates load (or if the fetch fails)
const FALLBACK_RATES = { audToInr: 55, usdToInr: 83 };

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('currency') || 'INR');
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    priceAPI.getExchangeRates()
      .then((response) => {
        if (response.success) {
          setRates({ audToInr: response.data.audToInr, usdToInr: response.data.usdToInr });
          console.log('✅ Exchange rates loaded:', response.data);
        }
      })
      .catch((err) => console.error('❌ Failed to load exchange rates, using fallback:', err.message))
      .finally(() => setRatesLoaded(true));
  }, []);

  const setCurrency = (value) => {
    localStorage.setItem('currency', value);
    setCurrencyState(value);
  };

  // Convert an amount from one currency to another using the live rates.
  // INR is the pivot: convert fromCurrency -> INR -> toCurrency.
  const convertAmount = (amount, fromCurrency, toCurrency) => {
    const amt = parseFloat(amount) || 0;
    const from = fromCurrency || 'INR';
    const to = toCurrency || 'INR';
    if (from === to) return amt;

    let inINR = amt;
    if (from === 'AUD') inINR = amt * rates.audToInr;
    else if (from === 'USD') inINR = amt * rates.usdToInr;

    if (to === 'INR') return inINR;
    if (to === 'AUD') return inINR / rates.audToInr;
    if (to === 'USD') return inINR / rates.usdToInr;
    return inINR;
  };

  const value = { currency, setCurrency, rates, ratesLoaded, convertAmount };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}

export default CurrencyContext;
