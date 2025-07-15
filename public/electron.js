const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Simple development check instead of electron-is-dev
const isDev = process.env.ELECTRON_IS_DEV === 'true' || !app.isPackaged;

let mainWindow;
let playwrightServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/robbi-icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false,
    title: 'Robbi - Greene Solutions AI Assistant'
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startPlaywrightServer();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (playwrightServer) {
      playwrightServer.kill();
    }
  });
}

function startPlaywrightServer() {
  const serverPath = path.join(__dirname, '../playwright-server.js');
  playwrightServer = spawn('node', [serverPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  playwrightServer.stdout.on('data', (data) => {
    console.log(`Playwright Server: ${data}`);
  });

  playwrightServer.stderr.on('data', (data) => {
    console.error(`Playwright Server Error: ${data}`);
  });

  playwrightServer.on('error', (error) => {
    console.error(`Failed to start Playwright server: ${error}`);
  });

  playwrightServer.on('exit', (code, signal) => {
    console.log(`Playwright server exited with code ${code} and signal ${signal}`);
  });

  // Notify renderer when server is ready
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.send('playwright-ready');
    }
  }, 5000); // Increased timeout to ensure server is fully ready
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app protocol for deep linking
app.setAsDefaultProtocolClient('robbi');