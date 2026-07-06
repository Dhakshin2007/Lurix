import { useEffect, useState } from 'react'
import { getBookmarks, removeBookmark, type Bookmark } from '@/shared/bookmarks'
import { showToast } from './toast'

interface Props {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

export default function BookmarksPanel({ open, onClose, onChanged }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    if (open) getBookmarks().then(setBookmarks)
  }, [open])

  async function handleRemove(problemKey: string) {
    const next = await removeBookmark(problemKey)
    setBookmarks(next)
    onChanged?.()
    showToast('Bookmark removed', 'info')
  }

  if (!open) return null

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div className="cfp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cfp-panel__tabs">
          <div className="cfp-panel__title-static">
            Bookmarks ({bookmarks.length})
          </div>
          <button className="cfp-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="cfp-panel__body">
          {bookmarks.length === 0 && (
            <div className="cfp-panel__empty">
              No bookmarks yet — use the command palette's "Bookmark Problem"
              command while viewing a problem.
            </div>
          )}
          <div className="cfp-panel__list">
            {bookmarks.map((b) => (
              <div key={b.problemKey} className="cfp-panel__list-item">
                <a href={b.problemUrl}>{b.problemTitle}</a>
                <button
                  className="cfp-panel__list-remove"
                  onClick={() => handleRemove(b.problemKey)}
                  aria-label={`Remove bookmark for ${b.problemTitle}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
