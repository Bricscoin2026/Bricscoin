import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Network
export const getNetworkStats = () => api.get("/network/stats");

// P2P
export const getNodeInfo = () => api.get("/p2p/node/info");
export const getPeers = () => api.get("/p2p/peers");
export const registerPeer = (data) => api.post("/p2p/register", data);
export const triggerSync = () => api.post("/p2p/sync");
export const getChainInfo = () => api.get("/p2p/chain/info");

// Blocks
export const getBlocks = (limit = 20, offset = 0) => 
  api.get(`/blocks?limit=${limit}&offset=${offset}`);

export const getBlock = (index) => api.get(`/blocks/${index}`);

export const getBlockByHash = (hash) => api.get(`/blocks/hash/${hash}`);

// Transactions
export const getTransactions = (limit = 20, offset = 0, confirmed = null) => {
  let url = `/transactions?limit=${limit}&offset=${offset}`;
  if (confirmed !== null) {
    url += `&confirmed=${confirmed}`;
  }
  return api.get(url);
};

export const getTransaction = (txId) => api.get(`/transactions/${txId}`);

export const createTransaction = (data) => api.post("/transactions", data);

export const getAddressTransactions = (address, limit = 50) => 
  api.get(`/transactions/address/${address}?limit=${limit}`);

// Mining
export const getMiningTemplate = () => api.get("/mining/template");

export const submitMinedBlock = (data) => api.post("/mining/submit", data);

// Wallet
export const createWallet = (name = "My Wallet") => 
  api.post("/wallet/create", { name });

export const getWalletBalance = (address) => 
  api.get(`/wallet/${address}/balance`);

export const getWalletQR = (address) => 
  api.get(`/wallet/${address}/qr/base64`);

// Address
export const getAddressInfo = (address) => api.get(`/address/${address}`);

export default api;
