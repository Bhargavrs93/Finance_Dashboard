import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedToken = authAPI.getToken();
    if (storedToken) {
      setToken(storedToken);
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        setUser({
          id: payload.id,
          username: payload.username
        });
        console.log('✅ User restored from token');
      } catch (err) {
        console.error('❌ Error parsing token:', err);
        authAPI.logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(username, password);

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        console.log('✅ Login successful:', response.user.username);
        return { success: true, user: response.user };
      } else {
        setError(response.message || 'Login failed');
        return { success: false, message: response.message };
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Login error:', err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password, email) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.register(username, password, email);

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        console.log('✅ Registration successful');
        return { success: true, user: response.user };
      } else {
        setError(response.message || 'Registration failed');
        return { success: false, message: response.message };
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Registration error:', err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    authAPI.logout();
    setToken(null);
    setUser(null);
    setError(null);
    console.log('✅ Logged out');
  };

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthContext;