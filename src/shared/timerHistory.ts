export type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro'

export interface TimerSession {
  mode: TimerMode
  durationSeconds: number
  completedAt: number
}

const HISTORY_KEY = 'cfp:timer-history'
const MAX_HISTORY = 30

export async function getTimerHistory(): Promise<TimerSession[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY)
  return (result[HISTORY_KEY] as TimerSession[] | undefined) ?? []
}

export async function recordSession(session: TimerSession): Promise<void> {
  const history = await getTimerHistory()
  const next = [session, ...history].slice(0, MAX_HISTORY)
  await chrome.storage.local.set({ [HISTORY_KEY]: next })
}

export async function clearTimerHistory(): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] })
}
