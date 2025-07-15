const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === 'true' || !app.isPackaged;

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Robbi - Smart AI Assistant',
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  let startUrl;
  if (isDev) {
    startUrl = 'http://localhost:3000';
  } else {
    // Try different possible paths for the build folder
    const possiblePaths = [
      path.join(__dirname, '../../build/index.html'),
      path.join(__dirname, '../build/index.html'),
      path.join(process.resourcesPath, 'app.asar/build/index.html'),
      path.join(process.resourcesPath, 'app/build/index.html'),
      path.join(process.resourcesPath, 'build/index.html'),
      path.join(__dirname, '../../../build/index.html')
    ];
    
    let buildPath = null;
    for (const testPath of possiblePaths) {
      console.log('Testing path:', testPath);
      try {
        if (require('fs').existsSync(testPath)) {
          buildPath = testPath;
          console.log('Found build at:', buildPath);
          break;
        }
      } catch (error) {
        console.log('Error checking path:', testPath, error.message);
      }
    }
    
    if (buildPath) {
      startUrl = `file://${buildPath}`;
    } else {
      console.error('Could not find build/index.html in any expected location');
      console.log('__dirname:', __dirname);
      console.log('process.resourcesPath:', process.resourcesPath);
      console.log('app.getAppPath():', app.getAppPath());
      
      // Fallback to a more reliable path
      const fallbackPath = path.join(app.getAppPath(), 'build/index.html');
      console.log('Trying fallback path:', fallbackPath);
      startUrl = `file://${fallbackPath}`;
    }
  }
  
  console.log('isDev:', isDev);
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('Final Loading URL:', startUrl);
  
  console.log('Loading URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    console.error('Attempted URL:', startUrl);
  });

  // Add more debugging events
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('Started loading...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Finished loading successfully');
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM is ready');
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    
    // Always open DevTools to debug loading issues
    mainWindow.webContents.openDevTools();
  });

  // Add timeout to show window if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Forcing window to show after timeout');
      mainWindow.show();
      mainWindow.webContents.openDevTools();
    }
  }, 5000);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Robbi',
      submenu: [
        {
          label: 'About Robbi',
          click: () => {
            // Show about dialog
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // Open preferences
          }
        },
        { type: 'separator' },
        {
          label: 'Hide Robbi',
          accelerator: 'CmdOrCtrl+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'CmdOrCtrl+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit Robbi',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Robbi',
          click: () => {
            // Show about dialog
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event listeners
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

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return 'Robbi - Smart AI Assistant';
});