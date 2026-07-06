/**
 * Codeforces problem URLs come in a few shapes:
 *   /problemset/problem/1878/A
 *   /contest/1878/problem/A
 *   /gym/104128/problem/A
 * We normalize all of them into a single stable key so Notes/Bookmarks work
 * no matter which URL the user reached the problem from.
 */
export interface ProblemRef {
  key: string // e.g. "1878-A"
  contestId: string
  index: string
  url: string
}

export function getCurrentProblem(): ProblemRef | null {
  const path = window.location.pathname
  const patterns = [
    /\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/,
    /\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/,
    /\/gym\/(\d+)\/problem\/([A-Za-z0-9]+)/,
  ]
  for (const re of patterns) {
    const match = path.match(re)
    if (match) {
      const [, contestId, index] = match
      return {
        key: `${contestId}-${index}`,
        contestId,
        index,
        url: window.location.origin + path,
      }
    }
  }
  return null
}

/** Best-effort problem title from the DOM (falls back to the problem key). */
export function getCurrentProblemTitle(fallback: string): string {
  const titleEl = document.querySelector('.problem-statement .header .title')
  const text = titleEl?.textContent?.trim()
  return text && text.length > 0 ? text : fallback
}

export interface SampleTest {
  input: string
  output: string
}

/** Extracts every sample input/output pair from a Codeforces problem page. */
export function getSampleTests(): SampleTest[] {
  const blocks = Array.from(document.querySelectorAll('.sample-test'))
  const samples: SampleTest[] = []

  for (const block of blocks) {
    const inputPres = Array.from(block.querySelectorAll('.input pre'))
    const outputPres = Array.from(block.querySelectorAll('.output pre'))
    
    const count = Math.max(inputPres.length, outputPres.length)
    for (let i = 0; i < count; i++) {
      samples.push({
        input: extractPreText(inputPres[i] || null),
        output: extractPreText(outputPres[i] || null),
      })
    }
  }

  return samples
}

/**
 * Codeforces renders each line of a <pre> as a separate child (often <div>
 * elements) rather than using literal newlines, so a plain .textContent read
 * collapses everything onto one line. Rebuild line breaks from child nodes.
 */
function extractPreText(pre: Element | null): string {
  if (!pre) return ''
  const children = Array.from(pre.childNodes)
  if (children.length === 0) return pre.textContent?.trim() ?? ''

  const lines = children
    .map((node) => node.textContent ?? '')
    .filter((line, idx, arr) => !(line === '' && idx === arr.length - 1))
  return lines.join('\n').trim() || (pre.textContent?.trim() ?? '')
}

export interface LanguageOption {
  id: string
  name: string
}

export const FALLBACK_LANGUAGES: LanguageOption[] = [
  { id: '80', name: 'GNU G++23 64bit (14.2.0)' },
  { id: '73', name: 'GNU G++20 64bit (11.2.0)' },
  { id: '54', name: 'GNU G++17 7.3.0' },
  { id: '31', name: 'Python 3.8.10' },
  { id: '70', name: 'PyPy 3.10 (7.3.15 64bit)' },
  { id: '87', name: 'Java 21 64bit' },
  { id: '60', name: 'Java 17 64bit' },
  { id: '75', name: 'Rust 1.75.0 (2021)' },
  { id: '32', name: 'Go 1.22.0' },
  { id: '65', name: 'C# (.NET 8.0)' },
  { id: '9', name: 'C# (Mono 6.8)' }
]

export async function fetchAvailableLanguages(): Promise<LanguageOption[]> {
  const select = document.querySelector('select[name="programTypeId"]')
  if (select) {
    const options = Array.from(select.querySelectorAll('option'))
    if (options.length > 0) {
      return options.map(opt => ({
        id: opt.value,
        name: opt.textContent?.trim() || ''
      })).filter(lang => lang.id !== '')
    }
  }

  // Fetch /problemset/submit in the background to scrape the latest compilers
  try {
    const res = await fetch('/problemset/submit')
    if (res.ok) {
      const html = await res.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const selectEl = doc.querySelector('select[name="programTypeId"]')
      if (selectEl) {
        const options = Array.from(selectEl.querySelectorAll('option'))
        if (options.length > 0) {
          return options.map(opt => ({
            id: opt.value,
            name: opt.textContent?.trim() || ''
          })).filter(lang => lang.id !== '')
        }
      }
    }
  } catch (err) {
    console.error('Error fetching dynamic languages:', err)
  }

  return FALLBACK_LANGUAGES
}
