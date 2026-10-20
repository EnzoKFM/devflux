import { chmodSync, mkdirSync, mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyDefaultAutostart,
  buildDesktopFileContent,
  getAutostartStatus,
  quoteDesktopExecArgument,
  refreshEnabledAutostart,
  resolveAutostartContext,
  resolveAutostartDesktopFilePath,
  setAutostartEnabled
} from './autostart'
import { createTestDatabase, FIXED_NOW } from './testing/testHelpers'

const INSTALLED_ICON_FILE_PATH = '/home/moi/.local/share/icons/hicolor/512x512/apps/devflux.png'

const temporaryDirectories: string[] = []

function createTemporaryConfigHome(): string {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'devflux-autostart-'))
  temporaryDirectories.push(temporaryDirectory)
  return temporaryDirectory
}

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
  vi.restoreAllMocks()
})

function createEnabledAutostart(desktopFileContent: string): ReturnType<typeof resolveAutostartContext> {
  const context = resolveAutostartContext({
    isPackaged: true,
    environment: { XDG_CONFIG_HOME: createTemporaryConfigHome() },
    homeDirectory: '/home/moi',
    executablePath: '/opt/DevFlux/devflux',
    iconFilePath: INSTALLED_ICON_FILE_PATH
  })
  mkdirSync(dirname(context.desktopFilePath), { recursive: true })
  writeFileSync(context.desktopFilePath, desktopFileContent, 'utf8')
  return context
}

describe('contenu du fichier .desktop', () => {
  it('décrit une application lancée au démarrage', () => {
    expect(buildDesktopFileContent('/opt/DevFlux/devflux', INSTALLED_ICON_FILE_PATH)).toBe(
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=DevFlux',
        'Comment=Veille technologique quotidienne',
        'Exec="/opt/DevFlux/devflux"',
        `Icon=${INSTALLED_ICON_FILE_PATH}`,
        'Terminal=false',
        'X-GNOME-Autostart-enabled=true',
        ''
      ].join('\n')
    )
  })

  it('protège les caractères spéciaux du chemin d exécution', () => {
    expect(quoteDesktopExecArgument('/home/moi/Mes Apps/dev"flux$1.AppImage')).toBe(
      '"/home/moi/Mes Apps/dev\\"flux\\$1.AppImage"'
    )
  })
})

describe('chemin du fichier .desktop', () => {
  it('utilise XDG_CONFIG_HOME quand il est défini', () => {
    expect(resolveAutostartDesktopFilePath({ XDG_CONFIG_HOME: '/custom/config' }, '/home/moi')).toBe(
      '/custom/config/autostart/devflux.desktop'
    )
  })

  it('retombe sur ~/.config sinon', () => {
    expect(resolveAutostartDesktopFilePath({}, '/home/moi')).toBe('/home/moi/.config/autostart/devflux.desktop')
    expect(resolveAutostartDesktopFilePath({ XDG_CONFIG_HOME: '' }, '/home/moi')).toBe(
      '/home/moi/.config/autostart/devflux.desktop'
    )
  })
})

describe('contexte de démarrage automatique', () => {
  it('privilégie APPIMAGE et n est supporté que packagé', () => {
    const packagedContext = resolveAutostartContext({
      isPackaged: true,
      environment: { APPIMAGE: '/apps/DevFlux.AppImage' },
      homeDirectory: '/home/moi',
      executablePath: '/tmp/.mount_x/devflux',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })
    const developmentContext = resolveAutostartContext({
      isPackaged: false,
      environment: {},
      homeDirectory: '/home/moi',
      executablePath: '/usr/bin/electron',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })

    expect(packagedContext).toMatchObject({
      isSupported: true,
      executablePath: '/apps/DevFlux.AppImage',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })
    expect(developmentContext).toMatchObject({ isSupported: false, executablePath: '/usr/bin/electron' })
  })
})

describe('activation sur le disque', () => {
  it('écrit puis supprime le fichier', () => {
    const configHome = createTemporaryConfigHome()
    const context = resolveAutostartContext({
      isPackaged: true,
      environment: { XDG_CONFIG_HOME: configHome },
      homeDirectory: '/home/moi',
      executablePath: '/opt/DevFlux/devflux',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })

    expect(getAutostartStatus(context)).toEqual({ isSupported: true, isEnabled: false })
    expect(setAutostartEnabled(context, true)).toEqual({ isSupported: true, isEnabled: true })
    expect(readFileSync(context.desktopFilePath, 'utf8')).toContain('Exec="/opt/DevFlux/devflux"')
    expect(setAutostartEnabled(context, false)).toEqual({ isSupported: true, isEnabled: false })
    expect(existsSync(context.desktopFilePath)).toBe(false)
  })

  it('n écrit rien quand le mode n est pas supporté', () => {
    const configHome = createTemporaryConfigHome()
    const context = resolveAutostartContext({
      isPackaged: false,
      environment: { XDG_CONFIG_HOME: configHome },
      homeDirectory: '/home/moi',
      executablePath: '/usr/bin/electron',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })

    expect(setAutostartEnabled(context, true)).toEqual({ isSupported: false, isEnabled: false })
    expect(existsSync(context.desktopFilePath)).toBe(false)
  })

  it('applique l activation par défaut une seule fois', () => {
    const database = createTestDatabase()
    const configHome = createTemporaryConfigHome()
    const context = resolveAutostartContext({
      isPackaged: true,
      environment: { XDG_CONFIG_HOME: configHome },
      homeDirectory: '/home/moi',
      executablePath: '/opt/DevFlux/devflux',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })

    applyDefaultAutostart(database, context, FIXED_NOW.toISOString())
    expect(getAutostartStatus(context).isEnabled).toBe(true)

    setAutostartEnabled(context, false)
    applyDefaultAutostart(database, context, FIXED_NOW.toISOString())
    expect(getAutostartStatus(context).isEnabled).toBe(false)
  })

  it('ajoute l icône installée à un démarrage automatique activé sans toucher au reste', () => {
    const context = createEnabledAutostart('[Desktop Entry]\nExec="/ancien/DevFlux.AppImage"\nX-GNOME-Autostart-Delay=10\n')

    refreshEnabledAutostart(context)

    expect(readFileSync(context.desktopFilePath, 'utf8')).toBe(
      `[Desktop Entry]\nIcon=${INSTALLED_ICON_FILE_PATH}\nExec="/ancien/DevFlux.AppImage"\nX-GNOME-Autostart-Delay=10\n`
    )
  })

  it('remplace l icône d un démarrage automatique activé', () => {
    const context = createEnabledAutostart('[Desktop Entry]\nExec="/ancien/DevFlux.AppImage"\nIcon=/ancienne/icone.png\n')

    refreshEnabledAutostart(context)

    expect(readFileSync(context.desktopFilePath, 'utf8')).toBe(
      `[Desktop Entry]\nIcon=${INSTALLED_ICON_FILE_PATH}\nExec="/ancien/DevFlux.AppImage"\n`
    )
  })

  it('n interrompt pas le lancement quand le démarrage automatique n est pas modifiable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const context = createEnabledAutostart('[Desktop Entry]\nExec="/ancien/DevFlux.AppImage"\n')
    chmodSync(context.desktopFilePath, 0o444)

    expect(() => refreshEnabledAutostart(context)).not.toThrow()
  })

  it('ne réactive pas un démarrage automatique désactivé', () => {
    const configHome = createTemporaryConfigHome()
    const context = resolveAutostartContext({
      isPackaged: true,
      environment: { XDG_CONFIG_HOME: configHome },
      homeDirectory: '/home/moi',
      executablePath: '/opt/DevFlux/devflux',
      iconFilePath: INSTALLED_ICON_FILE_PATH
    })

    refreshEnabledAutostart(context)

    expect(existsSync(context.desktopFilePath)).toBe(false)
  })
})
