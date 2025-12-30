// main.js
const { app, BrowserWindow, session, dialog, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let splash;

// permissions storage path
const PERMS_FILE = path.join(app.getPath('userData'), 'permissions.json');

function loadPermissions() {
  try {
    if (fs.existsSync(PERMS_FILE)) {
      const raw = fs.readFileSync(PERMS_FILE, 'utf8');
      return JSON.parse(raw || '{}');
    }
  } catch (e) {
    console.warn('Could not read permissions file', e);
  }
  return {};
}

function savePermissions(obj) {
  try {
    fs.writeFileSync(PERMS_FILE, JSON.stringify(obj || {}, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write permissions file', e);
  }
}

let storedPerms = loadPermissions();

/* ---------- SPLASH ---------- */
function createSplash() {
  splash = new BrowserWindow({
    width: 270,
    height: 270,
    useContentSize: true,   // DPI
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: false
  });

  splash.loadFile('splash.html');
  splash.once('ready-to-show', () => splash.show());
}

/* ---------- MAIN WINDOW ---------- */
function createWindow() {
  win = new BrowserWindow({
    width: 700,
    height: 450,
    minWidth: 700,
    minHeight: 450,
    show: false, // ⛔ flash engel
    backgroundColor: '#13171e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.removeMenu();
  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    if (splash) splash.close();
    win.show();
  });

  win.on('closed', () => {
    win = null;
  });

  // SES VE MİKROFON İZİNLERİNİ OTOMATİK YÖNET
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true; // Otomatik izin ver veya sorgula
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(false);
  });
}

/* ---------- APP READY ---------- */
app.whenReady().then(() => {
  // Permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission === 'media') {
      const wantsAudio = Array.isArray(details.requestedMediaTypes)
        ? details.requestedMediaTypes.includes('audio')
        : true;

      if (wantsAudio) {
        if (typeof storedPerms.microphone !== 'undefined') {
          callback(!!storedPerms.microphone);
          return;
        }

        const res = dialog.showMessageBoxSync(win || null, {
          type: 'question',
          buttons: ['Allow', 'Deny'],
          defaultId: 0,
          cancelId: 1,
          title: 'Microphone permission',
          message: 'This app needs access to your microphone. Allow?'
        });

        const allow = res === 0;
        storedPerms.microphone = allow;
        savePermissions(storedPerms);
        callback(allow);
        return;
      }
    }

    callback(false);
  });

  createSplash();
  createWindow();

  // 1. Panoya yazma isteğini dinle
  ipcMain.handle('clipboard:write', async (event, text) => {
    try {
      clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard write error:', error);
      return false;
    }
  });

  // 2. Panodan okuma isteğini dinle
  ipcMain.handle('clipboard:read', async () => {
    try {
      return clipboard.readText();
    } catch (error) {
      console.error('Clipboard read error:', error);
      return '';
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
