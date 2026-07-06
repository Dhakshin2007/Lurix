import { useCallback, useEffect, useRef, useState } from 'react'
import { recordSession, type TimerMode } from '@/shared/timerHistory'
import { showToast } from './toast'

const POMODORO_FOCUS_MINUTES = 25
const POMODORO_BREAK_MINUTES = 5

interface TimerState {
  mode: TimerMode
  status: 'idle' | 'running' | 'paused'
  countdownMinutes: number
  isBreak: boolean // pomodoro only
  elapsedSeconds: number
}

export function usePracticeTimer() {
  const [state, setState] = useState<TimerState>({
    mode: 'stopwatch',
    status: 'idle',
    countdownMinutes: 25,
    isBreak: false,
    elapsedSeconds: 0,
  })

  const startedAtRef = useRef<number | null>(null)
  const baseElapsedRef = useRef(0)
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (state.status !== 'running') return
    const interval = setInterval(() => forceTick((n) => n + 1), 250)
    return () => clearInterval(interval)
  }, [state.status])

  const targetSeconds =
    state.mode === 'stopwatch'
      ? null
      : state.mode === 'countdown'
        ? state.countdownMinutes * 60
        : (state.isBreak ? POMODORO_BREAK_MINUTES : POMODORO_FOCUS_MINUTES) * 60

  const liveElapsed =
    state.status === 'running' && startedAtRef.current !== null
      ? baseElapsedRef.current + (Date.now() - startedAtRef.current) / 1000
      : baseElapsedRef.current

  const remaining = targetSeconds !== null ? Math.max(0, targetSeconds - liveElapsed) : null

  // Auto-complete countdown / pomodoro when time runs out.
  useEffect(() => {
    if (state.status !== 'running' || targetSeconds === null) return
    if (remaining !== null && remaining <= 0) {
      recordSession({
        mode: state.mode,
        durationSeconds: targetSeconds,
        completedAt: Date.now(),
      })
      if (state.mode === 'pomodoro') {
        const nextIsBreak = !state.isBreak
        showToast(
          nextIsBreak ? 'Focus session done — take a break' : 'Break over — back to it',
          'success'
        )
        baseElapsedRef.current = 0
        startedAtRef.current = Date.now()
        setState((s) => ({ ...s, isBreak: nextIsBreak }))
      } else {
        showToast('Countdown finished', 'success')
        baseElapsedRef.current = 0
        startedAtRef.current = null
        setState((s) => ({ ...s, status: 'idle' }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, state.status])

  const start = useCallback(() => {
    startedAtRef.current = Date.now()
    setState((s) => ({ ...s, status: 'running' }))
  }, [])

  const pause = useCallback(() => {
    if (startedAtRef.current !== null) {
      baseElapsedRef.current += (Date.now() - startedAtRef.current) / 1000
    }
    startedAtRef.current = null
    setState((s) => ({ ...s, status: 'paused' }))
  }, [])

  const reset = useCallback(() => {
    if (
      state.status === 'running' &&
      state.mode === 'stopwatch' &&
      liveElapsed > 1
    ) {
      recordSession({
        mode: 'stopwatch',
        durationSeconds: Math.round(liveElapsed),
        completedAt: Date.now(),
      })
    }
    baseElapsedRef.current = 0
    startedAtRef.current = null
    setState((s) => ({ ...s, status: 'idle', isBreak: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.mode, liveElapsed])

  const switchMode = useCallback((mode: TimerMode) => {
    baseElapsedRef.current = 0
    startedAtRef.current = null
    setState((s) => ({ ...s, mode, status: 'idle', isBreak: false }))
  }, [])

  const setCountdownMinutes = useCallback((minutes: number) => {
    baseElapsedRef.current = 0
    startedAtRef.current = null
    setState((s) => ({ ...s, countdownMinutes: minutes, status: 'idle' }))
  }, [])

  return {
    mode: state.mode,
    status: state.status,
    isBreak: state.isBreak,
    countdownMinutes: state.countdownMinutes,
    elapsedSeconds: liveElapsed,
    remainingSeconds: remaining,
    start,
    pause,
    reset,
    switchMode,
    setCountdownMinutes,
  }
}
