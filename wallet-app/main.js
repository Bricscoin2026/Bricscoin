const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

// Wallet data directory
const userDataPath = app.getPath('userData');
const walletsPath = path.join(userDataPath, 'wallets.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'icons', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for wallet operations
ipcMain.handle('get-wallets', async () => {
  try {
    if (fs.existsSync(walletsPath)) {
      const data = fs.readFileSync(walletsPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading wallets:', error);
    return [];
  }
});

ipcMain.handle('save-wallets', async (event, wallets) => {
  try {
    fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving wallets:', error);
    return false;
  }
});

ipcMain.handle('export-wallet', async (event, wallet, filePath) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(wallet, null, 2));
    return true;
  } catch (error) {
    console.error('Error exporting wallet:', error);
    return false;
  }
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});
