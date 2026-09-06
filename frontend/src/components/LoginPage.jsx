import React, { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!username.trim()) {
      setLocalError('Username is required');
      return;
    }

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    // Attempt login
    const result = await login(username, password);

    if (!result.success) {
      setLocalError(result.message || 'Login failed');
    }
  };

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    console.log('📝 Demo login with testuser/password123');
    const result = await login('testuser', 'password123');
    
    if (!result.success) {
      setLocalError(result.message || 'Demo login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🎯 Portfolio Dashboard</h1>
          <p>Track your investments securely</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Error Message */}
          {(localError || error) && (
            <div className="error-message">
              ❌ {localError || error}
            </div>
          )}

          {/* Username Input */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          className="demo-button"
          disabled={loading}
        >
          📝 Demo Login (testuser)
        </button>

        {/* Footer */}
        <div className="login-footer">
          <p>Test credentials:</p>
          <p><strong>Username:</strong> testuser</p>
          <p><strong>Password:</strong> password123</p>
        </div>
      </div>
    </div>
  );
}