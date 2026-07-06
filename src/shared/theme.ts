/**
 * Codeforces Premium — design tokens.
 *
 * These are intentionally distinct from a generic "VS Code dark theme" clone:
 * a deep graphite base (not pure black), a single confident accent (signal amber,
 * echoing a judge's "verdict" light) and a cool green reserved only for Accepted.
 * Every token is a CSS variable so Theme Builder can override them at runtime
 * without a rebuild.
 */

export type ThemeId =
  | 'graphite' // default dark
  | 'daylight' // default light
  | 'oled'
  | 'nord'
  | 'dracula'
  | 'solarized'

export interface ThemeTokens {
  id: ThemeId
  label: string
  isDark: boolean
  colors: {
    bg: string
    bgElevated: string
    surface: string
    border: string
    text: string
    textMuted: string
    accent: string
    accentText: string
    success: string
    danger: string
    warning: string
  }
  radius: string
  fontSans: string
  fontMono: string
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  graphite: {
    id: 'graphite',
    label: 'Graphite (Default Dark)',
    isDark: true,
    colors: {
      bg: '#14161a',
      bgElevated: '#1b1e24',
      surface: '#20242b',
      border: '#2c313a',
      text: '#e8eaed',
      textMuted: '#9aa1ac',
      accent: '#e0a638', // signal amber
      accentText: '#14161a',
      success: '#4caf7d',
      danger: '#e2564f',
      warning: '#e0a638',
    },
    radius: '10px',
    fontSans:
      "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
    fontMono: "'-apple-system', 'BlinkMacSystemFont', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
  },
  daylight: {
    id: 'daylight',
    label: 'Daylight (Default Light)',
    isDark: false,
    colors: {
      bg: '#f7f7f5',
      bgElevated: '#ffffff',
      surface: '#ffffff',
      border: '#e2e2e0',
      text: '#1c1e21',
      textMuted: '#666b72',
      accent: '#b5791f',
      accentText: '#ffffff',
      success: '#2e8a5f',
      danger: '#c8433d',
      warning: '#b5791f',
    },
    radius: '10px',
    fontSans:
      "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
    fontMono: "'-apple-system', 'BlinkMacSystemFont', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
  },
  oled: {
    id: 'oled',
    label: 'OLED Black',
    isDark: true,
    colors: {
      bg: '#000000',
      bgElevated: '#0a0a0a',
      surface: '#111111',
      border: '#232323',
      text: '#eaeaea',
      textMuted: '#8a8a8a',
      accent: '#e0a638',
      accentText: '#000000',
      success: '#4caf7d',
      danger: '#e2564f',
      warning: '#e0a638',
    },
    radius: '8px',
    fontSans:
      "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
    fontMono: "'-apple-system', 'BlinkMacSystemFont', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
  },
  nord: {
    id: 'nord',
    label: 'Nord',
    isDark: true,
    colors: {
      bg: '#2e3440',
      bgElevated: '#3b4252',
      surface: '#434c5e',
      border: '#4c566a',
      text: '#eceff4',
      textMuted: '#b9c0cd',
      accent: '#88c0d0',
      accentText: '#2e3440',
      success: '#a3be8c',
      danger: '#bf616a',
      warning: '#ebcb8b',
    },
    radius: '8px',
    fontSans:
      "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
    fontMono: "'-apple-system', 'BlinkMacSystemFont', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
  },
  dracula: {
    id: 'dracula',
    label: 'Dracula',
    isDark: true,
    colors: {
      bg: '#282a36',
      bgElevated: '#2f3241',
      surface: '#383a4d',
      border: '#44475a',
      text: '#f8f8f2',
      textMuted: '#b8bad0',
      accent: '#ff79c6',
      accentText: '#282a36',
      success: '#50fa7b',
      danger: '#ff5555',
      warning: '#f1fa8c',
    },
    radius: '10px',
    fontSans:
      "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
    fontMono: "'-apple-system', 'BlinkMacSystemFont', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
  },
  solarized: {
    id: 'solarized',
    label: 'Solarized',
    isDark: false,
    colors: {
      bg: '#fdf6e3',
      bgElevated: '#ffffff',
      surface: '#eee8d5',
      border: '#d8d0b8',
      text: '#073642',
      textMuted: '#657b83',
      accent: '#b58900',
      accentText: '#fdf6e3',
      success: '#859900',
      danger: '#dc322f',
      warning: '#cb4b16',
    },
    radius: '6px',
    fontSans:
      "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
    fontMono: "'-apple-system', 'BlinkMacSystemFont', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
  },
}

export const DEFAULT_THEME: ThemeId = 'graphite'

/** Picks black or white text depending on the perceived brightness of a hex color. */
export function readableTextColor(hex: string): string {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return '#14161a'
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#14161a' : '#ffffff'
}

/** Converts a theme's tokens into a CSS variable declaration block. */
export function themeToCssVars(theme: ThemeTokens): string {
  const c = theme.colors
  return `
    --cfp-bg: ${c.bg};
    --cfp-bg-elevated: ${c.bgElevated};
    --cfp-surface: ${c.surface};
    --cfp-border: ${c.border};
    --cfp-text: ${c.text};
    --cfp-text-muted: ${c.textMuted};
    --cfp-accent: ${c.accent};
    --cfp-accent-text: ${c.accentText};
    --cfp-success: ${c.success};
    --cfp-danger: ${c.danger};
    --cfp-warning: ${c.warning};
    --cfp-radius: ${theme.radius};
    --cfp-font-sans: ${theme.fontSans};
    --cfp-font-mono: ${theme.fontMono};
  `.trim()
}
