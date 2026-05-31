import { app, BrowserWindow } from 'electron';
import path from 'path';

// Import the background service daemon and its shutdown helper
import { shutdownServices } from './service';


let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Check if we are running in development mode
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

  if (isDev) {
    // Load Vite development server
    mainWindow.loadURL('http://localhost:5172');
    mainWindow.webContents.openDevTools();
  } else {
    // Load production HTML compiled by Vite
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let isQuitting = false;

app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    try {
      await shutdownServices();
    } catch (err) {
      console.error('Error shutting down services on quit:', err);
    }
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Respect macOS behavior: keep daemon alive if desired, or quit on desktop close
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
