/**
 * Thin, typed wrapper around chrome.storage.local.
 *
 * Everything in this product is local-first (see PRD: "No cloud sync required,
 * everything remains on the user's computer"), so this is the single choke
 * point every feature should read/write through — makes Backup & Restore and
 * the future Storage Inspector trivial to build later.
 */
import type { ThemeId } from './theme'

export type KeyboardMode = 'standard' | 'vim' | 'emacs'

export interface ProfileConfig {
  themeId: ThemeId
  fontSize: number
  keyboardMode: KeyboardMode
  layoutMode: 'vertical' | 'horizontal'
  splitRatio: number
}

export interface CFPSettings {
  themeId: ThemeId
  fontSize: number
  onboardingSeen: boolean
  customAccent: string | null
  customRadius: number | null
  workspaceActive: boolean
  layoutMode: 'vertical' | 'horizontal'
  splitRatio: number
  isVimMode: boolean
  keyboardMode: KeyboardMode
  currentProfile: 'practice' | 'contest' | 'interview' | 'teaching' | 'minimal' | 'custom'
  profiles: Record<string, ProfileConfig>
  
  // Competitive Mode
  isCompetitiveMode: boolean
  
  // Accessibility settings
  reducedMotion: boolean
  dyslexiaFont: boolean
  highContrast: boolean
  
  // Custom Theme variables
  customBg: string | null
  customBgElevated: string | null
  customSurface: string | null
  customText: string | null
  customBlur: number | null
  customTransparency: number | null
  customShadow: number | null
  customAnimSpeed: number | null
}

export const DEFAULT_PROFILES: Record<string, ProfileConfig> = {
  practice: {
    themeId: 'nord',
    fontSize: 14,
    keyboardMode: 'standard',
    layoutMode: 'vertical',
    splitRatio: 0.5,
  },
  contest: {
    themeId: 'oled',
    fontSize: 14,
    keyboardMode: 'standard',
    layoutMode: 'vertical',
    splitRatio: 0.45,
  },
  interview: {
    themeId: 'dracula',
    fontSize: 15,
    keyboardMode: 'standard',
    layoutMode: 'vertical',
    splitRatio: 0.5,
  },
  teaching: {
    themeId: 'daylight',
    fontSize: 18,
    keyboardMode: 'standard',
    layoutMode: 'vertical',
    splitRatio: 0.6,
  },
  minimal: {
    themeId: 'graphite',
    fontSize: 13,
    keyboardMode: 'vim',
    layoutMode: 'vertical',
    splitRatio: 0.4,
  },
  custom: {
    themeId: 'graphite',
    fontSize: 14,
    keyboardMode: 'standard',
    layoutMode: 'vertical',
    splitRatio: 0.5,
  }
}

export const DEFAULT_SETTINGS: CFPSettings = {
  themeId: 'graphite',
  fontSize: 14,
  onboardingSeen: false,
  customAccent: null,
  customRadius: null,
  workspaceActive: true,
  layoutMode: 'vertical',
  splitRatio: 0.5,
  isVimMode: false,
  keyboardMode: 'standard',
  currentProfile: 'practice',
  profiles: DEFAULT_PROFILES,
  isCompetitiveMode: false,
  reducedMotion: false,
  dyslexiaFont: false,
  highContrast: false,
  customBg: null,
  customBgElevated: null,
  customSurface: null,
  customText: null,
  customBlur: null,
  customTransparency: null,
  customShadow: null,
  customAnimSpeed: null,
}

const SETTINGS_KEY = 'cfp:settings'

export async function getSettings(): Promise<CFPSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  const stored = result[SETTINGS_KEY] as Partial<CFPSettings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function setSettings(
  patch: Partial<CFPSettings>
): Promise<CFPSettings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  await chrome.storage.local.set({ [SETTINGS_KEY]: next })
  return next
}

/** Fires the callback whenever settings change, from any part of the extension. */
export function onSettingsChanged(
  callback: (settings: CFPSettings) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) return
    const newValue = changes[SETTINGS_KEY].newValue as
      | Partial<CFPSettings>
      | undefined
    callback({ ...DEFAULT_SETTINGS, ...newValue })
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export async function getProblemCode(problemKey: string): Promise<string> {
  const key = `cfp:code:${problemKey}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as string) || ''
}

export async function saveProblemCode(problemKey: string, code: string): Promise<void> {
  const key = `cfp:code:${problemKey}`
  await chrome.storage.local.set({ [key]: code })
}

export async function getProblemLang(problemKey: string): Promise<string> {
  const key = `cfp:lang:${problemKey}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as string) || ''
}

export async function saveProblemLang(problemKey: string, langId: string): Promise<void> {
  const key = `cfp:lang:${problemKey}`
  await chrome.storage.local.set({ [key]: langId })
}

// ── Code Templates (3 slots per language) ──────────────────────────────

export interface TemplateSlot {
  code: string
  savedAt: number  // timestamp
  label?: string   // optional user-friendly label
}

export async function getTemplateSlot(langId: string, slot: 1 | 2 | 3): Promise<TemplateSlot | null> {
  const key = `cfp:template:${langId}:${slot}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as TemplateSlot) || null
}

export async function saveTemplateSlot(langId: string, slot: 1 | 2 | 3, code: string, label?: string): Promise<void> {
  const key = `cfp:template:${langId}:${slot}`
  const data: TemplateSlot = { code, savedAt: Date.now(), label }
  await chrome.storage.local.set({ [key]: data })
}

export async function getAllTemplateSlots(langId: string): Promise<(TemplateSlot | null)[]> {
  const keys = [1, 2, 3].map(s => `cfp:template:${langId}:${s}`)
  const result = await chrome.storage.local.get(keys)
  return keys.map(k => (result[k] as TemplateSlot) || null)
}

// Legacy template migration: read old single-slot template
export async function getTemplate(langId: string): Promise<string> {
  const key = `cfp:template:${langId}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as string) || ''
}

export async function saveTemplate(langId: string, code: string): Promise<void> {
  const key = `cfp:template:${langId}`
  await chrome.storage.local.set({ [key]: code })
}

// ── Custom Sample Tests (per problem, user-added) ─────────────────────

export interface CustomSampleTest {
  input: string
  output: string
  source: string  // e.g. 'failed-submission-12345' or 'user-added'
}

export async function getCustomSamples(problemKey: string): Promise<CustomSampleTest[]> {
  const key = `cfp:custom-samples:${problemKey}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as CustomSampleTest[]) || []
}

export async function saveCustomSamples(problemKey: string, samples: CustomSampleTest[]): Promise<void> {
  const key = `cfp:custom-samples:${problemKey}`
  await chrome.storage.local.set({ [key]: samples })
}

// ── Run History (per problem) ────────────────────────────────

export interface RunHistoryItem {
  id: string
  timestamp: number
  sourceCode: string
  type: 'sample' | 'custom' | 'submission'
  status: string
  timeConsumed?: number
  memoryConsumed?: number
  compilerMarkup?: string
  output?: string
  expected?: string
  verdict?: string
  passedTests?: number
  // Failed test case data (scraped from submission page)
  failedInput?: string
  failedExpected?: string
  failedOutput?: string
  failedTestNumber?: number
}

export async function getProblemHistory(problemKey: string): Promise<RunHistoryItem[]> {
  const key = `cfp:history:${problemKey}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as RunHistoryItem[]) || []
}

export async function saveProblemHistory(problemKey: string, history: RunHistoryItem[]): Promise<void> {
  const key = `cfp:history:${problemKey}`
  // Only keep the last 50 entries to prevent hitting any storage limits over time
  const trimmed = history.slice(0, 50)
  await chrome.storage.local.set({ [key]: trimmed })
}
