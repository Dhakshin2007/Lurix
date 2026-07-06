export interface RecentEntry {
  problemKey: string
  problemTitle: string
  problemUrl: string
  visitedAt: number
}

const RECENT_KEY = 'cfp:recent'
const MAX_RECENT = 50

export async function getRecent(): Promise<RecentEntry[]> {
  const result = await chrome.storage.local.get(RECENT_KEY)
  return (result[RECENT_KEY] as RecentEntry[] | undefined) ?? []
}

export async function recordVisit(
  entry: Omit<RecentEntry, 'visitedAt'>
): Promise<void> {
  const list = await getRecent()
  const without = list.filter((r) => r.problemKey !== entry.problemKey)
  const next = [{ ...entry, visitedAt: Date.now() }, ...without].slice(
    0,
    MAX_RECENT
  )
  await chrome.storage.local.set({ [RECENT_KEY]: next })
}

export async function clearRecent(): Promise<void> {
  await chrome.storage.local.set({ [RECENT_KEY]: [] })
}
