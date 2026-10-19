import { describe, expect, it } from 'vitest'
import { createTestDatabase } from './testing/testHelpers'
import { setSetting } from './repositories/settingsRepository'
import { parseThemePreference } from './ipcValidation'
import {
  DARK_WINDOW_BACKGROUND_COLOR,
  LIGHT_WINDOW_BACKGROUND_COLOR,
  THEME_PREFERENCE_SETTING_KEY,
  readThemePreference,
  resolveWindowBackgroundColor,
  saveThemePreference
} from './theme'

describe('préférence de thème', () => {
  it('suit le système par défaut', () => {
    expect(readThemePreference(createTestDatabase())).toBe('system')
  })

  it('relit la préférence enregistrée et la remplace', () => {
    const database = createTestDatabase()

    saveThemePreference(database, 'dark')
    expect(readThemePreference(database)).toBe('dark')

    saveThemePreference(database, 'light')
    expect(readThemePreference(database)).toBe('light')
  })

  it('retombe sur le système quand la valeur stockée est inconnue', () => {
    const database = createTestDatabase()
    setSetting(database, THEME_PREFERENCE_SETTING_KEY, 'sepia')

    expect(readThemePreference(database)).toBe('system')
  })

  it('valide la valeur reçue en IPC', () => {
    expect(parseThemePreference('system')).toBe('system')
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference('dark')).toBe('dark')
    for (const invalidThemePreference of ['sepia', '', 'DARK', null, undefined, 1, {}]) {
      expect(() => parseThemePreference(invalidThemePreference)).toThrow('themePreference')
    }
  })

  it('choisit la couleur de fond de la fenêtre selon le thème actif', () => {
    expect(resolveWindowBackgroundColor(true)).toBe(DARK_WINDOW_BACKGROUND_COLOR)
    expect(resolveWindowBackgroundColor(false)).toBe(LIGHT_WINDOW_BACKGROUND_COLOR)
  })
})
