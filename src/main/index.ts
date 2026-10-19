import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import type Database from 'better-sqlite3'
import { applyDefaultAutostart, resolveAutostartContext } from './autostart'
import { openDatabase } from './database/connection'
import { seedSourcesOnce, type SeedSource } from './database/seedSources'
import seedSources from './database/seedSources.json'
import { parseHttpUrl } from './httpUrl'
import { registerIpcHandlers } from './ipc'
import { isNavigationAllowed } from './navigationPolicy'

const DATABASE_FILE_NAME = 'devflux.sqlite'

let mainWindow: BrowserWindow | null = null
let database: Database.Database | null = null

function openExternally(rawUrl: string): void {
  const httpUrl = parseHttpUrl(rawUrl)
  if (httpUrl) {
    void shell.openExternal(httpUrl.href)
  }
}

function createMainWindow(): BrowserWindow {
  const browserWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'DevFlux',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  browserWindow.once('ready-to-show', () => browserWindow.show())

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url)
    return { action: 'deny' }
  })

  browserWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isNavigationAllowed(browserWindow.webContents.getURL(), targetUrl)) {
      event.preventDefault()
      openExternally(targetUrl)
    }
  })

  const rendererDevelopmentUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererDevelopmentUrl) {
    void browserWindow.loadURL(rendererDevelopmentUrl)
  } else {
    void browserWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return browserWindow
}

function startApplication(): void {
  database = openDatabase(join(app.getPath('userData'), DATABASE_FILE_NAME))
  const startedAt = new Date().toISOString()
  seedSourcesOnce(database, seedSources as SeedSource[], startedAt)

  const autostartContext = resolveAutostartContext({
    isPackaged: app.isPackaged,
    environment: process.env,
    homeDirectory: homedir(),
    executablePath: process.execPath
  })
  applyDefaultAutostart(database, autostartContext, startedAt)

  registerIpcHandlers({ database, autostartContext })
  mainWindow = createMainWindow()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('quit', () => {
    database?.close()
    database = null
  })

  void app.whenReady().then(startApplication)
}
