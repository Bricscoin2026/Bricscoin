import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  it: {
    // Navigation
    dashboard: "Cruscotto",
    explorer: "Esplora",
    wallet: "Portafoglio",
    mining: "Estrazione mineraria",
    network: "Rete",
    downloads: "Download",
    
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
    
    // Dashboard
    totalSupply: "Fornitura Totale",
    circulatingSupply: "In Circolazione",
    blockHeight: "Altezza Blocco",
    difficulty: "Difficoltà",
    networkHashrate: "Hashrate Rete",
    pendingTx: "Transazioni in Attesa",
    
    // Mining
    miningTitle: "Estrazione Mineraria",
    miningSubtitle: "Mina BRICS usando il tuo browser",
    minerAddress: "Indirizzo del Minatore",
    rewardsToAddress: "Le ricompense minerarie verranno inviate a questo indirizzo",
    startMining: "Avvia Estrazione",
    stopMining: "Ferma Estrazione",
    hashrate: "Hashrate",
    totalHashes: "Hash Totali",
    blocksFound: "Blocchi Trovati",
    miningInProgress: "Estrazione mineraria in corso",
    currentNonce: "Nonce Attuale",
    lastHash: "Ultimo Hash",
    target: "Target (deve iniziare con)",
    howMiningWorks: "Come Funziona l'Estrazione",
    miningRewards: "Ricompense Minerarie",
    currentReward: "Ricompensa Attuale",
    nextHalving: "Prossimo Halving",
    halvingInterval: "Intervallo Halving",
    miningWarning: "L'estrazione via browser è meno efficiente del software dedicato.",
    miningStep1: "Il tuo browser riceve un template di blocco dalla rete",
    miningStep2: "Prova diversi valori nonce, facendo hash con SHA256",
    miningStep3: "Quando un hash inizia con abbastanza zeri (difficoltà), hai vinto!",
    miningStep4: "Il blocco viene inviato e ricevi la ricompensa",
    miningStep5: "La difficoltà si aggiusta ogni 2016 blocchi per mantenere 10min/blocco",
    
    // Wallet
    walletTitle: "Portafoglio",
    walletSubtitle: "Gestisci i tuoi portafogli BRICS",
    createWallet: "Nuovo Portafoglio",
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
    seedWarning: "Queste 12 parole permettono di recuperare il tuo portafoglio. Non condividerle MAI con nessuno!",
    copySeed: "Copia Seed",
    sendBrics: "Invia BRICS",
    from: "Da",
    recipient: "Destinatario",
    amount: "Importo",
    sendTransaction: "Invia Transazione",
    receiveBrics: "Ricevi BRICS",
    scanQR: "Scansiona il QR code o copia l'indirizzo",
    transactionHistory: "Cronologia Transazioni",
    noTransactions: "Nessuna transazione",
    sent: "Inviato",
    received: "Ricevuto",
    confirmed: "Confermato",
    pending: "In attesa",
    
    // Downloads
    downloadsTitle: "Download Wallet",
    downloadsSubtitle: "Scarica il wallet BricsCoin per il tuo dispositivo",
    webWallet: "Web Wallet (PWA)",
    webWalletDesc: "Puoi usare il wallet direttamente dal browser! Su dispositivi mobili, aggiungi questa pagina alla schermata home.",
    openWebWallet: "Apri Web Wallet",
    desktopWallets: "Wallet Desktop",
    noDownloads: "Nessun download disponibile",
    installInstructions: "Istruzioni di Installazione",
    sourceCode: "Codice Sorgente",
    sourceCodeDesc: "BricsCoin è open source! Puoi visualizzare, modificare e contribuire al codice.",
    viewOnGithub: "Visualizza su GitHub",
    documentation: "Documentazione",
    
    // Network
    networkTitle: "Rete",
    networkSubtitle: "Stato della rete BricsCoin",
    connectedPeers: "Peer Connessi",
    
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
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    explorer: "Explorer",
    wallet: "Wallet",
    mining: "Mining",
    network: "Network",
    downloads: "Downloads",
    
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
    
    // Dashboard
    totalSupply: "Total Supply",
    circulatingSupply: "Circulating",
    blockHeight: "Block Height",
    difficulty: "Difficulty",
    networkHashrate: "Network Hashrate",
    pendingTx: "Pending Transactions",
    
    // Mining
    miningTitle: "Mining",
    miningSubtitle: "Mine BRICS using your browser",
    minerAddress: "Miner Address",
    rewardsToAddress: "Mining rewards will be sent to this address",
    startMining: "Start Mining",
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
    currentReward: "Current Reward",
    nextHalving: "Next Halving",
    halvingInterval: "Halving Interval",
    miningWarning: "Browser mining is less efficient than dedicated mining software.",
    miningStep1: "Your browser receives a block template from the network",
    miningStep2: "It tries different nonce values, hashing with SHA256",
    miningStep3: "When a hash starts with enough zeros (difficulty), you win!",
    miningStep4: "The block is submitted and you receive the mining reward",
    miningStep5: "Difficulty adjusts every 2016 blocks to maintain 10min blocks",
    
    // Wallet
    walletTitle: "Wallet",
    walletSubtitle: "Manage your BRICS wallets",
    createWallet: "New Wallet",
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
    seedWarning: "These 12 words allow you to recover your wallet. NEVER share them with anyone!",
    copySeed: "Copy Seed",
    sendBrics: "Send BRICS",
    from: "From",
    recipient: "Recipient",
    amount: "Amount",
    sendTransaction: "Send Transaction",
    receiveBrics: "Receive BRICS",
    scanQR: "Scan the QR code or copy the address",
    transactionHistory: "Transaction History",
    noTransactions: "No transactions",
    sent: "Sent",
    received: "Received",
    confirmed: "Confirmed",
    pending: "Pending",
    
    // Downloads
    downloadsTitle: "Download Wallet",
    downloadsSubtitle: "Download BricsCoin wallet for your device",
    webWallet: "Web Wallet (PWA)",
    webWalletDesc: "You can use the wallet directly from your browser! On mobile devices, add this page to your home screen.",
    openWebWallet: "Open Web Wallet",
    desktopWallets: "Desktop Wallets",
    noDownloads: "No downloads available",
    installInstructions: "Installation Instructions",
    sourceCode: "Source Code",
    sourceCodeDesc: "BricsCoin is open source! You can view, modify, and contribute to the code.",
    viewOnGithub: "View on GitHub",
    documentation: "Documentation",
    
    // Network
    networkTitle: "Network",
    networkSubtitle: "BricsCoin network status",
    connectedPeers: "Connected Peers",
    
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
  },
  es: {
    dashboard: "Panel",
    explorer: "Explorador",
    wallet: "Cartera",
    mining: "Minería",
    network: "Red",
    downloads: "Descargas",
    miningTitle: "Minería",
    miningSubtitle: "Mina BRICS usando tu navegador",
    startMining: "Iniciar Minería",
    stopMining: "Detener Minería",
    hashrate: "Tasa de Hash",
    difficulty: "Dificultad",
  },
  fr: {
    dashboard: "Tableau de bord",
    explorer: "Explorateur",
    wallet: "Portefeuille",
    mining: "Minage",
    network: "Réseau",
    downloads: "Téléchargements",
    miningTitle: "Minage",
    miningSubtitle: "Minez des BRICS avec votre navigateur",
    startMining: "Démarrer le Minage",
    stopMining: "Arrêter le Minage",
    hashrate: "Hashrate",
    difficulty: "Difficulté",
  },
  de: {
    dashboard: "Dashboard",
    explorer: "Explorer",
    wallet: "Wallet",
    mining: "Mining",
    network: "Netzwerk",
    downloads: "Downloads",
    miningTitle: "Mining",
    miningSubtitle: "Mine BRICS mit deinem Browser",
    startMining: "Mining Starten",
    stopMining: "Mining Stoppen",
    hashrate: "Hashrate",
    difficulty: "Schwierigkeit",
  },
  zh: {
    dashboard: "仪表板",
    explorer: "浏览器",
    wallet: "钱包",
    mining: "挖矿",
    network: "网络",
    downloads: "下载",
    miningTitle: "挖矿",
    miningSubtitle: "使用浏览器挖掘BRICS",
    startMining: "开始挖矿",
    stopMining: "停止挖矿",
    hashrate: "算力",
    difficulty: "难度",
  },
  ja: {
    dashboard: "ダッシュボード",
    explorer: "エクスプローラー",
    wallet: "ウォレット",
    mining: "マイニング",
    network: "ネットワーク",
    downloads: "ダウンロード",
    miningTitle: "マイニング",
    miningSubtitle: "ブラウザでBRICSをマイニング",
    startMining: "マイニング開始",
    stopMining: "マイニング停止",
    hashrate: "ハッシュレート",
    difficulty: "難易度",
  },
  ru: {
    dashboard: "Панель",
    explorer: "Обозреватель",
    wallet: "Кошелек",
    mining: "Майнинг",
    network: "Сеть",
    downloads: "Загрузки",
    miningTitle: "Майнинг",
    miningSubtitle: "Майните BRICS в браузере",
    startMining: "Начать майнинг",
    stopMining: "Остановить майнинг",
    hashrate: "Хешрейт",
    difficulty: "Сложность",
  },
  tr: {
    dashboard: "Panel",
    explorer: "Gezgin",
    wallet: "Cüzdan",
    mining: "Madencilik",
    network: "Ağ",
    downloads: "İndirmeler",
    miningTitle: "Madencilik",
    miningSubtitle: "Tarayıcınızla BRICS madenciliği yapın",
    startMining: "Madenciliği Başlat",
    stopMining: "Madenciliği Durdur",
    hashrate: "Hashrate",
    difficulty: "Zorluk",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('bricscoin_language');
    if (saved && translations[saved]) return saved;
    
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) return browserLang;
    
    return 'it'; // Default to Italian
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
