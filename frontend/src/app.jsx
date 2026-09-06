import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { CurrencyProvider } from './CurrencyContext.jsx';
import { PrivacyProvider } from './PrivacyContext.jsx';
import LoginPage from './components/LoginPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import DetailPage from './components/DetailPage.jsx';
import CompoundCalculator from './components/CompoundCalculator.jsx';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? (
    <CurrencyProvider>
      <PrivacyProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/details/:category" element={<DetailPage />} />
            <Route path="/calculator" element={<CompoundCalculator />} />
          </Routes>
        </Router>
      </PrivacyProvider>
    </CurrencyProvider>
  ) : (
    <LoginPage />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}