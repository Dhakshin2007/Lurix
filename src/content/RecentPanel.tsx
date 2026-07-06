import { useEffect, useState } from 'react'
import { getRecent, clearRecent, type RecentEntry } from '@/shared/recent'

interface Props {
  open: boolean
  onClose: () => void
}

export default function RecentPanel({ open, onClose }: Props) {
  const [recent, setRecent] = useState<RecentEntry[]>([])

  useEffect(() => {
    if (open) getRecent().then(setRecent)
  }, [open])

  async function handleClear() {
    await clearRecent()
    setRecent([])
  }

  if (!open) return null

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div className="cfp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cfp-panel__tabs">
          <div className="cfp-panel__title-static">Recent Problems ({recent.length})</div>
          <button className="cfp-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="cfp-panel__body">
          {recent.length === 0 ? (
            <div className="cfp-panel__empty">
              Problems you visit will show up here automatically.
            </div>
          ) : (
            <>
              <div className="cfp-panel__list">
                {recent.map((r) => (
                  <a key={r.problemKey} className="cfp-panel__list-item" href={r.problemUrl}>
                    <span>{r.problemTitle}</span>
                    <span className="cfp-panel__list-meta">
                      {new Date(r.visitedAt).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
              <button
                className="cfp-panel__danger"
                style={{ marginTop: 12 }}
                onClick={handleClear}
              >
                Clear history
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
