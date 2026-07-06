/**
 * Small subsequence fuzzy matcher, good enough for a command palette with a
 * few dozen entries. Returns null when the query's characters don't all
 * appear in order in the target string; otherwise a lower score is a better
 * match (rewards contiguous runs and matches near the start of the string).
 */
export function fuzzyScore(query: string, target: string): number | null {
  if (query.length === 0) return 0

  const q = query.toLowerCase()
  const t = target.toLowerCase()

  let qi = 0
  let score = 0
  let lastMatchIndex = -1

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      const gap = lastMatchIndex === -1 ? ti : ti - lastMatchIndex - 1
      score += gap
      lastMatchIndex = ti
      qi++
    }
  }

  if (qi !== q.length) return null // not all query chars matched, in order
  return score
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string
): T[] {
  if (!query.trim()) return items
  const scored = items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((x): x is { item: T; score: number } => x.score !== null)
  scored.sort((a, b) => a.score - b.score)
  return scored.map((x) => x.item)
}
