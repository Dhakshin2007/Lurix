import { useEffect, useState } from 'react'
import { THEMES, type ThemeId } from '@/shared/theme'
import { getSettings, setSettings, type CFPSettings } from '@/shared/storage'

export default function App() {
  const [settings, setLocalSettings] = useState<CFPSettings | null>(null)

  useEffect(() => {
    getSettings().then(setLocalSettings)
  }, [])

  if (!settings) return <div className="popup">Loading…</div>

  async function update(patch: Partial<CFPSettings>) {
    const next = await setSettings(patch)
    setLocalSettings(next)
  }

  return (
    <div className="popup">
      <header className="popup__header">
        <img src="/Lurix-Logo.png" alt="Lurix Logo" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
        <div>
          <div className="popup__title">Lurix Pro</div>
          <div className="popup__subtitle">Practice Without Friction</div>
        </div>
      </header>

      <section className="popup__section">
        <label className="popup__label" htmlFor="theme-select">
          Theme
        </label>
        <select
          id="theme-select"
          className="popup__select"
          value={settings.themeId}
          onChange={(e) => update({ themeId: e.target.value as ThemeId })}
        >
          {Object.values(THEMES).map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </section>




      <footer className="popup__footer">
        More settings — Command Palette, Workspace Profiles, Analytics —
        coming next.
      </footer>
    </div>
  )
}
