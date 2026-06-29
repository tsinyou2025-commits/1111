const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const { spawn } = require('child_process')
const path = require('path')

let mainWindow = null
let serverProcess = null

function startServer() {
  if (process.env.NODE_ENV === 'development') {
    return
  }

  const serverPath = path.join(process.resourcesPath, 'api-express', 'server.cjs')
  
  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'production'
    }
  })

  serverProcess.stdout.on('data', (data) => {
    console.log('[Server]', data.toString())
  })

  serverProcess.stderr.on('data', (data) => {
    console.error('[Server Error]', data.toString())
  })

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: '长夜故事',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function initAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info)
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', info)
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progress)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
    }
  })

  autoUpdater.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message)
    }
  })

  ipcMain.handle('check-update', () => {
    autoUpdater.checkForUpdates()
  })

  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate()
  })

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}

app.whenReady().then(() => {
  startServer()
  createWindow()
  initAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
