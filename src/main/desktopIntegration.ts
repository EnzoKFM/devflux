import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { AUTOSTART_DESKTOP_FILE_NAME, buildDesktopEntryContent } from './autostart'

export const INSTALLED_ICON_FILE_NAME = 'devflux.png'

export interface DesktopIntegrationPaths {
  launcherFilePath: string
  iconFilePath: string
}

export interface DesktopIntegrationContext extends DesktopIntegrationPaths {
  isSupported: boolean
  executablePath: string
  bundledIconFilePath: string
}

export function resolveDesktopIntegrationPaths(
  environment: Record<string, string | undefined>,
  homeDirectory: string
): DesktopIntegrationPaths {
  const dataHomeDirectory = environment.XDG_DATA_HOME ? environment.XDG_DATA_HOME : join(homeDirectory, '.local', 'share')
  return {
    launcherFilePath: join(dataHomeDirectory, 'applications', AUTOSTART_DESKTOP_FILE_NAME),
    iconFilePath: join(dataHomeDirectory, 'icons', 'hicolor', '512x512', 'apps', INSTALLED_ICON_FILE_NAME)
  }
}

export function buildLauncherFileContent(executablePath: string, iconFilePath: string): string {
  return buildDesktopEntryContent(executablePath, iconFilePath, ['Categories=Development;'])
}

export function installDesktopIntegration(context: DesktopIntegrationContext): void {
  if (!context.isSupported) {
    return
  }
  try {
    mkdirSync(dirname(context.iconFilePath), { recursive: true })
    copyFileSync(context.bundledIconFilePath, context.iconFilePath)
    mkdirSync(dirname(context.launcherFilePath), { recursive: true })
    writeFileSync(context.launcherFilePath, buildLauncherFileContent(context.executablePath, context.iconFilePath), 'utf8')
  } catch (installationError) {
    console.error("Échec de l'installation de l'icône et du lanceur :", installationError)
  }
}
