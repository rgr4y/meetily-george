export type ColorScheme = 'light' | 'dark'

export type ThemePreference = ColorScheme | 'system'

export const THEME_STORAGE_KEY = 'themePreference'
export const THEME_NAME_STORAGE_KEY = 'themeName'

// ── Color token shape ──────────────────────────────────────────────
export interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  warning: string
  warningForeground: string
  radius: string
}

export interface ThemeDefinition {
  name: string
  label: string
  light: ThemeColors
  dark: ThemeColors
}

// ── macOS (Cocoa / SwiftUI) ────────────────────────────────────────
const macosTheme: ThemeDefinition = {
  name: 'macos',
  label: 'macOS',
  light: {
    background: '0 0% 93%',
    foreground: '0 0% 0%',
    card: '0 0% 100%',
    cardForeground: '0 0% 0%',
    popover: '0 0% 100%',
    popoverForeground: '0 0% 0%',
    primary: '211 100% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 95%',
    secondaryForeground: '0 0% 0%',
    muted: '0 0% 95%',
    mutedForeground: '0 0% 45%',
    accent: '0 0% 95%',
    accentForeground: '0 0% 0%',
    destructive: '0 100% 59%',
    destructiveForeground: '0 0% 100%',
    border: '0 0% 85%',
    input: '0 0% 85%',
    ring: '211 100% 50%',
    warning: '45 93% 47%',
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
  dark: {
    background: '0 0% 12%',
    foreground: '0 0% 93%',
    card: '0 0% 18%',
    cardForeground: '0 0% 93%',
    popover: '0 0% 18%',
    popoverForeground: '0 0% 93%',
    primary: '211 100% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 20%',
    secondaryForeground: '0 0% 93%',
    muted: '0 0% 20%',
    mutedForeground: '0 0% 55%',
    accent: '0 0% 20%',
    accentForeground: '0 0% 93%',
    destructive: '0 100% 62%',
    destructiveForeground: '0 0% 100%',
    border: '0 0% 25%',
    input: '0 0% 25%',
    ring: '211 100% 50%',
    warning: '45 93% 47%',
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
}

// ── GitHub ──────────────────────────────────────────────────────────
const githubTheme: ThemeDefinition = {
  name: 'github',
  label: 'GitHub',
  light: {
    background: '0 0% 100%',
    foreground: '215 28% 17%',
    card: '0 0% 100%',
    cardForeground: '215 28% 17%',
    popover: '0 0% 100%',
    popoverForeground: '215 28% 17%',
    primary: '212 92% 45%',
    primaryForeground: '0 0% 100%',
    secondary: '210 29% 97%',
    secondaryForeground: '215 28% 17%',
    muted: '210 29% 97%',
    mutedForeground: '215 16% 47%',
    accent: '210 29% 97%',
    accentForeground: '215 28% 17%',
    destructive: '0 72% 51%',
    destructiveForeground: '0 0% 100%',
    border: '214 18% 91%',
    input: '214 18% 91%',
    ring: '212 92% 45%',
    warning: '45 93% 47%',
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
  dark: {
    background: '215 28% 6%',
    foreground: '210 29% 97%',
    card: '216 28% 8%',
    cardForeground: '210 29% 97%',
    popover: '216 28% 8%',
    popoverForeground: '210 29% 97%',
    primary: '212 100% 66%',
    primaryForeground: '215 28% 6%',
    secondary: '216 28% 12%',
    secondaryForeground: '210 29% 97%',
    muted: '216 28% 12%',
    mutedForeground: '215 12% 67%',
    accent: '216 28% 12%',
    accentForeground: '210 29% 97%',
    destructive: '0 72% 51%',
    destructiveForeground: '0 0% 100%',
    border: '216 19% 20%',
    input: '216 19% 20%',
    ring: '212 100% 66%',
    warning: '45 93% 47%',
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
}

// ── Dracula ────────────────────────────────────────────────────────
const draculaTheme: ThemeDefinition = {
  name: 'dracula',
  label: 'Dracula',
  light: {
    // Dracula doesn't really have a light mode — use a soft inversion
    background: '231 15% 95%',
    foreground: '231 15% 18%',
    card: '0 0% 100%',
    cardForeground: '231 15% 18%',
    popover: '0 0% 100%',
    popoverForeground: '231 15% 18%',
    primary: '265 89% 66%',
    primaryForeground: '0 0% 100%',
    secondary: '231 15% 90%',
    secondaryForeground: '231 15% 18%',
    muted: '231 15% 90%',
    mutedForeground: '231 15% 45%',
    accent: '231 15% 90%',
    accentForeground: '231 15% 18%',
    destructive: '0 100% 67%',
    destructiveForeground: '0 0% 100%',
    border: '231 15% 82%',
    input: '231 15% 82%',
    ring: '265 89% 66%',
    warning: '45 93% 47%',
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
  dark: {
    background: '231 15% 18%',
    foreground: '60 30% 96%',
    card: '232 14% 22%',
    cardForeground: '60 30% 96%',
    popover: '232 14% 22%',
    popoverForeground: '60 30% 96%',
    primary: '265 89% 66%',
    primaryForeground: '60 30% 96%',
    secondary: '232 14% 26%',
    secondaryForeground: '60 30% 96%',
    muted: '232 14% 26%',
    mutedForeground: '228 8% 62%',
    accent: '232 14% 26%',
    accentForeground: '60 30% 96%',
    destructive: '0 100% 67%',
    destructiveForeground: '60 30% 96%',
    border: '232 14% 30%',
    input: '232 14% 30%',
    ring: '265 89% 66%',
    warning: '45 93% 47%',
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
}

// ── Nord ───────────────────────────────────────────────────────────
const nordTheme: ThemeDefinition = {
  name: 'nord',
  label: 'Nord',
  light: {
    background: '219 28% 96%',       // Snow Storm #ECEFF4
    foreground: '220 16% 22%',        // Polar Night #2E3440
    card: '218 27% 98%',              // #F8F9FB
    cardForeground: '220 16% 22%',
    popover: '218 27% 98%',
    popoverForeground: '220 16% 22%',
    primary: '213 32% 52%',           // Frost #5E81AC
    primaryForeground: '0 0% 100%',
    secondary: '219 28% 92%',         // Snow Storm #E5E9F0
    secondaryForeground: '220 16% 22%',
    muted: '219 28% 92%',
    mutedForeground: '220 17% 44%',   // Polar Night #4C566A
    accent: '219 28% 92%',
    accentForeground: '220 16% 22%',
    destructive: '354 42% 56%',       // Aurora #BF616A
    destructiveForeground: '0 0% 100%',
    border: '219 20% 87%',            // #D8DEE9
    input: '219 20% 87%',
    ring: '213 32% 52%',
    warning: '40 71% 73%',            // Aurora #EBCB8B
    warningForeground: '220 16% 22%',
    radius: '0.5rem',
  },
  dark: {
    background: '220 16% 22%',        // Polar Night #2E3440
    foreground: '219 28% 88%',        // Snow Storm #D8DEE9
    card: '222 16% 28%',              // Polar Night #3B4252
    cardForeground: '219 28% 88%',
    popover: '222 16% 28%',
    popoverForeground: '219 28% 88%',
    primary: '213 32% 52%',           // Frost #5E81AC
    primaryForeground: '219 28% 96%',
    secondary: '220 17% 32%',         // Polar Night #434C5E
    secondaryForeground: '219 28% 88%',
    muted: '220 17% 32%',
    mutedForeground: '219 10% 58%',   // muted text
    accent: '220 17% 32%',
    accentForeground: '219 28% 88%',
    destructive: '354 42% 56%',       // Aurora #BF616A
    destructiveForeground: '219 28% 96%',
    border: '220 17% 36%',            // #4C566A
    input: '220 17% 36%',
    ring: '213 32% 52%',
    warning: '40 71% 73%',
    warningForeground: '220 16% 22%',
    radius: '0.5rem',
  },
}

// ── Tokyo Night ───────────────────────────────────────────────────
const tokyoNightTheme: ThemeDefinition = {
  name: 'tokyo-night',
  label: 'Tokyo Night',
  light: {
    background: '220 14% 96%',        // #F0F0F5
    foreground: '231 15% 24%',        // #343B58
    card: '0 0% 100%',
    cardForeground: '231 15% 24%',
    popover: '0 0% 100%',
    popoverForeground: '231 15% 24%',
    primary: '218 67% 55%',           // #3D59A1
    primaryForeground: '0 0% 100%',
    secondary: '220 14% 92%',
    secondaryForeground: '231 15% 24%',
    muted: '220 14% 92%',
    mutedForeground: '230 10% 45%',
    accent: '220 14% 92%',
    accentForeground: '231 15% 24%',
    destructive: '348 80% 56%',       // #F7768E
    destructiveForeground: '0 0% 100%',
    border: '220 14% 85%',
    input: '220 14% 85%',
    ring: '218 67% 55%',
    warning: '36 100% 62%',           // #FF9E64
    warningForeground: '231 15% 24%',
    radius: '0.5rem',
  },
  dark: {
    background: '235 18% 14%',        // #1A1B26
    foreground: '226 31% 82%',        // #A9B1D6
    card: '235 17% 18%',              // #24283B
    cardForeground: '226 31% 82%',
    popover: '235 17% 18%',
    popoverForeground: '226 31% 82%',
    primary: '218 67% 55%',           // #3D59A1
    primaryForeground: '226 31% 92%',
    secondary: '235 16% 22%',
    secondaryForeground: '226 31% 82%',
    muted: '235 16% 22%',
    mutedForeground: '229 12% 52%',   // #565F89
    accent: '235 16% 22%',
    accentForeground: '226 31% 82%',
    destructive: '348 80% 56%',       // #F7768E
    destructiveForeground: '226 31% 92%',
    border: '234 14% 26%',
    input: '234 14% 26%',
    ring: '218 67% 55%',
    warning: '36 100% 62%',
    warningForeground: '235 18% 14%',
    radius: '0.5rem',
  },
}

// ── One Dark ──────────────────────────────────────────────────────
const oneDarkTheme: ThemeDefinition = {
  name: 'one-dark',
  label: 'One Dark',
  light: {
    background: '230 8% 97%',         // #FAFAFA
    foreground: '230 8% 24%',         // #383A42
    card: '0 0% 100%',
    cardForeground: '230 8% 24%',
    popover: '0 0% 100%',
    popoverForeground: '230 8% 24%',
    primary: '220 100% 56%',          // #4078F2
    primaryForeground: '0 0% 100%',
    secondary: '230 8% 93%',
    secondaryForeground: '230 8% 24%',
    muted: '230 8% 93%',
    mutedForeground: '230 5% 44%',    // #696C77
    accent: '230 8% 93%',
    accentForeground: '230 8% 24%',
    destructive: '355 65% 54%',       // #E45649
    destructiveForeground: '0 0% 100%',
    border: '230 8% 85%',
    input: '230 8% 85%',
    ring: '220 100% 56%',
    warning: '29 54% 51%',            // #C18401
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
  dark: {
    background: '220 13% 18%',        // #282C34
    foreground: '219 14% 76%',        // #ABB2BF
    card: '220 13% 22%',              // #2E333D
    cardForeground: '219 14% 76%',
    popover: '220 13% 22%',
    popoverForeground: '219 14% 76%',
    primary: '207 82% 66%',           // #61AFEF
    primaryForeground: '220 13% 18%',
    secondary: '220 13% 26%',
    secondaryForeground: '219 14% 76%',
    muted: '220 13% 26%',
    mutedForeground: '220 9% 50%',    // #5C6370
    accent: '220 13% 26%',
    accentForeground: '219 14% 76%',
    destructive: '355 65% 65%',       // #E06C75
    destructiveForeground: '219 14% 90%',
    border: '220 13% 30%',
    input: '220 13% 30%',
    ring: '207 82% 66%',
    warning: '39 67% 69%',            // #E5C07B
    warningForeground: '220 13% 18%',
    radius: '0.5rem',
  },
}

// ── Solarized ─────────────────────────────────────────────────────
const solarizedTheme: ThemeDefinition = {
  name: 'solarized',
  label: 'Solarized',
  light: {
    background: '44 87% 94%',         // Base3 #FDF6E3
    foreground: '194 14% 40%',        // Base00 #657B83
    card: '44 87% 97%',               // lighter
    cardForeground: '192 81% 14%',    // Base02 #073642
    popover: '44 87% 97%',
    popoverForeground: '192 81% 14%',
    primary: '205 69% 49%',           // Blue #268BD2
    primaryForeground: '44 87% 97%',
    secondary: '44 44% 88%',          // Base2 #EEE8D5
    secondaryForeground: '194 14% 40%',
    muted: '44 44% 88%',
    mutedForeground: '195 12% 55%',   // Base1 #93A1A1
    accent: '44 44% 88%',
    accentForeground: '194 14% 40%',
    destructive: '1 71% 52%',         // Red #DC322F
    destructiveForeground: '44 87% 97%',
    border: '44 32% 82%',
    input: '44 32% 82%',
    ring: '205 69% 49%',
    warning: '45 100% 35%',           // Yellow #B58900
    warningForeground: '44 87% 94%',
    radius: '0.5rem',
  },
  dark: {
    background: '192 81% 14%',        // Base03 #002B36
    foreground: '195 12% 55%',        // Base1 #93A1A1
    card: '192 100% 11%',             // Base02 #073642
    cardForeground: '44 44% 88%',     // Base2 #EEE8D5
    popover: '192 100% 11%',
    popoverForeground: '44 44% 88%',
    primary: '205 69% 49%',           // Blue #268BD2
    primaryForeground: '44 87% 94%',
    secondary: '194 14% 20%',
    secondaryForeground: '195 12% 55%',
    muted: '194 14% 20%',
    mutedForeground: '194 14% 40%',   // Base00 #657B83
    accent: '194 14% 20%',
    accentForeground: '195 12% 55%',
    destructive: '1 71% 52%',         // Red #DC322F
    destructiveForeground: '44 87% 94%',
    border: '194 14% 25%',
    input: '194 14% 25%',
    ring: '205 69% 49%',
    warning: '45 100% 35%',
    warningForeground: '44 87% 94%',
    radius: '0.5rem',
  },
}

// ── Catppuccin Latte / Mocha ──────────────────────────────────────
const catppuccinTheme: ThemeDefinition = {
  name: 'catppuccin',
  label: 'Catppuccin',
  light: {
    // Latte flavor
    background: '220 23% 95%',        // Base #EFF1F5
    foreground: '234 16% 35%',        // Text #4C4F69
    card: '220 22% 98%',              // Mantle #E6E9EF → lighter
    cardForeground: '234 16% 35%',
    popover: '220 22% 98%',
    popoverForeground: '234 16% 35%',
    primary: '266 85% 58%',           // Mauve #8839EF
    primaryForeground: '0 0% 100%',
    secondary: '223 16% 90%',         // Surface0 #CCD0DA
    secondaryForeground: '234 16% 35%',
    muted: '223 16% 90%',
    mutedForeground: '233 10% 47%',   // Subtext0 #6C6F85
    accent: '223 16% 90%',
    accentForeground: '234 16% 35%',
    destructive: '347 87% 44%',       // Red #D20F39
    destructiveForeground: '0 0% 100%',
    border: '225 14% 84%',            // Surface1 #BCC0CC
    input: '225 14% 84%',
    ring: '266 85% 58%',
    warning: '35 77% 49%',            // Yellow #DF8E1D
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
  dark: {
    // Mocha flavor
    background: '240 21% 15%',        // Base #1E1E2E
    foreground: '226 64% 88%',        // Text #CDD6F4
    card: '240 21% 18%',              // Mantle #181825 → Surface0 #313244
    cardForeground: '226 64% 88%',
    popover: '240 21% 18%',
    popoverForeground: '226 64% 88%',
    primary: '267 84% 81%',           // Mauve #CBA6F7
    primaryForeground: '240 21% 15%',
    secondary: '237 16% 23%',         // Surface0 #313244
    secondaryForeground: '226 64% 88%',
    muted: '237 16% 23%',
    mutedForeground: '228 24% 64%',   // Subtext0 #A6ADC8
    accent: '237 16% 23%',
    accentForeground: '226 64% 88%',
    destructive: '343 81% 75%',       // Red #F38BA8
    destructiveForeground: '240 21% 15%',
    border: '237 16% 27%',            // Surface1 #45475A
    input: '237 16% 27%',
    ring: '267 84% 81%',
    warning: '41 86% 83%',            // Yellow #F9E2AF
    warningForeground: '240 21% 15%',
    radius: '0.5rem',
  },
}

// ── Rose Pine ─────────────────────────────────────────────────────
const rosePineTheme: ThemeDefinition = {
  name: 'rose-pine',
  label: 'Rosé Pine',
  light: {
    // Dawn flavor
    background: '32 57% 95%',         // Base #FAF4ED
    foreground: '248 12% 36%',        // Text #575279
    card: '35 100% 98%',              // Surface #FFFAF3
    cardForeground: '248 12% 36%',
    popover: '35 100% 98%',
    popoverForeground: '248 12% 36%',
    primary: '268 21% 57%',           // Iris #907AA9
    primaryForeground: '0 0% 100%',
    secondary: '33 43% 91%',          // Overlay #F2E9E1
    secondaryForeground: '248 12% 36%',
    muted: '33 43% 91%',
    mutedForeground: '249 10% 53%',   // Muted #797593
    accent: '33 43% 91%',
    accentForeground: '248 12% 36%',
    destructive: '343 35% 55%',       // Love #B4637A
    destructiveForeground: '0 0% 100%',
    border: '33 25% 83%',             // Highlight #DFDAD9
    input: '33 25% 83%',
    ring: '268 21% 57%',
    warning: '20 51% 52%',            // Gold #EA9D34
    warningForeground: '0 0% 100%',
    radius: '0.5rem',
  },
  dark: {
    // Main flavor
    background: '249 22% 12%',        // Base #191724
    foreground: '245 50% 91%',        // Text #E0DEF4
    card: '247 23% 15%',              // Surface #1F1D2E
    cardForeground: '245 50% 91%',
    popover: '247 23% 15%',
    popoverForeground: '245 50% 91%',
    primary: '267 57% 78%',           // Iris #C4A7E7
    primaryForeground: '249 22% 12%',
    secondary: '248 25% 18%',         // Overlay #26233A
    secondaryForeground: '245 50% 91%',
    muted: '248 25% 18%',
    mutedForeground: '249 12% 52%',   // Muted #6E6A86
    accent: '248 25% 18%',
    accentForeground: '245 50% 91%',
    destructive: '343 76% 68%',       // Love #EB6F92
    destructiveForeground: '245 50% 91%',
    border: '247 20% 22%',            // Highlight Med #403D52
    input: '247 20% 22%',
    ring: '267 57% 78%',
    warning: '35 88% 72%',            // Gold #F6C177
    warningForeground: '249 22% 12%',
    radius: '0.5rem',
  },
}

// ── Registry ───────────────────────────────────────────────────────
export const THEMES: Record<string, ThemeDefinition> = {
  macos: macosTheme,
  github: githubTheme,
  nord: nordTheme,
  'tokyo-night': tokyoNightTheme,
  'one-dark': oneDarkTheme,
  solarized: solarizedTheme,
  catppuccin: catppuccinTheme,
  'rose-pine': rosePineTheme,
  dracula: draculaTheme,
}

export const DEFAULT_THEME_NAME = 'macos'

export function getTheme(name: string): ThemeDefinition {
  return THEMES[name] ?? THEMES[DEFAULT_THEME_NAME]
}

// Legacy alias (kept for imports that reference it)
export const GITHUB_THEME = macosTheme
export const MACOS_THEME = macosTheme
