import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildLauncherFileContent,
  installDesktopIntegration,
  resolveDesktopIntegrationPaths
} from './desktopIntegration'

const temporaryDirectories: string[] = []

function createTemporaryDirectory(): string {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'devflux-desktop-integration-'))
  temporaryDirectories.push(temporaryDirectory)
  return temporaryDirectory
}

function createBundledIcon(): string {
  const bundledIconFilePath = join(createTemporaryDirectory(), 'icon.png')
  writeFileSync(bundledIconFilePath, 'contenu-png')
  return bundledIconFilePath
}

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
  vi.restoreAllMocks()
})

describe('chemins de l intégration bureau', () => {
  it('utilise XDG_DATA_HOME quand il est défini', () => {
    expect(resolveDesktopIntegrationPaths({ XDG_DATA_HOME: '/custom/data' }, '/home/moi')).toEqual({
      launcherFilePath: '/custom/data/applications/devflux.desktop',
      iconFilePath: '/custom/data/icons/hicolor/512x512/apps/devflux.png'
    })
  })

  it('retombe sur ~/.local/share sinon', () => {
    expect(resolveDesktopIntegrationPaths({ XDG_DATA_HOME: '' }, '/home/moi')).toEqual({
      launcherFilePath: '/home/moi/.local/share/applications/devflux.desktop',
      iconFilePath: '/home/moi/.local/share/icons/hicolor/512x512/apps/devflux.png'
    })
  })
})

describe('entrée de lanceur', () => {
  it('décrit l application avec son icône installée', () => {
    expect(buildLauncherFileContent('/apps/DevFlux.AppImage', '/home/moi/.local/share/icons/hicolor/512x512/apps/devflux.png')).toBe(
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=DevFlux',
        'Comment=Veille technologique quotidienne',
        'Exec="/apps/DevFlux.AppImage"',
        'Icon=/home/moi/.local/share/icons/hicolor/512x512/apps/devflux.png',
        'Terminal=false',
        'Categories=Development;',
        ''
      ].join('\n')
    )
  })
})

describe('installation sur le disque', () => {
  it('copie l icône et écrit l entrée de lanceur', () => {
    const dataHome = createTemporaryDirectory()
    const desktopIntegrationPaths = resolveDesktopIntegrationPaths({ XDG_DATA_HOME: dataHome }, '/home/moi')

    installDesktopIntegration({
      isSupported: true,
      executablePath: '/apps/DevFlux.AppImage',
      bundledIconFilePath: createBundledIcon(),
      ...desktopIntegrationPaths
    })

    expect(readFileSync(desktopIntegrationPaths.iconFilePath, 'utf8')).toBe('contenu-png')
    expect(readFileSync(desktopIntegrationPaths.launcherFilePath, 'utf8')).toBe(
      buildLauncherFileContent('/apps/DevFlux.AppImage', desktopIntegrationPaths.iconFilePath)
    )
  })

  it('n interrompt pas le lancement quand le lanceur n est pas modifiable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const dataHome = createTemporaryDirectory()
    const desktopIntegrationPaths = resolveDesktopIntegrationPaths({ XDG_DATA_HOME: dataHome }, '/home/moi')
    mkdirSync(dirname(desktopIntegrationPaths.launcherFilePath), { recursive: true })
    writeFileSync(desktopIntegrationPaths.launcherFilePath, 'lanceur-protege')
    chmodSync(desktopIntegrationPaths.launcherFilePath, 0o444)

    expect(() =>
      installDesktopIntegration({
        isSupported: true,
        executablePath: '/apps/DevFlux.AppImage',
        bundledIconFilePath: createBundledIcon(),
        ...desktopIntegrationPaths
      })
    ).not.toThrow()
  })

  it('n installe rien quand l application n est pas packagée', () => {
    const dataHome = createTemporaryDirectory()
    const desktopIntegrationPaths = resolveDesktopIntegrationPaths({ XDG_DATA_HOME: dataHome }, '/home/moi')

    installDesktopIntegration({
      isSupported: false,
      executablePath: '/usr/bin/electron',
      bundledIconFilePath: createBundledIcon(),
      ...desktopIntegrationPaths
    })

    expect(existsSync(desktopIntegrationPaths.iconFilePath)).toBe(false)
    expect(existsSync(desktopIntegrationPaths.launcherFilePath)).toBe(false)
  })
})
