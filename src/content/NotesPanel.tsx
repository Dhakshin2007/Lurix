import { useEffect, useRef, useState } from 'react'
import type { ProblemRef } from '@/shared/problem'
import { getNote, saveNote, deleteNote, getNoteIndex, type Note } from '@/shared/notes'
import { showToast } from './toast'

interface Props {
  open: boolean
  onClose: () => void
  problem: ProblemRef | null
  problemTitle: string
}

type Tab = 'current' | 'all'

export default function NotesPanel({ open, onClose, problem, problemTitle }: Props) {
  const [tab, setTab] = useState<Tab>('current')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [allNotes, setAllNotes] = useState<Awaited<ReturnType<typeof getNoteIndex>>>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open || !problem) return
    getNote(problem.key).then((note) => {
      setContent(note?.content ?? '')
      setPinned(note?.pinned ?? false)
      setSavedAt(note?.updatedAt ?? null)
    })
  }, [open, problem])

  useEffect(() => {
    if (tab === 'all') {
      getNoteIndex().then(setAllNotes)
    }
  }, [tab, open])

  function scheduleSave(nextContent: string, nextPinned: boolean) {
    if (!problem) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const note: Note = {
        problemKey: problem.key,
        problemTitle,
        problemUrl: problem.url,
        content: nextContent,
        pinned: nextPinned,
        updatedAt: Date.now(),
      }
      await saveNote(note)
      setSavedAt(note.updatedAt)
    }, 500)
  }

  function handleContentChange(value: string) {
    setContent(value)
    scheduleSave(value, pinned)
  }

  function togglePin() {
    const next = !pinned
    setPinned(next)
    scheduleSave(content, next)
  }

  async function handleDelete() {
    if (!problem) return
    await deleteNote(problem.key)
    setContent('')
    setPinned(false)
    setSavedAt(null)
    showToast('Note deleted', 'info')
  }

  if (!open) return null

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div className="cfp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cfp-panel__tabs">
          <button
            className="cfp-panel__tab"
            data-active={tab === 'current'}
            onClick={() => setTab('current')}
          >
            This Problem
          </button>
          <button
            className="cfp-panel__tab"
            data-active={tab === 'all'}
            onClick={() => setTab('all')}
          >
            All Notes ({allNotes.length})
          </button>
          <button className="cfp-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {tab === 'current' && (
          <div className="cfp-panel__body">
            {!problem ? (
              <div className="cfp-panel__empty">
                Open a Codeforces problem page to take notes on it.
              </div>
            ) : (
              <>
                <div className="cfp-panel__row">
                  <div className="cfp-panel__problem">{problemTitle}</div>
                  <button
                    className={`cfp-pin ${pinned ? 'cfp-pin--on' : ''}`}
                    onClick={togglePin}
                    title="Pin this note"
                  >
                    {pinned ? '★ Pinned' : '☆ Pin'}
                  </button>
                </div>
                <textarea
                  className="cfp-panel__textarea"
                  value={content}
                  placeholder="Write notes for this problem — approach, edge cases, complexity…"
                  onChange={(e) => handleContentChange(e.target.value)}
                />
                <div className="cfp-panel__footer">
                  <span>
                    {savedAt
                      ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
                      : 'Not saved yet'}
                  </span>
                  <button className="cfp-panel__danger" onClick={handleDelete}>
                    Delete note
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'all' && (
          <div className="cfp-panel__body">
            {allNotes.length === 0 && (
              <div className="cfp-panel__empty">
                No notes yet — open a problem and start typing in the "This
                Problem" tab.
              </div>
            )}
            <div className="cfp-panel__list">
              {[...allNotes]
                .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                .map((n) => (
                  <a
                    key={n.problemKey}
                    className="cfp-panel__list-item"
                    href={n.problemUrl}
                  >
                    <span>
                      {n.pinned && '★ '}
                      {n.problemTitle}
                    </span>
                    <span className="cfp-panel__list-meta">
                      {new Date(n.updatedAt).toLocaleDateString()}
                    </span>
                  </a>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
