import { THEMES, themeToCssVars, readableTextColor, type ThemeId } from '@/shared/theme'

const STYLE_TAG_ID = 'cfp-theme-vars'

export interface ThemeOverrides {
  customAccent?: string | null
  customRadius?: number | null
  customBg?: string | null
  customBgElevated?: string | null
  customSurface?: string | null
  customText?: string | null
  customBlur?: number | null
  customTransparency?: number | null
  customShadow?: number | null
  customAnimSpeed?: number | null
  reducedMotion?: boolean
  dyslexiaFont?: boolean
  highContrast?: boolean
}

/** Writes the active theme's CSS variables onto <html> and flips the marker attribute. */
export function applyTheme(themeId: ThemeId, overrides: ThemeOverrides = {}) {
  const theme = THEMES[themeId]
  const html = document.documentElement

  html.setAttribute('data-cfp-theme', themeId)
  html.classList.toggle('cfp-dark', theme.isDark)
  html.classList.toggle('cfp-light', !theme.isDark)

  let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!styleTag) {
    styleTag = document.createElement('style')
    styleTag.id = STYLE_TAG_ID
    document.head.appendChild(styleTag)
  }

  const overrideVars: string[] = []
  
  if (overrides.highContrast) {
    overrideVars.push(`--cfp-bg: #000000 !important;`)
    overrideVars.push(`--cfp-bg-elevated: #000000 !important;`)
    overrideVars.push(`--cfp-surface: #111111 !important;`)
    overrideVars.push(`--cfp-border: #ffffff !important;`)
    overrideVars.push(`--cfp-text: #ffffff !important;`)
    overrideVars.push(`--cfp-text-muted: #ffff00 !important;`)
    overrideVars.push(`--cfp-accent: #00ffff !important;`)
    overrideVars.push(`--cfp-accent-text: #000000 !important;`)
    overrideVars.push(`--cfp-success: #00ff00 !important;`)
    overrideVars.push(`--cfp-danger: #ff0000 !important;`)
  } else {
    if (overrides.customBg) overrideVars.push(`--cfp-bg: ${overrides.customBg} !important;`)
    if (overrides.customBgElevated) overrideVars.push(`--cfp-bg-elevated: ${overrides.customBgElevated} !important;`)
    if (overrides.customSurface) overrideVars.push(`--cfp-surface: ${overrides.customSurface} !important;`)
    if (overrides.customText) overrideVars.push(`--cfp-text: ${overrides.customText} !important;`)
    if (overrides.customAccent) {
      overrideVars.push(`--cfp-accent: ${overrides.customAccent};`)
      overrideVars.push(`--cfp-accent-text: ${readableTextColor(overrides.customAccent)};`)
    }
  }

  if (overrides.customRadius !== null && overrides.customRadius !== undefined) {
    overrideVars.push(`--cfp-radius: ${overrides.customRadius}px;`)
  }
  if (overrides.customBlur !== null && overrides.customBlur !== undefined) {
    overrideVars.push(`--cfp-blur: ${overrides.customBlur}px;`)
  }
  if (overrides.customTransparency !== null && overrides.customTransparency !== undefined) {
    overrideVars.push(`--cfp-transparency: ${overrides.customTransparency};`)
  }
  if (overrides.customShadow !== null && overrides.customShadow !== undefined) {
    overrideVars.push(`--cfp-shadow-opacity: ${overrides.customShadow / 10};`)
  }
  if (overrides.customAnimSpeed !== null && overrides.customAnimSpeed !== undefined) {
    overrideVars.push(`--cfp-anim-speed: ${overrides.customAnimSpeed}s;`)
  }

  if (overrides.reducedMotion) {
    overrideVars.push(`--cfp-anim-speed: 0s !important;`)
    overrideVars.push(`--cfp-transition: none !important;`)
  }
  if (overrides.dyslexiaFont) {
    overrideVars.push(`--cfp-font-sans: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important;`)
    overrideVars.push(`--cfp-font-mono: 'Comic Sans MS', monospace !important;`)
  }

  styleTag.textContent = `html[data-cfp-theme] { ${themeToCssVars(theme)} ${overrideVars.join(' ')} }`
}

export function applyZenMode(enabled: boolean) {
  document.documentElement.setAttribute('data-cfp-zen', String(enabled))
}
