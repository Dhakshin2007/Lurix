import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyFilter } from '@/shared/fuzzy'

export interface Command {
  id: string
  label: string
  hint?: string
  run: () => void
}

interface Props {
  open: boolean
  commands: Command[]
  onClose: () => void
}

export default function CommandPalette({ open, commands, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => fuzzyFilter(commands, query, (c) => c.label),
    [commands, query]
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Focus after the panel has mounted.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  function runActive() {
    const cmd = filtered[activeIndex]
    if (cmd) {
      cmd.run()
      onClose()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runActive()
    }
  }

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div
        className="cfp-palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          className="cfp-palette__input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cfp-palette__list">
          {filtered.length === 0 && (
            <div className="cfp-palette__empty">No matching commands</div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              className="cfp-palette__item"
              data-active={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                cmd.run()
                onClose()
              }}
            >
              <span>{cmd.label}</span>
              {cmd.hint && <span className="cfp-palette__hint">{cmd.hint}</span>}
            </button>
          ))}
        </div>
        <div className="cfp-palette__footer">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
