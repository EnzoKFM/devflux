import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import type { AutostartStatus } from '@shared/contract'
import { getSetting, setSetting } from './repositories/settingsRepository'

export const AUTOSTART_DEFAULT_APPLIED_SETTING_KEY = 'autostart_default_applied'
export const AUTOSTART_DESKTOP_FILE_NAME = 'devflux.desktop'
const DESKTOP_ENTRY_GROUP_HEADER = '[Desktop Entry]'
const DESKTOP_ENTRY_ICON_KEY_PREFIX = 'Icon='

export interface AutostartContext {
  isSupported: boolean
  desktopFilePath: string
  executablePath: string
  iconFilePath: string
}

export interface AutostartContextInput {
  isPackaged: boolean
  environment: Record<string, string | undefined>
  homeDirectory: string
  executablePath: string
  iconFilePath: string
}

export function resolveAutostartDesktopFilePath(
  environment: Record<string, string | undefined>,
  homeDirectory: string
): string {
  const configHomeDirectory = environment.XDG_CONFIG_HOME ? environment.XDG_CONFIG_HOME : join(homeDirectory, '.config')
  return join(configHomeDirectory, 'autostart', AUTOSTART_DESKTOP_FILE_NAME)
}

export function quoteDesktopExecArgument(argument: string): string {
  return `"${argument.replace(/[\\"`$]/g, (character) => `\\${character}`)}"`
}

export function buildDesktopEntryContent(
  executablePath: string,
  iconFilePath: string,
  additionalEntryLines: string[]
): string {
  return [
    DESKTOP_ENTRY_GROUP_HEADER,
    'Type=Application',
    'Name=DevFlux',
    'Comment=Veille technologique quotidienne',
    `Exec=${quoteDesktopExecArgument(executablePath)}`,
    `${DESKTOP_ENTRY_ICON_KEY_PREFIX}${iconFilePath}`,
    'Terminal=false',
    ...additionalEntryLines,
    ''
  ].join('\n')
}

export function buildDesktopFileContent(executablePath: string, iconFilePath: string): string {
  return buildDesktopEntryContent(executablePath, iconFilePath, ['X-GNOME-Autostart-enabled=true'])
}

export function resolveAutostartContext(input: AutostartContextInput): AutostartContext {
  return {
    isSupported: input.isPackaged,
    desktopFilePath: resolveAutostartDesktopFilePath(input.environment, input.homeDirectory),
    executablePath: input.environment.APPIMAGE ?? input.executablePath,
    iconFilePath: input.iconFilePath
  }
}

export function getAutostartStatus(context: AutostartContext): AutostartStatus {
  return { isSupported: context.isSupported, isEnabled: context.isSupported && existsSync(context.desktopFilePath) }
}

export function setAutostartEnabled(context: AutostartContext, isEnabled: boolean): AutostartStatus {
  if (!context.isSupported) {
    return getAutostartStatus(context)
  }
  if (isEnabled) {
    mkdirSync(dirname(context.desktopFilePath), { recursive: true })
    writeFileSync(context.desktopFilePath, buildDesktopFileContent(context.executablePath, context.iconFilePath), 'utf8')
  } else {
    rmSync(context.desktopFilePath, { force: true })
  }
  return getAutostartStatus(context)
}

export function refreshEnabledAutostart(context: AutostartContext): void {
  if (!getAutostartStatus(context).isEnabled) {
    return
  }
  try {
    const currentDesktopFileContent = readFileSync(context.desktopFilePath, 'utf8')
    const desktopFileLinesWithoutIcon = currentDesktopFileContent
      .split('\n')
      .filter((desktopFileLine) => !desktopFileLine.startsWith(DESKTOP_ENTRY_ICON_KEY_PREFIX))
    const groupHeaderLineIndex = desktopFileLinesWithoutIcon.indexOf(DESKTOP_ENTRY_GROUP_HEADER)
    if (groupHeaderLineIndex === -1) {
      return
    }
    desktopFileLinesWithoutIcon.splice(groupHeaderLineIndex + 1, 0, `${DESKTOP_ENTRY_ICON_KEY_PREFIX}${context.iconFilePath}`)
    const refreshedDesktopFileContent = desktopFileLinesWithoutIcon.join('\n')
    if (refreshedDesktopFileContent !== currentDesktopFileContent) {
      writeFileSync(context.desktopFilePath, refreshedDesktopFileContent, 'utf8')
    }
  } catch (refreshError) {
    console.error("Échec de la mise à jour de l'icône du démarrage automatique :", refreshError)
  }
}

export function applyDefaultAutostart(database: Database.Database, context: AutostartContext, appliedAt: string): void {
  if (!context.isSupported || getSetting(database, AUTOSTART_DEFAULT_APPLIED_SETTING_KEY) !== null) {
    return
  }
  setAutostartEnabled(context, true)
  setSetting(database, AUTOSTART_DEFAULT_APPLIED_SETTING_KEY, appliedAt)
}
