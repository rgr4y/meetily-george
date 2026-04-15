'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  THEME_STORAGE_KEY,
  THEME_NAME_STORAGE_KEY,
  DEFAULT_THEME_NAME,
  THEMES,
  getTheme,
  type ThemePreference,
  type ColorScheme,
  type ThemeColors,
  type ThemeDefinition,
} from '@/theme/githubTheme'
import {
  applyDocumentTheme,
  getInitialThemePreference,
  resolveColorScheme,
} from '@/theme/themeScript'

interface ThemeContextType {
  preference: ThemePreference
  colorScheme: ColorScheme
  themeName: string
  themeDefinition: ThemeDefinition
  availableThemes: ThemeDefinition[]
  setPreference: (pref: ThemePreference) => void
  setThemeName: (name: string) => void
  toggleColorScheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// CSS variable name mapping (camelCase → kebab-case)
const TOKEN_MAP: Record<keyof ThemeColors, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  warning: '--warning',
  warningForeground: '--warning-foreground',
  radius: '--radius',
}

function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(TOKEN_MAP)) {
    root.style.setProperty(cssVar, colors[key as keyof ThemeColors])
  }
}

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

function getSavedThemeName(): string {
  try {
    return localStorage.getItem(THEME_NAME_STORAGE_KEY) ?? DEFAULT_THEME_NAME
  } catch {
    return DEFAULT_THEME_NAME
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [systemDark, setSystemDark] = useState(getSystemDark)
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    getInitialThemePreference('system')
  )
  const [themeName, setThemeNameState] = useState(getSavedThemeName)

  const themeDefinition = useMemo(() => getTheme(themeName), [themeName])

  const colorScheme = useMemo<ColorScheme>(() => {
    return resolveColorScheme(preference, systemDark)
  }, [preference, systemDark])

  const availableThemes = useMemo(() => Object.values(THEMES), [])

  // Watch system preference
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mql) return

    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }

    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  // Apply dark/light class + color-scheme property
  useEffect(() => {
    if (typeof document === 'undefined') return
    applyDocumentTheme(colorScheme)
  }, [colorScheme])

  // Sync Tauri native window theme with color scheme
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().setTheme(colorScheme === 'dark' ? 'dark' : 'light').catch(() => {})
    }).catch(() => {})
  }, [colorScheme])

  // Apply theme colors as CSS vars whenever theme or scheme changes
  useEffect(() => {
    if (typeof document === 'undefined') return
    const colors = colorScheme === 'dark' ? themeDefinition.dark : themeDefinition.light
    applyThemeColors(colors)
  }, [colorScheme, themeDefinition])

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref)
    try { localStorage.setItem(THEME_STORAGE_KEY, pref) } catch { /* ignore */ }
  }, [])

  const setThemeName = useCallback((name: string) => {
    if (!THEMES[name]) return
    setThemeNameState(name)
    try { localStorage.setItem(THEME_NAME_STORAGE_KEY, name) } catch { /* ignore */ }
  }, [])

  const toggleColorScheme = useCallback(() => {
    setPreference(colorScheme === 'dark' ? 'light' : 'dark')
  }, [colorScheme, setPreference])

  const value = useMemo<ThemeContextType>(
    () => ({
      preference,
      colorScheme,
      themeName,
      themeDefinition,
      availableThemes,
      setPreference,
      setThemeName,
      toggleColorScheme,
    }),
    [preference, colorScheme, themeName, themeDefinition, availableThemes, setPreference, setThemeName, toggleColorScheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
