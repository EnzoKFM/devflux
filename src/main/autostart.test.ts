import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyDefaultAutostart,
  buildDesktopFileContent,
  getAutostartStatus,
  quoteDesktopExecArgument,
  resolveAutostartContext,
  resolveAutostartDesktopFilePath,
  setAutostartEnabled
} from './autostart'
import { createTestDatabase, FIXED_NOW } from './testing/testHelpers'

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
})

describe('contenu du fichier .desktop', () => {
  it('décrit une application lancée au démarrage', () => {
    expect(buildDesktopFileContent('/opt/DevFlux/devflux')).toBe(
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=DevFlux',
        'Comment=Veille technologique quotidienne',
        'Exec="/opt/DevFlux/devflux"',
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
      executablePath: '/tmp/.mount_x/devflux'
    })
    const developmentContext = resolveAutostartContext({
      isPackaged: false,
      environment: {},
      homeDirectory: '/home/moi',
      executablePath: '/usr/bin/electron'
    })

    expect(packagedContext).toMatchObject({ isSupported: true, executablePath: '/apps/DevFlux.AppImage' })
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
      executablePath: '/opt/DevFlux/devflux'
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
      executablePath: '/usr/bin/electron'
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
      executablePath: '/opt/DevFlux/devflux'
    })

    applyDefaultAutostart(database, context, FIXED_NOW.toISOString())
    expect(getAutostartStatus(context).isEnabled).toBe(true)

    setAutostartEnabled(context, false)
    applyDefaultAutostart(database, context, FIXED_NOW.toISOString())
    expect(getAutostartStatus(context).isEnabled).toBe(false)
  })
})
