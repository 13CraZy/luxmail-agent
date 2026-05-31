import { app, BrowserWindow } from 'electron';
import path from 'path';

// Import the background service daemon to boot it up inside Electron
import './service';

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
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Load Vite development server
    mainWindow.loadURL('http://localhost:5172');
    mainWindow.webContents.openDevTools();
  } else {
    // Load production HTML compiled by Vite
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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

app.on('window-all-closed', () => {
  // Respect macOS behavior: keep daemon alive if desired, or quit on desktop close
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
