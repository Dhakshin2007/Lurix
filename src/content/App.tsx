import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { THEMES, DEFAULT_THEME, type ThemeId } from '@/shared/theme'
import Workspace from './Workspace'
import { getSettings, setSettings, onSettingsChanged, type CFPSettings } from '@/shared/storage'
import { getCurrentProblem, getCurrentProblemTitle, getSampleTests } from '@/shared/problem'
import { isBookmarked, toggleBookmark } from '@/shared/bookmarks'
import { recordVisit } from '@/shared/recent'
import { applyTheme } from './applyTheme'
import CommandPalette, { type Command } from './CommandPalette'
import NotesPanel from './NotesPanel'
import BookmarksPanel from './BookmarksPanel'
import RecentPanel from './RecentPanel'
import TimerPanel from './TimerPanel'
import BackupPanel from './BackupPanel'
import ThemeBuilderPanel from './ThemeBuilderPanel'
import DashboardPanel from './DashboardPanel'
import ToastHost from './ToastHost'
import { copyText } from './clipboard'
import { showToast } from './toast'
import { usePracticeTimer } from './usePracticeTimer'

const THEME_ORDER: ThemeId[] = Object.keys(THEMES) as ThemeId[]

type PanelId = 'notes' | 'bookmarks' | 'recent' | 'timer' | 'backup' | 'themeBuilder' | 'dashboard' | null

export default function App() {
  const [settings, setLocalSettings] = useState<CFPSettings | null>(null)
  const [dockOpen, setDockOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelId>(null)
  const [bookmarked, setBookmarked] = useState(false)

  const timer = usePracticeTimer()

  const problem = useMemo(() => getCurrentProblem(), [])
  const problemTitle = useMemo(
    () => (problem ? getCurrentProblemTitle(`${problem.contestId}${problem.index}`) : ''),
    [problem]
  )

  useEffect(() => {
    getSettings().then(setLocalSettings)
    return onSettingsChanged(setLocalSettings)
  }, [])

  useEffect(() => {
    if (problem) isBookmarked(problem.key).then(setBookmarked)
  }, [problem])

  useEffect(() => {
    if (problem) recordVisit({ problemKey: problem.key, problemTitle, problemUrl: problem.url })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem])

  useEffect(() => {
    if (!settings) return
    applyTheme(settings.themeId, {
      customAccent: settings.customAccent,
      customRadius: settings.customRadius,
      customBg: settings.customBg,
      customBgElevated: settings.customBgElevated,
      customSurface: settings.customSurface,
      customText: settings.customText,
      customBlur: settings.customBlur,
      customTransparency: settings.customTransparency,
      customShadow: settings.customShadow,
      customAnimSpeed: settings.customAnimSpeed,
      reducedMotion: settings.reducedMotion,
      dyslexiaFont: settings.dyslexiaFont,
      highContrast: settings.highContrast,
    })
  }, [settings])


  useEffect(() => {
    if (!settings) return
    const active = settings.workspaceActive && !!problem
    document.documentElement.setAttribute('data-cfp-workspace', String(active))
  }, [settings?.workspaceActive, problem])

  // Global shortcut: Ctrl/Cmd+K opens the command palette from anywhere on
  // the page, matching the "universal command palette" requirement.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      } else if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [paletteOpen])

  async function updateSettings(patch: Partial<CFPSettings>) {
    const next = await setSettings(patch)
    setLocalSettings(next)
  }

  function cycleTheme() {
    if (!settings) return
    const idx = THEME_ORDER.indexOf(settings.themeId)
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length]
    updateSettings({ themeId: next })
    showToast(`Theme: ${THEMES[next].label}`, 'info')
  }


  async function handleToggleBookmark() {
    if (!problem) return
    const result = await toggleBookmark({
      problemKey: problem.key,
      problemTitle,
      problemUrl: problem.url,
    })
    setBookmarked(result.bookmarked)
    showToast(result.bookmarked ? 'Bookmarked' : 'Bookmark removed', 'success')
  }

  async function handleCopy(label: string, text: string) {
    if (!text) {
      showToast(`${label} is empty`, 'error')
      return
    }
    const ok = await copyText(text)
    showToast(ok ? `Copied ${label}` : `Couldn't copy ${label}`, ok ? 'success' : 'error')
  }

  const commands: Command[] = useMemo(() => {
    if (!settings) return []
    const list: Command[] = [
      {
        id: 'cycle-theme',
        label: 'Toggle Theme',
        hint: THEMES[settings.themeId].label,
        run: cycleTheme,
      },

      {
        id: 'toggle-workspace',
        label: 'Toggle Premium Workspace',
        hint: settings.workspaceActive ? 'On' : 'Off',
        run: () => updateSettings({ workspaceActive: !settings.workspaceActive }),
      },
      {
        id: 'open-dashboard',
        label: 'Open Practice Dashboard & Analytics',
        run: () => setActivePanel('dashboard'),
      },
      { id: 'open-notes', label: 'Open Notes', run: () => setActivePanel('notes') },
      { id: 'open-bookmarks', label: 'Open Bookmarks', run: () => setActivePanel('bookmarks') },
      { id: 'open-recent', label: 'Open Recent Problems', run: () => setActivePanel('recent') },
      { id: 'open-timer', label: 'Open Practice Timer', run: () => setActivePanel('timer') },
      { id: 'open-backup', label: 'Open Backup & Restore', run: () => setActivePanel('backup') },
      {
        id: 'open-theme-builder',
        label: 'Open Theme Builder',
        run: () => setActivePanel('themeBuilder'),
      },
    ]

    if (problem) {
      list.push({
        id: 'toggle-bookmark',
        label: bookmarked ? 'Remove Bookmark' : 'Bookmark Problem',
        run: handleToggleBookmark,
      })
      list.push({
        id: 'copy-url',
        label: 'Copy Problem URL',
        run: () => handleCopy('problem URL', problem.url),
      })
      list.push({
        id: 'copy-title',
        label: 'Copy Problem Title',
        run: () => handleCopy('problem title', problemTitle),
      })

      const samples = getSampleTests()
      samples.forEach((sample, i) => {
        list.push({
          id: `copy-sample-input-${i}`,
          label: `Copy Sample Input #${i + 1}`,
          run: () => handleCopy(`sample input #${i + 1}`, sample.input),
        })
        list.push({
          id: `copy-sample-output-${i}`,
          label: `Copy Sample Output #${i + 1}`,
          run: () => handleCopy(`sample output #${i + 1}`, sample.output),
        })
      })
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, problem, bookmarked, problemTitle])

  if (!settings) return null

  return (
    <>
      <div className="cfp-dock" data-open={dockOpen}>
        <button
          className="cfp-dock__fab"
          aria-label="Codeforces Premium"
          onClick={() => setDockOpen((v) => !v)}
        >
          CF+
        </button>

        {dockOpen && (
          <div className="cfp-dock__panel">
            <div className="cfp-dock__title">Codeforces Premium</div>

            <button className="cfp-dock__row" onClick={() => setPaletteOpen(true)}>
              <span>Command Palette</span>
              <span className="cfp-dock__value">Ctrl/⌘ K</span>
            </button>
            <button className="cfp-dock__row" onClick={cycleTheme}>
              <span>Theme</span>
              <span className="cfp-dock__value">{THEMES[settings.themeId].label}</span>
            </button>

            <button className="cfp-dock__row" onClick={() => setActivePanel('themeBuilder')}>
              <span>Theme Builder</span>
              <span className="cfp-dock__value">Customize</span>
            </button>
            <button className="cfp-dock__row" onClick={() => setActivePanel('dashboard')}>
              <span>Practice Analytics</span>
              <span className="cfp-dock__value">Stats</span>
            </button>
            <button className="cfp-dock__row" onClick={() => setActivePanel('notes')}>
              <span>Notes</span>
              <span className="cfp-dock__value">{problem ? 'This problem' : '—'}</span>
            </button>
            <button className="cfp-dock__row" onClick={() => setActivePanel('bookmarks')}>
              <span>Bookmarks</span>
              <span className="cfp-dock__value">
                {problem ? (bookmarked ? '★ Saved' : 'Save') : '—'}
              </span>
            </button>
            <button className="cfp-dock__row" onClick={() => setActivePanel('recent')}>
              <span>Recent Problems</span>
              <span className="cfp-dock__value">History</span>
            </button>
            <button className="cfp-dock__row" onClick={() => setActivePanel('timer')}>
              <span>Practice Timer</span>
              <span className="cfp-dock__value">{timer.status === 'running' ? 'Running' : 'Open'}</span>
            </button>
            <button className="cfp-dock__row" onClick={() => setActivePanel('backup')}>
              <span>Backup & Restore</span>
              <span className="cfp-dock__value">Local data</span>
            </button>
          </div>
        )}
      </div>

      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
      <NotesPanel
        open={activePanel === 'notes'}
        onClose={() => setActivePanel(null)}
        problem={problem}
        problemTitle={problemTitle}
      />
      <BookmarksPanel open={activePanel === 'bookmarks'} onClose={() => setActivePanel(null)} />
      <RecentPanel open={activePanel === 'recent'} onClose={() => setActivePanel(null)} />
      <TimerPanel open={activePanel === 'timer'} onClose={() => setActivePanel(null)} timer={timer} />
      <BackupPanel open={activePanel === 'backup'} onClose={() => setActivePanel(null)} />
      <ThemeBuilderPanel
        open={activePanel === 'themeBuilder'}
        onClose={() => setActivePanel(null)}
        settings={settings}
        onChange={updateSettings}
      />
      <DashboardPanel open={activePanel === 'dashboard'} onClose={() => setActivePanel(null)} />
      <ToastHost />

      {settings.workspaceActive && problem && (
        createPortal(
          <Workspace
            problem={problem}
            problemTitle={problemTitle}
            settings={settings}
            updateSettings={updateSettings}
            onClose={() => updateSettings({ workspaceActive: false })}
          />,
          document.getElementById('cfp-workspace-root')!
        )
      )}
    </>
  )
}
