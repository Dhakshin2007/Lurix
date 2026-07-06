import { useEffect, useState } from 'react'
import type { usePracticeTimer } from './usePracticeTimer'
import { getTimerHistory, clearTimerHistory, type TimerSession } from '@/shared/timerHistory'

interface Props {
  open: boolean
  onClose: () => void
  timer: ReturnType<typeof usePracticeTimer>
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

export default function TimerPanel({ open, onClose, timer }: Props) {
  const [history, setHistory] = useState<TimerSession[]>([])

  useEffect(() => {
    if (open) getTimerHistory().then(setHistory)
  }, [open, timer.status])

  if (!open) return null

  const display =
    timer.mode === 'stopwatch'
      ? formatTime(timer.elapsedSeconds)
      : formatTime(timer.remainingSeconds ?? 0)

  async function handleClearHistory() {
    await clearTimerHistory()
    setHistory([])
  }

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div className="cfp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cfp-panel__tabs">
          <div className="cfp-panel__title-static">Practice Timer</div>
          <button className="cfp-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="cfp-panel__body">
          <div className="cfp-timer-modes">
            {(['stopwatch', 'countdown', 'pomodoro'] as const).map((m) => (
              <button
                key={m}
                className="cfp-timer-mode"
                data-active={timer.mode === m}
                onClick={() => timer.switchMode(m)}
              >
                {m === 'stopwatch' ? 'Stopwatch' : m === 'countdown' ? 'Countdown' : 'Pomodoro'}
              </button>
            ))}
          </div>

          {timer.mode === 'countdown' && timer.status === 'idle' && (
            <div className="cfp-timer-config">
              <label>Minutes</label>
              <input
                type="number"
                min={1}
                max={180}
                value={timer.countdownMinutes}
                onChange={(e) =>
                  timer.setCountdownMinutes(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
          )}

          {timer.mode === 'pomodoro' && (
            <div className="cfp-timer-phase">
              {timer.isBreak ? '☕ Break' : '🎯 Focus'}
            </div>
          )}

          <div className="cfp-timer-display">{display}</div>

          <div className="cfp-timer-controls">
            {timer.status !== 'running' ? (
              <button className="cfp-timer-btn cfp-timer-btn--primary" onClick={timer.start}>
                {timer.status === 'paused' ? 'Resume' : 'Start'}
              </button>
            ) : (
              <button className="cfp-timer-btn" onClick={timer.pause}>
                Pause
              </button>
            )}
            <button className="cfp-timer-btn" onClick={timer.reset}>
              Reset
            </button>
          </div>

          <div className="cfp-panel__row" style={{ marginTop: 16 }}>
            <div className="cfp-panel__problem">Session History</div>
            {history.length > 0 && (
              <button className="cfp-panel__danger" onClick={handleClearHistory}>
                Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="cfp-panel__empty">
              Completed sessions will show up here.
            </div>
          ) : (
            <div className="cfp-panel__list">
              {history.slice(0, 8).map((s, i) => (
                <div key={i} className="cfp-panel__list-item">
                  <span>
                    {s.mode} · {formatTime(s.durationSeconds)}
                  </span>
                  <span className="cfp-panel__list-meta">
                    {new Date(s.completedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
