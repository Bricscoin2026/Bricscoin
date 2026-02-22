import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("exchange_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auth
export const exchangeRegister = (username, email, password) =>
  axios.post(`${API}/api/exchange/register`, { username, email, password });

export const exchangeLogin = (email, password, totp_code) =>
  axios.post(`${API}/api/exchange/login`, { email, password, totp_code });

// Wallet
export const getExchangeWallet = () =>
  axios.get(`${API}/api/exchange/wallet`, { headers: getAuthHeaders() });

// Market Data
export const getTicker = () =>
  axios.get(`${API}/api/exchange/ticker`);

export const getOrderbook = () =>
  axios.get(`${API}/api/exchange/orderbook`);

export const getRecentTrades = (limit = 50) =>
  axios.get(`${API}/api/exchange/trades?limit=${limit}`);

export const getCandles = (interval = "1h", limit = 100) =>
  axios.get(`${API}/api/exchange/candles?interval=${interval}&limit=${limit}`);

// Orders
export const placeOrder = (side, order_type, amount, price) =>
  axios.post(`${API}/api/exchange/order`, { side, order_type, amount, price }, { headers: getAuthHeaders() });

export const getOpenOrders = () =>
  axios.get(`${API}/api/exchange/orders/open`, { headers: getAuthHeaders() });

export const getOrderHistory = () =>
  axios.get(`${API}/api/exchange/orders/history`, { headers: getAuthHeaders() });

export const cancelOrder = (orderId) =>
  axios.delete(`${API}/api/exchange/order/${orderId}`, { headers: getAuthHeaders() });

// Deposits & Withdrawals
export const getUsdtDepositAddress = () =>
  axios.get(`${API}/api/exchange/deposit/usdt`, { headers: getAuthHeaders() });

export const getBricsDepositAddress = () =>
  axios.get(`${API}/api/exchange/deposit/brics`, { headers: getAuthHeaders() });

export const withdrawUsdt = (amount, address) =>
  axios.post(`${API}/api/exchange/withdraw/usdt`, { currency: "usdt", amount, address }, { headers: getAuthHeaders() });

export const withdrawBrics = (amount, address) =>
  axios.post(`${API}/api/exchange/withdraw/brics`, { currency: "brics", amount, address }, { headers: getAuthHeaders() });

export const getDeposits = () =>
  axios.get(`${API}/api/exchange/wallet/deposits`, { headers: getAuthHeaders() });

export const getWithdrawals = () =>
  axios.get(`${API}/api/exchange/wallet/withdrawals`, { headers: getAuthHeaders() });

// 2FA
export const get2FAStatus = () =>
  axios.get(`${API}/api/exchange/2fa/status`, { headers: getAuthHeaders() });

export const setup2FA = () =>
  axios.post(`${API}/api/exchange/2fa/setup`, {}, { headers: getAuthHeaders() });

export const enable2FA = (totp_code) =>
  axios.post(`${API}/api/exchange/2fa/enable`, { totp_code }, { headers: getAuthHeaders() });

export const disable2FA = (totp_code, password) =>
  axios.post(`${API}/api/exchange/2fa/disable`, { totp_code, password }, { headers: getAuthHeaders() });
