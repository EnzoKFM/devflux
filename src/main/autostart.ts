import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import type { AutostartStatus } from '@shared/contract'
import { getSetting, setSetting } from './repositories/settingsRepository'

export const AUTOSTART_DEFAULT_APPLIED_SETTING_KEY = 'autostart_default_applied'
export const AUTOSTART_DESKTOP_FILE_NAME = 'devflux.desktop'

export interface AutostartContext {
  isSupported: boolean
  desktopFilePath: string
  executablePath: string
}

export interface AutostartContextInput {
  isPackaged: boolean
  environment: Record<string, string | undefined>
  homeDirectory: string
  executablePath: string
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

export function buildDesktopFileContent(executablePath: string): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=DevFlux',
    'Comment=Veille technologique quotidienne',
    `Exec=${quoteDesktopExecArgument(executablePath)}`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')
}

export function resolveAutostartContext(input: AutostartContextInput): AutostartContext {
  return {
    isSupported: input.isPackaged,
    desktopFilePath: resolveAutostartDesktopFilePath(input.environment, input.homeDirectory),
    executablePath: input.environment.APPIMAGE ?? input.executablePath
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
    writeFileSync(context.desktopFilePath, buildDesktopFileContent(context.executablePath), 'utf8')
  } else {
    rmSync(context.desktopFilePath, { force: true })
  }
  return getAutostartStatus(context)
}

export function applyDefaultAutostart(database: Database.Database, context: AutostartContext, appliedAt: string): void {
  if (!context.isSupported || getSetting(database, AUTOSTART_DEFAULT_APPLIED_SETTING_KEY) !== null) {
    return
  }
  setAutostartEnabled(context, true)
  setSetting(database, AUTOSTART_DEFAULT_APPLIED_SETTING_KEY, appliedAt)
}
