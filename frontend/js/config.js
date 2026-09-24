const APP_CONFIG = {
  
  API_BASE_URL:
    localStorage.getItem("fraud_api_base_url") || "http://127.0.0.1:8000",
  ENDPOINTS: {
    HEALTH: "/",
    PREDICT: "/predict",
    QUEUE: "/queue",
    EXPLANATION: "/explanation",
    DASHBOARD: "/dashboard",
  },

  
  STORAGE_KEYS: {
    THEME: "fraud_triage_theme",
    THRESHOLDS: "fraud_triage_thresholds",
    API_URL: "fraud_api_base_url",
    TRIAGE_ACTIONS: "fraud_triage_actions_log",
    SIMULATION_MODE: "fraud_simulation_mode",
  },

  
  DEFAULT_THRESHOLDS: {
    critical: 0.85,
    high: 0.7,
    medium: 0.5,
    low: 0.2,
    minExpectedLossFlag: 10000,
  },

  // Color Palette Tokens
  COLORS: {
    primary: "#0F172A",
    secondary: "#1E293B",
    accent: "#0EA5E9",
    accentHover: "#0284C7",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    bgLight: "#F8FAFC",
    bgDark: "#0B0F17",
    borderLight: "#E2E8F0",
    borderDark: "#26334D",
    textMuted: "#64748B",
  },

  // Transaction Types Map (from training encoder)
  TRANSACTION_TYPES: {
    0: "CASH_IN",
    1: "CASH_OUT",
    2: "DEBIT",
    3: "PAYMENT",
    4: "TRANSFER",
  },

  TRANSACTION_TYPES_REVERSE: {
    CASH_IN: 0,
    CASH_OUT: 1,
    DEBIT: 2,
    PAYMENT: 3,
    TRANSFER: 4,
  },
};

// Helper to format currency
function formatCurrency(amount, currency = "USD") {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Helper to format percentage
function formatPercent(value, decimals = 1) {
  if (value === undefined || value === null || isNaN(value)) return "0.0%";
  return (value * 100).toFixed(decimals) + "%";
}

// Helper to format numbers with commas
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}
