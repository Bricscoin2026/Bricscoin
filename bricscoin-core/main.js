const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const SITE_URL = 'https://bricscoin26.org';
let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 480,
    height: 820,
    minWidth: 400,
    minHeight: 600,
    title: 'BricsCoin Wallet',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset'
  });

  // Load wallet page
  win.loadURL(SITE_URL + '/wallet');

  // Inject CSS to hide navbar and show only wallet content
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      /* Hide site navbar */
      nav, header, [class*="navbar"], [class*="Navbar"],
      [class*="nav-"], [class*="header"] {
        display: none !important;
      }
      /* Hide footer */
      footer, [class*="footer"] {
        display: none !important;
      }
      /* Remove top padding that navbar would have occupied */
      body, #root, main, [class*="main"] {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
      /* Make wallet content full height */
      #root > div {
        padding-top: 8px !important;
      }
    `);
  });

  // Keep URL within wallet - prevent navigation to other pages
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('/wallet') && !url.startsWith(SITE_URL + '/wallet')) {
      event.preventDefault();
    }
  });

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimal menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'BricsCoin Wallet',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win.reload() },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
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
