import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  it: {
    // Navigation
    dashboard: "Cruscotto",
    explorer: "Esplora",
    wallet: "Portafoglio",
    mining: "Estrazione",
    network: "Rete",
    downloads: "Download",
    runNode: "Esegui Nodo",
    
    // Common
    loading: "Caricamento...",
    error: "Errore",
    success: "Successo",
    cancel: "Annulla",
    confirm: "Conferma",
    save: "Salva",
    copy: "Copia",
    copied: "Copiato!",
    refresh: "Aggiorna",
    viewAll: "Vedi Tutto",
    
    // Dashboard
    heroTitle: "BRICSCOIN",
    heroSubtitle: "Criptovaluta decentralizzata basata su Proof-of-Work SHA256. Unisciti alla rete di mining globale.",
    startMining: "Inizia Mining",
    createWallet: "Crea Portafoglio",
    circulatingSupply: "In Circolazione",
    ofMax: "di {max} max",
    totalBlocks: "Blocchi Totali",
    difficulty: "Difficoltà",
    pendingTransactions: "Transazioni in Attesa",
    inMempool: "In mempool",
    blockReward: "Ricompensa Blocco",
    nextHalving: "Prossimo halving: Blocco",
    recentBlocks: "Blocchi Recenti",
    noBlocksYet: "Nessun blocco minato. Sii il primo a minare!",
    halvingSchedule: "Programma Halving",
    currentReward: "Ricompensa Attuale",
    blocksUntilHalving: "Blocchi al Prossimo Halving",
    halvingInterval: "Intervallo Halving",
    miningInfo: "Info Mining",
    algorithm: "Algoritmo",
    currentDifficulty: "Difficoltà Attuale",
    targetBlockTime: "Tempo Target Blocco",
    minutes: "minuti",
    
    // Mining
    miningTitle: "Estrazione",
    miningSubtitle: "Mina BRICS usando il tuo browser",
    minerAddress: "Indirizzo Minatore",
    rewardsToAddress: "Le ricompense saranno inviate a questo indirizzo",
    stopMining: "Ferma Mining",
    hashrate: "Hashrate",
    totalHashes: "Hash Totali",
    blocksFound: "Blocchi Trovati",
    miningInProgress: "Mining in Corso",
    currentNonce: "Nonce Attuale",
    lastHash: "Ultimo Hash",
    target: "Target (deve iniziare con)",
    howMiningWorks: "Come Funziona il Mining",
    miningRewards: "Ricompense Mining",
    miningWarning: "Il mining via browser è meno efficiente del software dedicato.",
    miningStep1: "Il browser riceve un template di blocco dalla rete",
    miningStep2: "Prova diversi valori nonce, facendo hash SHA256",
    miningStep3: "Quando un hash inizia con abbastanza zeri, hai vinto!",
    miningStep4: "Il blocco viene inviato e ricevi la ricompensa",
    miningStep5: "La difficoltà si regola ogni 2016 blocchi",
    
    // Stratum
    stratumTitle: "Mining con Hardware (ASIC)",
    stratumSubtitle: "Connetti NerdMiner, Bitaxe o altri ASIC",
    stratumConfig: "Configurazione Stratum",
    stratumPool: "Pool",
    stratumPort: "Porta",
    stratumUser: "Utente",
    stratumPass: "Password",
    stratumNote: "Nota: Usa l'IP diretto per Stratum, non il dominio (Cloudflare non supporta la porta 3333)",
    copyConfig: "Copia Configurazione",
    
    // Wallet
    walletTitle: "Portafoglio",
    walletSubtitle: "Gestisci i tuoi portafogli BRICS",
    newWallet: "Nuovo Portafoglio",
    importWallet: "Importa Portafoglio",
    noWallets: "Nessun Portafoglio",
    noWalletsDesc: "Crea un nuovo portafoglio o importane uno esistente",
    yourWallets: "I Tuoi Portafogli",
    send: "Invia",
    receive: "Ricevi",
    export: "Esporta",
    address: "Indirizzo",
    balance: "Saldo",
    seedPhrase: "Seed Phrase",
    showSeedPhrase: "Mostra Seed Phrase",
    seedWarning: "Queste 12 parole permettono di recuperare il portafoglio. Non condividerle MAI!",
    copySeed: "Copia Seed",
    sendBrics: "Invia BRICS",
    from: "Da",
    recipient: "Destinatario",
    amount: "Importo",
    sendTransaction: "Invia Transazione",
    receiveBrics: "Ricevi BRICS",
    scanQR: "Scansiona il QR o copia l'indirizzo",
    transactionHistory: "Cronologia Transazioni",
    noTransactions: "Nessuna transazione",
    sent: "Inviato",
    received: "Ricevuto",
    confirmed: "Confermato",
    pending: "In attesa",
    to: "A",
    
    // Downloads
    downloadsTitle: "Scarica Wallet",
    downloadsSubtitle: "Scarica il wallet BricsCoin per il tuo dispositivo",
    webWallet: "Web Wallet (PWA)",
    webWalletDesc: "Usa il wallet dal browser! Su mobile, aggiungi alla schermata home.",
    openWebWallet: "Apri Web Wallet",
    desktopWallets: "Wallet Desktop",
    noDownloads: "Nessun download disponibile",
    installInstructions: "Istruzioni Installazione",
    sourceCode: "Codice Sorgente",
    sourceCodeDesc: "BricsCoin è open source! Puoi vedere e contribuire al codice.",
    viewOnGithub: "Vedi su GitHub",
    documentation: "Documentazione",
    
    // Explorer
    explorerTitle: "Esplora",
    explorerSubtitle: "Esplora la blockchain BricsCoin",
    searchPlaceholder: "Cerca blocco, transazione o indirizzo...",
    latestBlocks: "Ultimi Blocchi",
    block: "Blocco",
    hash: "Hash",
    transactions: "Transazioni",
    miner: "Minatore",
    time: "Tempo",
    txs: "tx",
    
    // Network
    networkTitle: "Rete",
    networkSubtitle: "Stato della rete BricsCoin",
    connectedPeers: "Peer Connessi",
    networkStats: "Statistiche Rete",
    totalSupply: "Fornitura Totale",
    maxSupply: "Fornitura Massima",
    
    // Block Detail
    blockDetail: "Dettaglio Blocco",
    blockHash: "Hash Blocco",
    previousHash: "Hash Precedente",
    nonce: "Nonce",
    blockTransactions: "Transazioni nel Blocco",
    noTransactionsInBlock: "Nessuna transazione in questo blocco",
    
    // Transaction Detail
    transactionDetail: "Dettaglio Transazione",
    transactionId: "ID Transazione",
    sender: "Mittente",
    status: "Stato",
    confirmedInBlock: "Confermato nel blocco",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    explorer: "Explorer",
    wallet: "Wallet",
    mining: "Mining",
    network: "Network",
    downloads: "Downloads",
    runNode: "Run Node",
    
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    copy: "Copy",
    copied: "Copied!",
    refresh: "Refresh",
    viewAll: "View All",
    
    // Dashboard
    heroTitle: "BRICSCOIN",
    heroSubtitle: "Decentralized cryptocurrency powered by SHA256 Proof-of-Work. Join the global mining network today.",
    startMining: "Start Mining",
    createWallet: "Create Wallet",
    circulatingSupply: "Circulating Supply",
    ofMax: "of {max} max",
    totalBlocks: "Total Blocks",
    difficulty: "Difficulty",
    pendingTransactions: "Pending Transactions",
    inMempool: "In mempool",
    blockReward: "Block Reward",
    nextHalving: "Next halving: Block",
    recentBlocks: "Recent Blocks",
    noBlocksYet: "No blocks mined yet. Be the first to mine!",
    halvingSchedule: "Halving Schedule",
    currentReward: "Current Reward",
    blocksUntilHalving: "Blocks Until Halving",
    halvingInterval: "Halving Interval",
    miningInfo: "Mining Info",
    algorithm: "Algorithm",
    currentDifficulty: "Current Difficulty",
    targetBlockTime: "Target Block Time",
    minutes: "minutes",
    
    // Mining
    miningTitle: "Mining",
    miningSubtitle: "Mine BRICS using your browser",
    minerAddress: "Miner Address",
    rewardsToAddress: "Mining rewards will be sent to this address",
    stopMining: "Stop Mining",
    hashrate: "Hashrate",
    totalHashes: "Total Hashes",
    blocksFound: "Blocks Found",
    miningInProgress: "Mining in Progress",
    currentNonce: "Current Nonce",
    lastHash: "Last Hash",
    target: "Target (must start with)",
    howMiningWorks: "How Mining Works",
    miningRewards: "Mining Rewards",
    miningWarning: "Browser mining is less efficient than dedicated software.",
    miningStep1: "Your browser receives a block template from the network",
    miningStep2: "It tries different nonce values, hashing with SHA256",
    miningStep3: "When a hash starts with enough zeros, you win!",
    miningStep4: "The block is submitted and you receive the reward",
    miningStep5: "Difficulty adjusts every 2016 blocks",
    
    // Stratum
    stratumTitle: "Hardware Mining (ASIC)",
    stratumSubtitle: "Connect NerdMiner, Bitaxe or other ASICs",
    stratumConfig: "Stratum Configuration",
    stratumPool: "Pool",
    stratumPort: "Port",
    stratumUser: "User",
    stratumPass: "Password",
    stratumNote: "Note: Use direct IP for Stratum, not domain (Cloudflare doesn't support port 3333)",
    copyConfig: "Copy Configuration",
    
    // Wallet
    walletTitle: "Wallet",
    walletSubtitle: "Manage your BRICS wallets",
    newWallet: "New Wallet",
    importWallet: "Import Wallet",
    noWallets: "No Wallets",
    noWalletsDesc: "Create a new wallet or import an existing one",
    yourWallets: "Your Wallets",
    send: "Send",
    receive: "Receive",
    export: "Export",
    address: "Address",
    balance: "Balance",
    seedPhrase: "Seed Phrase",
    showSeedPhrase: "Show Seed Phrase",
    seedWarning: "These 12 words allow you to recover your wallet. NEVER share them!",
    copySeed: "Copy Seed",
    sendBrics: "Send BRICS",
    from: "From",
    recipient: "Recipient",
    amount: "Amount",
    sendTransaction: "Send Transaction",
    receiveBrics: "Receive BRICS",
    scanQR: "Scan QR or copy address",
    transactionHistory: "Transaction History",
    noTransactions: "No transactions",
    sent: "Sent",
    received: "Received",
    confirmed: "Confirmed",
    pending: "Pending",
    to: "To",
    
    // Downloads
    downloadsTitle: "Download Wallet",
    downloadsSubtitle: "Download BricsCoin wallet for your device",
    webWallet: "Web Wallet (PWA)",
    webWalletDesc: "Use wallet from browser! On mobile, add to home screen.",
    openWebWallet: "Open Web Wallet",
    desktopWallets: "Desktop Wallets",
    noDownloads: "No downloads available",
    installInstructions: "Install Instructions",
    sourceCode: "Source Code",
    sourceCodeDesc: "BricsCoin is open source! You can view and contribute.",
    viewOnGithub: "View on GitHub",
    documentation: "Documentation",
    
    // Explorer
    explorerTitle: "Explorer",
    explorerSubtitle: "Explore the BricsCoin blockchain",
    searchPlaceholder: "Search block, transaction or address...",
    latestBlocks: "Latest Blocks",
    block: "Block",
    hash: "Hash",
    transactions: "Transactions",
    miner: "Miner",
    time: "Time",
    txs: "txs",
    
    // Network
    networkTitle: "Network",
    networkSubtitle: "BricsCoin network status",
    connectedPeers: "Connected Peers",
    networkStats: "Network Stats",
    totalSupply: "Total Supply",
    maxSupply: "Max Supply",
    
    // Block Detail
    blockDetail: "Block Detail",
    blockHash: "Block Hash",
    previousHash: "Previous Hash",
    nonce: "Nonce",
    blockTransactions: "Block Transactions",
    noTransactionsInBlock: "No transactions in this block",
    
    // Transaction Detail
    transactionDetail: "Transaction Detail",
    transactionId: "Transaction ID",
    sender: "Sender",
    status: "Status",
    confirmedInBlock: "Confirmed in block",
  },
  es: {
    dashboard: "Panel", explorer: "Explorador", wallet: "Cartera", mining: "Minería",
    network: "Red", downloads: "Descargas", runNode: "Ejecutar Nodo",
    heroTitle: "BRICSCOIN", startMining: "Iniciar Minería", createWallet: "Crear Cartera",
    circulatingSupply: "En Circulación", totalBlocks: "Bloques Totales",
    recentBlocks: "Bloques Recientes", miningTitle: "Minería", walletTitle: "Cartera",
    send: "Enviar", receive: "Recibir", noWallets: "Sin Carteras",
  },
  fr: {
    dashboard: "Tableau de bord", explorer: "Explorateur", wallet: "Portefeuille", mining: "Minage",
    network: "Réseau", downloads: "Téléchargements", runNode: "Exécuter Nœud",
    heroTitle: "BRICSCOIN", startMining: "Démarrer Minage", createWallet: "Créer Portefeuille",
    circulatingSupply: "En Circulation", totalBlocks: "Blocs Totaux",
    recentBlocks: "Blocs Récents", miningTitle: "Minage", walletTitle: "Portefeuille",
    send: "Envoyer", receive: "Recevoir", noWallets: "Pas de Portefeuilles",
  },
  de: {
    dashboard: "Dashboard", explorer: "Explorer", wallet: "Wallet", mining: "Mining",
    network: "Netzwerk", downloads: "Downloads", runNode: "Node Starten",
    heroTitle: "BRICSCOIN", startMining: "Mining Starten", createWallet: "Wallet Erstellen",
    circulatingSupply: "Im Umlauf", totalBlocks: "Gesamtblöcke",
    recentBlocks: "Neueste Blöcke", miningTitle: "Mining", walletTitle: "Wallet",
    send: "Senden", receive: "Empfangen", noWallets: "Keine Wallets",
  },
  zh: {
    dashboard: "仪表板", explorer: "浏览器", wallet: "钱包", mining: "挖矿",
    network: "网络", downloads: "下载", runNode: "运行节点",
    heroTitle: "BRICSCOIN", startMining: "开始挖矿", createWallet: "创建钱包",
    circulatingSupply: "流通量", totalBlocks: "总区块",
    recentBlocks: "最新区块", miningTitle: "挖矿", walletTitle: "钱包",
    send: "发送", receive: "接收", noWallets: "没有钱包",
  },
  ja: {
    dashboard: "ダッシュボード", explorer: "エクスプローラー", wallet: "ウォレット", mining: "マイニング",
    network: "ネットワーク", downloads: "ダウンロード", runNode: "ノード実行",
    heroTitle: "BRICSCOIN", startMining: "マイニング開始", createWallet: "ウォレット作成",
    circulatingSupply: "流通量", totalBlocks: "総ブロック",
    recentBlocks: "最新ブロック", miningTitle: "マイニング", walletTitle: "ウォレット",
    send: "送信", receive: "受信", noWallets: "ウォレットなし",
  },
  ru: {
    dashboard: "Панель", explorer: "Обозреватель", wallet: "Кошелек", mining: "Майнинг",
    network: "Сеть", downloads: "Загрузки", runNode: "Запустить Узел",
    heroTitle: "BRICSCOIN", startMining: "Начать Майнинг", createWallet: "Создать Кошелек",
    circulatingSupply: "В Обращении", totalBlocks: "Всего Блоков",
    recentBlocks: "Последние Блоки", miningTitle: "Майнинг", walletTitle: "Кошелек",
    send: "Отправить", receive: "Получить", noWallets: "Нет Кошельков",
  },
  tr: {
    dashboard: "Panel", explorer: "Gezgin", wallet: "Cüzdan", mining: "Madencilik",
    network: "Ağ", downloads: "İndirmeler", runNode: "Düğüm Çalıştır",
    heroTitle: "BRICSCOIN", startMining: "Madenciliği Başlat", createWallet: "Cüzdan Oluştur",
    circulatingSupply: "Dolaşımda", totalBlocks: "Toplam Blok",
    recentBlocks: "Son Bloklar", miningTitle: "Madencilik", walletTitle: "Cüzdan",
    send: "Gönder", receive: "Al", noWallets: "Cüzdan Yok",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('bricscoin_language');
    if (saved && translations[saved]) return saved;
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) return browserLang;
    return 'it';
  });

  useEffect(() => {
    localStorage.setItem('bricscoin_language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const availableLanguages = [
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  ];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
