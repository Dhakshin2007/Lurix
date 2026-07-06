
export async function augmentContestDashboard() {
  const path = window.location.pathname
  const contestMatch = path.match(/^\/contest\/(\d+)$/) || path.match(/^\/gym\/(\d+)$/)
  if (!contestMatch) return

  const contestId = contestMatch[1]
  const problemsTable = document.querySelector('.problems')
  if (!problemsTable) return

  // Apply basic layout skinning
  problemsTable.classList.add('cfp-contest-table')

  // Find User Handle to check solve status
  const link = document.querySelector('.lang-chooser a[href^="/profile/"]')
  const handle = link?.textContent?.trim() || null

  let userSolves: Record<string, string> = {} // problemIndex -> verdict
  if (handle) {
    try {
      const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`)
      const statusData = await statusRes.json()
      if (statusData.status === 'OK' && statusData.result) {
        statusData.result.forEach((sub: any) => {
          if (String(sub.problem.contestId) === String(contestId)) {
            const index = sub.problem.index.toUpperCase()
            if (sub.verdict === 'OK') {
              userSolves[index] = 'OK'
            } else if (!userSolves[index]) {
              userSolves[index] = 'FAILED'
            }
          }
        })
      }
    } catch (err) {
      console.error('Error fetching user status for dashboard:', err)
    }
  }

  // Fetch Problem Ratings & Tags from official API
  let problemMetadata: Record<string, { rating?: number; tags: string[] }> = {}
  try {
    const apiRes = await fetch('https://codeforces.com/api/problemset.problems')
    const apiData = await apiRes.json()
    if (apiData.status === 'OK' && apiData.result?.problems) {
      apiData.result.problems.forEach((prob: any) => {
        if (String(prob.contestId) === String(contestId)) {
          problemMetadata[prob.index.toUpperCase()] = {
            rating: prob.rating,
            tags: prob.tags || []
          }
        }
      })
    }
  } catch (err) {
    console.error('Error fetching problem ratings for contest:', err)
  }

  // Augment table rows
  const rows = Array.from(problemsTable.querySelectorAll('tr:not(:first-child)'))
  rows.forEach((row) => {
    // Problem index
    const indexCol = row.querySelector('td.id')
    if (!indexCol) return
    const index = indexCol.textContent?.trim().toUpperCase() || ''

    // Solve Status Styling
    const status = userSolves[index]
    if (status === 'OK') {
      row.classList.add('cfp-row--solved')
    } else if (status === 'FAILED') {
      row.classList.add('cfp-row--failed')
    }

    // Title element
    const titleCell = row.querySelector('td:not(.id)')
    if (!titleCell) return
    const titleLink = titleCell.querySelector('a')
    if (!titleLink) return

    // Inject Rating and Tags
    const meta = problemMetadata[index]
    if (meta) {
      // Tags container
      if (meta.tags.length > 0) {
        const tagsContainer = document.createElement('div')
        tagsContainer.className = 'cfp-contest-tags'
        meta.tags.slice(0, 3).forEach((tag) => {
          const pill = document.createElement('span')
          pill.className = 'cfp-tag-pill'
          pill.textContent = tag
          tagsContainer.appendChild(pill)
        })
        titleCell.appendChild(tagsContainer)
      }

      // Rating badge
      if (meta.rating) {
        const ratingBadge = document.createElement('span')
        ratingBadge.className = 'cfp-rating-badge'
        ratingBadge.textContent = `${meta.rating}`
        
        // Color code difficulty
        if (meta.rating < 1200) ratingBadge.classList.add('cfp-rating--easy')
        else if (meta.rating < 1600) ratingBadge.classList.add('cfp-rating--medium')
        else ratingBadge.classList.add('cfp-rating--hard')

        indexCol.appendChild(ratingBadge)
      }
    }
  })
}
