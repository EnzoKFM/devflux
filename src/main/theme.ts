import type Database from 'better-sqlite3'
import { THEME_PREFERENCES, type ThemePreference } from '@shared/contract'
import { getSetting, setSetting } from './repositories/settingsRepository'

export const THEME_PREFERENCE_SETTING_KEY = 'theme.preference'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'
export const LIGHT_WINDOW_BACKGROUND_COLOR = '#f8fafc'
export const DARK_WINDOW_BACKGROUND_COLOR = '#020617'

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

export function readThemePreference(database: Database.Database): ThemePreference {
  const storedThemePreference = getSetting(database, THEME_PREFERENCE_SETTING_KEY)
  return isThemePreference(storedThemePreference) ? storedThemePreference : DEFAULT_THEME_PREFERENCE
}

export function saveThemePreference(database: Database.Database, themePreference: ThemePreference): void {
  setSetting(database, THEME_PREFERENCE_SETTING_KEY, themePreference)
}

export function resolveWindowBackgroundColor(isDarkThemeActive: boolean): string {
  return isDarkThemeActive ? DARK_WINDOW_BACKGROUND_COLOR : LIGHT_WINDOW_BACKGROUND_COLOR
}
