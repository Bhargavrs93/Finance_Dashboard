// API configuration - supports both hardcoded and Vite environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔌 API URL:', API_URL);

// Store token in localStorage
const setToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('authToken');
};

// Remove token
const removeToken = () => {
  localStorage.removeItem('authToken');
};

// API call with token
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('API Error:', data);
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// ============ AUTHENTICATION ============

export const authAPI = {
  // Login user
  login: async (username, password) => {
    console.log('🔐 Logging in...');
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (response.success && response.token) {
      setToken(response.token);
      console.log('✅ Login successful');
    }

    return response;
  },

  // Register user
  register: async (username, password, email) => {
    console.log('📝 Registering...');
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email })
    });

    if (response.success && response.token) {
      setToken(response.token);
      console.log('✅ Registration successful');
    }

    return response;
  },

  // Logout
  logout: () => {
    console.log('🚪 Logging out...');
    removeToken();
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!getToken();
  },

  // Get current token
  getToken: getToken
};

// ============ PORTFOLIO ============

export const portfolioAPI = {
  // Get portfolio summary
  getSummary: async () => {
    console.log('📊 Fetching portfolio summary...');
    return await apiCall('/portfolio', { method: 'GET' });
  },

  // Get equity holdings
  getEquity: async () => {
    console.log('📈 Fetching equity...');
    return await apiCall('/portfolio/equity', { method: 'GET' });
  },

  // Import a Zerodha Console holdings statement (.xlsx, base64-encoded)
  importHoldings: async (fileBase64) => {
    console.log('📤 Importing holdings statement...');
    return await apiCall('/portfolio/equity/import', {
      method: 'POST',
      body: JSON.stringify({ file: fileBase64 })
    });
  },

  // Get metals
  getMetals: async () => {
    console.log('🪙 Fetching metals...');
    return await apiCall('/portfolio/metals', { method: 'GET' });
  },

  // Get global assets
  getGlobal: async () => {
    console.log('🌍 Fetching global assets...');
    return await apiCall('/portfolio/global', { method: 'GET' });
  },

  // Get debt funds
  getDebt: async () => {
    console.log('💳 Fetching debt funds...');
    return await apiCall('/portfolio/debt', { method: 'GET' });
  },

  // Get retirement accounts
  getRetirement: async () => {
    console.log('🏦 Fetching retirement...');
    return await apiCall('/portfolio/retirement', { method: 'GET' });
  }
};

// ============ MANUAL DATA ============

export const manualAPI = {
  // Metals
  metals: {
    getAll: async () => {
      return await apiCall('/manual/metals', { method: 'GET' });
    },
    create: async (data) => {
      console.log('🪙 Creating metal entry...');
      return await apiCall('/manual/metals', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id, data) => {
      console.log('🪙 Updating metal entry...');
      return await apiCall(`/manual/metals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      console.log('🪙 Deleting metal entry...');
      return await apiCall(`/manual/metals/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Manual mutual funds
  mutualFunds: {
    create: async (data) => {
      console.log('📈 Creating manual mutual fund entry...');
      return await apiCall('/manual/mutual-funds', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id, data) => {
      console.log('📈 Updating manual mutual fund entry...');
      return await apiCall(`/manual/mutual-funds/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      console.log('📈 Deleting manual mutual fund entry...');
      return await apiCall(`/manual/mutual-funds/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Global assets
  globalAssets: {
    getAll: async () => {
      return await apiCall('/manual/global-assets', { method: 'GET' });
    },
    create: async (data) => {
      console.log('🌍 Creating global asset...');
      return await apiCall('/manual/global-assets', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id, data) => {
      console.log('🌍 Updating global asset...');
      return await apiCall(`/manual/global-assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      console.log('🌍 Deleting global asset...');
      return await apiCall(`/manual/global-assets/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Debt funds
  debtFunds: {
    getAll: async () => {
      return await apiCall('/manual/debt-funds', { method: 'GET' });
    },
    create: async (data) => {
      console.log('💳 Creating debt fund...');
      return await apiCall('/manual/debt-funds', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id, data) => {
      console.log('💳 Updating debt fund...');
      return await apiCall(`/manual/debt-funds/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      console.log('💳 Deleting debt fund...');
      return await apiCall(`/manual/debt-funds/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Retirement accounts
  retirements: {
    getAll: async () => {
      return await apiCall('/manual/retirements', { method: 'GET' });
    },
    create: async (data) => {
      console.log('🏦 Creating retirement account...');
      return await apiCall('/manual/retirements', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id, data) => {
      console.log('🏦 Updating retirement account...');
      return await apiCall(`/manual/retirements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      console.log('🏦 Deleting retirement account...');
      return await apiCall(`/manual/retirements/${id}`, {
        method: 'DELETE'
      });
    }
  }
};

// ============ PRICE SYNC ============

export const priceAPI = {
  // Sync prices manually
  syncPrices: async () => {
    console.log('🔄 Syncing prices...');
    return await apiCall('/sync/prices', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }
};

export default { authAPI, portfolioAPI, manualAPI, priceAPI };