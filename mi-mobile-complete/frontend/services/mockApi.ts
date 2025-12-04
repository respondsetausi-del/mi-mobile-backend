// Mock API Service - For Standalone APK Demo
// This provides fake responses without needing a backend server

console.log('🎭 Mock API module loaded');

export const MOCK_MODE = false; // Set to false to use real backend

// Mock User Data
export const MOCK_USER = {
  id: "mock-user-123",
  email: "demo@user.com",
  name: "Demo User",
  user_type: "user",
  status: "active",
  payment_status: "paid",
  mentor_id: "MENTOR0001",
};

// Mock EAs (Signal Monitors) - Dynamic signals that change over time
export const MOCK_EAS = [
  {
    id: "ea-001",
    name: "EUR/USD RSI Monitor",
    status: "running",
    current_signal: "BUY",
    config: {
      symbol: "EUR/USD",
      timeframe: "15m",
      indicator: "RSI",
    },
    last_price: 1.0845,
    created_at: new Date().toISOString(),
    last_signal_change: Date.now(),
  },
  {
    id: "ea-002",
    name: "GBP/USD Trend Monitor",
    status: "running",
    current_signal: "SELL",
    config: {
      symbol: "GBP/USD",
      timeframe: "1h",
      indicator: "MA Crossover",
    },
    last_price: 1.2634,
    created_at: new Date().toISOString(),
    last_signal_change: Date.now(),
  },
];

// Function to randomly change signals (simulates real signal updates)
export const changeSignalRandomly = () => {
  MOCK_EAS.forEach(ea => {
    const timeSinceLastChange = Date.now() - (ea.last_signal_change || 0);
    
    // Change signal every 45-60 seconds
    if (timeSinceLastChange > 45000 + Math.random() * 15000) {
      const signals = ['BUY', 'SELL', 'NEUTRAL'];
      const currentIndex = signals.indexOf(ea.current_signal);
      // Pick a different signal
      const newSignals = signals.filter((_, i) => i !== currentIndex);
      ea.current_signal = newSignals[Math.floor(Math.random() * newSignals.length)] as any;
      ea.last_price = ea.last_price + (Math.random() - 0.5) * 0.01; // Slight price change
      ea.last_signal_change = Date.now();
      console.log(`🎭 MOCK: ${ea.name} signal changed to ${ea.current_signal}`);
    }
  });
};

// Mock Signals
export const MOCK_SIGNALS = [
  {
    id: "signal-001",
    signal_type: "BUY",
    symbol: "EUR/USD",
    indicator: "RSI",
    candle_pattern: "Bullish Engulfing",
    timeframe: "15m",
    notes: "Strong uptrend detected",
    created_at: new Date(Date.now() - 300000).toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    status: "active",
  },
  {
    id: "signal-002",
    signal_type: "SELL",
    symbol: "GBP/USD",
    indicator: "MA Crossover",
    candle_pattern: "Bearish Pattern",
    timeframe: "1h",
    notes: "Downtrend confirmation",
    created_at: new Date(Date.now() - 600000).toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    status: "active",
  },
];

// Mock Quotes
export const MOCK_QUOTES = [
  { symbol: "EUR/USD", price: 1.0845, bid: 1.0844, ask: 1.0846, change: 0.15 },
  { symbol: "GBP/USD", price: 1.2634, bid: 1.2633, ask: 1.2635, change: -0.23 },
  { symbol: "USD/JPY", price: 149.85, bid: 149.84, ask: 149.86, change: 0.42 },
  { symbol: "AUD/USD", price: 0.6523, bid: 0.6522, ask: 0.6524, change: 0.08 },
  { symbol: "USD/CAD", price: 1.3945, bid: 1.3944, ask: 1.3946, change: -0.12 },
  { symbol: "NZD/USD", price: 0.5892, bid: 0.5891, ask: 0.5893, change: 0.18 },
  { symbol: "USD/CHF", price: 0.8834, bid: 0.8833, ask: 0.8835, change: 0.05 },
  { symbol: "EUR/GBP", price: 0.8588, bid: 0.8587, ask: 0.8589, change: -0.09 },
];

// Mock News Alerts
export const MOCK_NEWS = [
  {
    id: "news-001",
    title: "USD Interest Rate Decision",
    event_time: new Date(Date.now() + 7200000).toISOString(),
    currency: "USD",
    impact: "high",
    description: "Federal Reserve interest rate announcement",
    minutes_until: 120,
  },
];

// Mock API Responses
export const mockApi = {
  // Login - Always succeeds
  login: async (email: string, password: string) => {
    console.log('🎭 MOCK LOGIN:', email);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    return {
      access_token: "mock-token-" + Date.now(),
      token_type: "bearer",
      user: MOCK_USER,
      user_type: MOCK_USER.user_type,
      user_id: MOCK_USER.id,
      status: MOCK_USER.status,
      payment_status: MOCK_USER.payment_status,
      requires_payment: false,
      requires_password_change: false,
    };
  },

  // Get EAs
  getEAs: async () => {
    console.log('🎭 MOCK GET EAs');
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_EAS;
  },

  // Get Latest Signal
  getLatestSignal: async () => {
    console.log('🎭 MOCK GET Latest Signal');
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_SIGNALS[0];
  },

  // Get Quotes
  getQuotes: async () => {
    console.log('🎭 MOCK GET Quotes');
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_QUOTES;
  },

  // Get News Alerts
  getNewsAlerts: async () => {
    console.log('🎭 MOCK GET News Alerts');
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_NEWS;
  },

  // Get Mentor Info
  getMentorInfo: async () => {
    console.log('🎭 MOCK GET Mentor Info');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      system_name: "Signal Master Pro",
      background_image: "", // Empty for now
    };
  },

  // Get Custom Indicators (empty for now)
  getCustomIndicators: async () => {
    console.log('🎭 MOCK GET Custom Indicators');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      indicators: [],
      selected_indicator_id: null,
    };
  },

  // Create EA
  createEA: async (name: string, symbol: string, timeframe: string, indicator: string) => {
    console.log('🎭 MOCK CREATE EA:', name);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newEA = {
      id: "ea-" + Date.now(),
      name,
      status: "running",
      current_signal: "NEUTRAL",
      config: { symbol, timeframe, indicator },
      last_price: 0,
      created_at: new Date().toISOString(),
    };
    MOCK_EAS.push(newEA);
    return newEA;
  },

  // Update EA Status
  updateEAStatus: async (eaId: string, status: string) => {
    console.log('🎭 MOCK UPDATE EA Status:', eaId, status);
    await new Promise(resolve => setTimeout(resolve, 500));
    const ea = MOCK_EAS.find(e => e.id === eaId);
    if (ea) {
      ea.status = status;
    }
    return { success: true };
  },

  // Delete EA
  deleteEA: async (eaId: string) => {
    console.log('🎭 MOCK DELETE EA:', eaId);
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_EAS.findIndex(e => e.id === eaId);
    if (index > -1) {
      MOCK_EAS.splice(index, 1);
    }
    return { success: true };
  },

  // Select Indicator (no-op in mock)
  selectIndicator: async (indicatorId: string) => {
    console.log('🎭 MOCK SELECT Indicator:', indicatorId);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
};
