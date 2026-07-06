import { useEffect, useState, useMemo } from 'react'
import { showToast } from './toast'

interface Props {
  open: boolean
  onClose: () => void
}

interface UserStats {
  rating: number
  rank: string
  solvedCount: number
  attemptedCount: number
  acceptanceRate: number
  avgDifficulty: number
  longestStreak: number
  currentStreak: number
  languageUsage: Record<string, number>
  difficultyDistribution: Record<number, number>
  activityDays: Set<string> // Date strings "YYYY-MM-DD"
}

interface Achievement {
  id: string
  title: string
  desc: string
  unlocked: boolean
  badge: string
}

export default function DashboardPanel({ open, onClose }: Props) {
  const [handle, setHandle] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<UserStats | null>(null)

  // Find handle from page
  useEffect(() => {
    if (open) {
      const link = document.querySelector('.lang-chooser a[href^="/profile/"]')
      const userHandle = link?.textContent?.trim() || null
      setHandle(userHandle)
    }
  }, [open])

  // Fetch stats from official Codeforces APIs
  useEffect(() => {
    if (!open || !handle) return
    setLoading(true)
    
    async function loadData() {
      try {
        // Fetch User Info (Rating, Rank)
        const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`)
        const infoData = await infoRes.json()
        let rating = 0
        let rank = 'unrated'
        if (infoData.status === 'OK' && infoData.result?.[0]) {
          rating = infoData.result[0].rating || 0
          rank = infoData.result[0].rank || 'unrated'
        }

        // Fetch User Submissions (History, Solves, Streaks)
        const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`)
        const statusData = await statusRes.json()
        
        if (statusData.status === 'OK' && statusData.result) {
          const submissions = statusData.result
          const solvedSet = new Set<string>()
          const attemptedSet = new Set<string>()
          let totalSolves = 0
          let totalDifficulty = 0
          let difficultyCount = 0
          
          const languageMap: Record<string, number> = {}
          const difficultyMap: Record<number, number> = {}
          const activityDates = new Set<string>()

          submissions.forEach((sub: any) => {
            const probKey = `${sub.problem.contestId}-${sub.problem.index}`
            const dateStr = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0]
            activityDates.add(dateStr)

            // Language
            const lang = sub.programmingLanguage
            languageMap[lang] = (languageMap[lang] || 0) + 1

            if (sub.verdict === 'OK') {
              if (!solvedSet.has(probKey)) {
                solvedSet.add(probKey)
                totalSolves++
                if (sub.problem.rating) {
                  totalDifficulty += sub.problem.rating
                  difficultyCount++
                  const roundedRating = Math.round(sub.problem.rating / 100) * 100
                  difficultyMap[roundedRating] = (difficultyMap[roundedRating] || 0) + 1
                }
              }
            } else {
              attemptedSet.add(probKey)
            }
          })

          // Calculate Streaks
          const sortedDates = Array.from(activityDates).sort()
          let currentStr = 0
          let longestStr = 0
          if (sortedDates.length > 0) {
            let tempStr = 1
            longestStr = 1
            for (let i = 1; i < sortedDates.length; i++) {
              const prev = new Date(sortedDates[i - 1]).getTime()
              const curr = new Date(sortedDates[i]).getTime()
              const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)
              if (diffDays <= 1.1) {
                tempStr++
                longestStr = Math.max(longestStr, tempStr)
              } else {
                tempStr = 1
              }
            }

            // Current Streak
            const lastDate = new Date(sortedDates[sortedDates.length - 1]).getTime()
            const today = new Date().getTime()
            const daysSinceLastActivity = (today - lastDate) / (1000 * 60 * 60 * 24)
            if (daysSinceLastActivity <= 1.9) {
              currentStr = tempStr
            }
          }

          setStats({
            rating,
            rank,
            solvedCount: totalSolves,
            attemptedCount: submissions.length,
            acceptanceRate: submissions.length > 0 ? Math.round((submissions.filter((s: any) => s.verdict === 'OK').length / submissions.length) * 100) : 0,
            avgDifficulty: difficultyCount > 0 ? Math.round(totalDifficulty / difficultyCount) : 0,
            currentStreak: currentStr,
            longestStreak: longestStr,
            languageUsage: languageMap,
            difficultyDistribution: difficultyMap,
            activityDays: activityDates
          })
        }
      } catch (err) {
        showToast('Error loading stats from Codeforces API', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open, handle])

  // Real-time Achievements evaluation
  const achievementsList: Achievement[] = useMemo(() => {
    if (!stats) return []
    return [
      {
        id: 'first-accepted',
        title: 'Hello World',
        desc: 'Achieve your first Accepted solution.',
        unlocked: stats.solvedCount >= 1,
        badge: '🟢'
      },
      {
        id: 'century-solver',
        title: 'Century Solver',
        desc: 'Solve 100 unique problems.',
        unlocked: stats.solvedCount >= 100,
        badge: '💯'
      },
      {
        id: 'grand-solver',
        title: 'Grand Solver',
        desc: 'Solve 500 unique problems.',
        unlocked: stats.solvedCount >= 500,
        badge: '🏆'
      },
      {
        id: 'hot-streak',
        title: 'Consistent Solver',
        desc: 'Maintain a practice streak of 30 days.',
        unlocked: stats.longestStreak >= 30,
        badge: '🔥'
      },
      {
        id: 'specialist-rank',
        title: 'Specialist Rank',
        desc: 'Reach Specialist tier (>= 1400 rating).',
        unlocked: stats.rating >= 1400,
        badge: '⭐'
      },
      {
        id: 'expert-rank',
        title: 'Expert Rank',
        desc: 'Reach Expert tier (>= 1600 rating).',
        unlocked: stats.rating >= 1600,
        badge: '🌟'
      },
      {
        id: 'candidate-master-rank',
        title: 'Candidate Master',
        desc: 'Reach Candidate Master (>= 1900 rating).',
        unlocked: stats.rating >= 1900,
        badge: '👑'
      }
    ]
  }, [stats])

  // Heatmap SVG Calculation (Last 365 Days)
  const heatmapSvg = useMemo(() => {
    if (!stats) return null
    
    const weeksCount = 53
    const daysInWeek = 7
    const today = new Date()
    const millisecondsInDay = 24 * 60 * 60 * 1000
    
    // Backtrack 365 days to start date
    const startDate = new Date(today.getTime() - 364 * millisecondsInDay)
    
    const cells: React.ReactNode[] = []
    
    for (let w = 0; w < weeksCount; w++) {
      for (let d = 0; d < daysInWeek; d++) {
        const offset = w * 7 + d
        const cellDate = new Date(startDate.getTime() + offset * millisecondsInDay)
        const dateStr = cellDate.toISOString().split('T')[0]
        
        if (cellDate > today) continue

        const hasActivity = stats.activityDays.has(dateStr)
        const color = hasActivity ? 'var(--cfp-accent)' : 'var(--cfp-border)'
        const opacity = hasActivity ? '1.0' : '0.2'
        
        cells.push(
          <rect
            key={`${w}-${d}`}
            x={w * 12}
            y={d * 12}
            width={10}
            height={10}
            rx={2}
            fill={color}
            opacity={opacity}
            style={{ transition: 'fill 150ms ease' }}
          >
            <title>{`${dateStr}: ${hasActivity ? 'Active practice day' : 'No solves'}`}</title>
          </rect>
        )
      }
    }
    
    return (
      <svg width={weeksCount * 12} height={daysInWeek * 12} className="cfp-heatmap">
        {cells}
      </svg>
    )
  }, [stats])

  if (!open) return null

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div className="cfp-panel cfp-panel--large" onMouseDown={(e) => e.stopPropagation()} style={{ width: '680px', maxHeight: '85vh' }}>
        <div className="cfp-panel__tabs">
          <div className="cfp-panel__title-static">Practice Dashboard & Analytics</div>
          <button className="cfp-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="cfp-panel__body" style={{ overflowY: 'auto' }}>
          {!handle ? (
            <div className="cfp-panel__empty">
              Log in to Codeforces to inspect practice statistics and milestone achievements.
            </div>
          ) : loading ? (
            <div className="cfp-console-status">
              <div className="cfp-workspace-spinner"></div>
              Querying statistics from Codeforces APIs...
            </div>
          ) : stats ? (
            <div className="cfp-dashboard">
              {/* Profile Card Header */}
              <div className="cfp-dashboard__profile-card">
                <div className="cfp-dashboard__handle">{handle}</div>
                <div className="cfp-dashboard__rank">
                  {stats.rank.toUpperCase()} ({stats.rating || 'Unrated'})
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="cfp-dashboard__metrics-grid">
                <div className="cfp-dashboard__metric">
                  <div className="cfp-dashboard__metric-val">{stats.solvedCount}</div>
                  <div className="cfp-dashboard__metric-lbl">Problems Solved</div>
                </div>
                <div className="cfp-dashboard__metric">
                  <div className="cfp-dashboard__metric-val">{stats.acceptanceRate}%</div>
                  <div className="cfp-dashboard__metric-lbl">Acceptance Rate</div>
                </div>
                <div className="cfp-dashboard__metric">
                  <div className="cfp-dashboard__metric-val">{stats.currentStreak} days</div>
                  <div className="cfp-dashboard__metric-lbl">Current Streak</div>
                </div>
                <div className="cfp-dashboard__metric">
                  <div className="cfp-dashboard__metric-val">{stats.avgDifficulty}</div>
                  <div className="cfp-dashboard__metric-lbl">Avg. Difficulty</div>
                </div>
              </div>

              {/* Contribution Activity Heatmap */}
              <div className="cfp-dashboard__section">
                <h3>Activity Map (Last 365 Days)</h3>
                <div className="cfp-dashboard__heatmap-container">{heatmapSvg}</div>
              </div>

              {/* Languages & Difficulties */}
              <div className="cfp-dashboard__two-cols">
                <div className="cfp-dashboard__col">
                  <h3>Favorite Languages</h3>
                  <div className="cfp-dashboard__list">
                    {Object.entries(stats.languageUsage)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([lang, count]) => (
                        <div key={lang} className="cfp-dashboard__list-row">
                          <span>{lang}</span>
                          <strong>{count} submissions</strong>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="cfp-dashboard__col">
                  <h3>Streaks & Records</h3>
                  <div className="cfp-dashboard__list">
                    <div className="cfp-dashboard__list-row">
                      <span>Longest Practice Streak</span>
                      <strong>{stats.longestStreak} days</strong>
                    </div>
                    <div className="cfp-dashboard__list-row">
                      <span>Total Attempted Problems</span>
                      <strong>{Object.keys(stats.languageUsage).reduce((a, b) => a + stats.languageUsage[b], 0)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements Section */}
              <div className="cfp-dashboard__section">
                <h3>Milestone Achievements</h3>
                <div className="cfp-dashboard__achievements-grid">
                  {achievementsList.map((ach) => (
                    <div
                      key={ach.id}
                      className={`cfp-ach-card ${ach.unlocked ? 'cfp-ach-card--unlocked' : 'cfp-ach-card--locked'}`}
                    >
                      <div className="cfp-ach-card__badge">{ach.badge}</div>
                      <div>
                        <div className="cfp-ach-card__title">
                          {ach.title} {ach.unlocked ? '✓' : '🔒'}
                        </div>
                        <div className="cfp-ach-card__desc">{ach.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="cfp-panel__empty">Could not load statistics.</div>
          )}
        </div>
      </div>
    </div>
  )
}
