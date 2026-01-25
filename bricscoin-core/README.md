# BricsCoin Core - Full Node Wallet

**BricsCoin Core** è il wallet desktop ufficiale per BricsCoin. Funziona come un nodo completo della rete, memorizzando l'intera blockchain localmente e contribuendo alla decentralizzazione della rete.

## Caratteristiche

- 🔐 **Wallet Sicuro**: Genera seed phrase BIP39 a 12 parole
- ⛏️ **Mining Integrato**: Mina BRICS direttamente dal wallet
- 🌐 **Full Node**: Scarica e verifica l'intera blockchain
- 🔄 **P2P Network**: Connessione automatica ai nodi della rete
- 💾 **Storage Locale**: I tuoi dati rimangono sul tuo computer

## Requisiti

- **Node.js** >= 18
- **Yarn** (consigliato) o npm
- **Python** (per compilare better-sqlite3)
- **Build Tools**:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential`

## Installazione

### 1. Estrai l'archivio

```bash
tar -xzf BricsCoin-Core-Source.tar.gz
cd bricscoin-core
```

### 2. Installa le dipendenze

```bash
yarn install
```

Questo installerà tutte le dipendenze e ricompilerà automaticamente `better-sqlite3` per Electron.

### 3. Avvia l'applicazione

```bash
yarn start
```

## Utilizzo

### Crea un Nuovo Wallet
1. Vai nella sezione **Wallet**
2. Clicca **Nuovo Wallet**
3. **SALVA LE 12 PAROLE** - Sono l'unico modo per recuperare i tuoi fondi!

### Importa un Wallet Esistente
1. Vai nella sezione **Wallet**
2. Clicca **Importa**
3. Inserisci le 12 parole della seed phrase

### Mining
1. Vai nella sezione **Mining**
2. Seleziona un wallet per ricevere le ricompense
3. Clicca **Avvia Mining**

### Sincronizzazione
La blockchain si sincronizza automaticamente all'avvio. Puoi forzare una sincronizzazione dal menu **Blockchain > Sincronizza**.

## Build Eseguibili

Per creare pacchetti installabili:

```bash
# Windows
yarn build:win

# macOS  
yarn build:mac

# Linux
yarn build:linux
```

I file saranno creati nella cartella `dist/`.

## Struttura File

```
bricscoin-core/
├── main.js          # Processo principale Electron
├── preload.js       # Script preload (bridge sicuro)
├── index.html       # Interfaccia utente
├── src/
│   └── blockchain.js # Logica blockchain e wallet
├── icons/           # Icone applicazione
└── package.json     # Configurazione
```

## Seed Nodes

BricsCoin Core si connette automaticamente ai seguenti nodi:

- `https://bricscoin26.org` (Nodo principale)

Puoi aggiungere altri nodi dalla sezione **Rete**.

## Supporto

- **Sito Web**: https://bricscoin26.org
- **Guida Nodo**: https://bricscoin26.org/node

## Licenza

MIT License - Codice open source
