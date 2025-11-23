import 'reflect-metadata';
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initializeDatabase } from '../database/config';
import { seedDatabase } from '../database/seed';
import { startApiServer } from '../api/server';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  
  console.log('Preload path:', preloadPath);
  console.log('Icon path:', iconPath);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    ...(fs.existsSync(iconPath) && { icon: iconPath }),
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();

  if (process.env.NODE_ENV === 'development') {
    console.log('Loading development URL: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading production HTML:', htmlPath);
    mainWindow.loadFile(htmlPath).catch((error) => {
      console.error('Failed to load HTML file:', error);
    });
  }

  // Log any renderer console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Renderer finished loading');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Listen for window maximize/restore events
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized');
  });
};

app.whenReady().then(async () => {
  console.log('Initializing application...');
  
  // Create window first so user can see what's happening
  console.log('Creating window...');
  createWindow();
  console.log('Window created');
  
  // Initialize database in background
  (async () => {
    try {
      console.log('Initializing database...');
      await initializeDatabase();
      console.log('Database initialized');
      
      console.log('Seeding database...');
      await seedDatabase();
      console.log('Database seeded');
    } catch (error) {
      console.error('Database initialization failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Show error to user
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
          alert('Database initialization failed. Please check the console for details.');
        `);
      }
    }
  })();
  
  // Start API server
  console.log('Starting API server...');
  startApiServer();
  console.log('API server started');
  
  // Check for updates
  checkForUpdates();
});

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

// Update manager
const checkForUpdates = (): void => {
  // Configure auto-updater
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available');
    }
  });
  
  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });
  
  autoUpdater.on('error', (error) => {
    console.error('Update error:', error);
  });
};

// IPC handlers
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('restart-app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    mainWindow.maximize();
  }
});

ipcMain.handle('restore-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.restore();
    }
  }
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

