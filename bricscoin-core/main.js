const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const SITE_URL = 'https://bricscoin26.org';
let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'BricsCoin Core',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true
  });

  // Load the wallet page directly
  win.loadURL(SITE_URL + '/wallet');

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(SITE_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Navigation menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'BricsCoin',
      submenu: [
        { label: 'Dashboard', click: () => win.loadURL(SITE_URL + '/') },
        { label: 'Wallet', click: () => win.loadURL(SITE_URL + '/wallet') },
        { label: 'Blockchain', click: () => win.loadURL(SITE_URL + '/blockchain') },
        { label: 'Mining', click: () => win.loadURL(SITE_URL + '/mining') },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win.reload() },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  // Handle connection errors
  win.webContents.on('did-fail-load', () => {
    win.loadFile('offline.html');
  });
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    app.emit('ready');
  }
});
