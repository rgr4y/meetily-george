import { THEME_STORAGE_KEY, type ThemePreference, type ColorScheme } from './githubTheme'

function safeGetStoredPreference(): ThemePreference | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    return null
  } catch {
    return null
  }
}

export function resolveColorScheme(preference: ThemePreference, systemDark: boolean): ColorScheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

export function getInitialThemePreference(defaultPreference: ThemePreference = 'system'): ThemePreference {
  return safeGetStoredPreference() ?? defaultPreference
}

export function applyDocumentTheme(colorScheme: ColorScheme) {
  const root = document.documentElement
  if (colorScheme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')

  // Let built-in controls (scrollbars, form widgets) match scheme
  root.style.colorScheme = colorScheme
}
