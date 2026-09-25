/**
 * Explainable AI Fraud Triage System - Global Configuration
 * Exact Color Tokens Matching ReactBits / Linear Philosophy
 */
const APP_CONFIG = {
  // API Configuration
  API_BASE_URL:
    localStorage.getItem("fraud_api_base_url") || "http://127.0.0.1:8000",
  ENDPOINTS: {
    HEALTH: "/",
    PREDICT: "/predict",
    QUEUE: "/queue",
    EXPLANATION: "/explanation",
    DASHBOARD: "/dashboard",
  },

  // Storage Keys
  STORAGE_KEYS: {
    THEME: "fraud_triage_theme",
    THRESHOLDS: "fraud_triage_thresholds",
    API_URL: "fraud_api_base_url",
    TRIAGE_ACTIONS: "fraud_triage_actions_log",
    SIMULATION_MODE: "fraud_simulation_mode",
  },

  // Default Risk Thresholds
  DEFAULT_THRESHOLDS: {
    critical: 0.85,
    high: 0.7,
    medium: 0.4,
    low: 0.2,
    minExpectedLossFlag: 10000,
  },

  // Exact Color Tokens
  COLORS: {
    bgMain: "#09090B",
    bgSecondary: "#0F0F14",
    bgPanel: "#121218",
    bgCard: "#14141C",
    bgSidebar: "#0D1020",
    border: "rgba(255, 255, 255, 0.08)",
    borderCard: "rgba(255, 255, 255, 0.06)",
    divider: "rgba(255, 255, 255, 0.05)",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    textDisabled: "#52525B",
    textSidebar: "#E4E4E7",
    accentPrimary: "#8B5CF6",
    accentHover: "#A78BFA",
    accentGlow: "rgba(139, 92, 246, 0.18)",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
  },

  // Transaction Types Map
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
