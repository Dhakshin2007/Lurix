import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { initVimMode } from 'monaco-vim'
import type { ProblemRef, LanguageOption } from '@/shared/problem'
import { getSampleTests, fetchAvailableLanguages } from '@/shared/problem'
import type { SampleTest } from '@/shared/problem'
import {
  getProblemCode,
  saveProblemCode,
  getProblemLang,
  saveProblemLang,
  getTemplate,
  saveTemplate,
  getCustomSamples,
  saveCustomSamples,
  getProblemHistory,
  saveProblemHistory,
  type RunHistoryItem,
  type CFPSettings,
  type CustomSampleTest
} from '@/shared/storage'
import { showToast } from './toast'

// Bind statically compiled Monaco editor to the React wrapper loader.
// Bypasses dynamic script injection to avoid MV3 CSP worker loading blocks.
loader.config({ monaco })

// Inline worker factory to bypass CSP cross-origin worker script blocking
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorker: function () {
      const blob = new Blob([`self.onmessage = function(e) {};`], { type: 'application/javascript' })
      return new Worker(URL.createObjectURL(blob))
    }
  }
}

interface WorkspaceProps {
  problem: ProblemRef
  problemTitle: string
  settings: CFPSettings
  updateSettings: (patch: Partial<CFPSettings>) => void
  onClose: () => void
}

type TabId = 'samples' | 'custom' | 'submissions'
type VerdictStatus = 'idle' | 'running' | 'done' | 'error'

// Default console height when maximizing
const DEFAULT_CONSOLE_HEIGHT = 250

export default function Workspace({
  problem,
  problemTitle,
  settings,
  updateSettings,
  onClose
}: WorkspaceProps) {
  const [code, setCode] = useState('')
  const [langId, setLangId] = useState('')
  const [loading, setLoading] = useState(true)

  const [layoutMode, setLayoutMode] = useState<'split' | 'editor-only' | 'problem-only'>(
    settings.workspaceActive ? 'split' : 'problem-only'
  )
  const [splitRatio, setSplitRatio] = useState(settings.splitRatio)
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [consoleHeight, setConsoleHeight] = useState(DEFAULT_CONSOLE_HEIGHT)
  const savedConsoleHeightRef = useRef(DEFAULT_CONSOLE_HEIGHT) // remembers height before minimize
  const [activeTab, setActiveTab] = useState<TabId>('samples')

  // Available Languages list parsed dynamically from page or submission page
  const [languagesList, setLanguagesList] = useState<LanguageOption[]>([])

  useEffect(() => {
    fetchAvailableLanguages().then(setLanguagesList)
  }, [])

  // Sample tests parsed from Codeforces problem container
  const parsedSampleTests = useMemo(() => getSampleTests(), [])
  
  // User-added custom sample tests (e.g. from failed submissions)
  const [customSamples, setCustomSamples] = useState<CustomSampleTest[]>([])
  
  // Combined samples: parsed from DOM + user-added
  const sampleTests: SampleTest[] = useMemo(() => {
    const base = parsedSampleTests.map(s => ({ input: s.input, output: s.output }))
    const added = customSamples.map(s => ({ input: s.input, output: s.output }))
    return [...base, ...added]
  }, [parsedSampleTests, customSamples])

  // Runner & Console state
  const [samplesStatus, setSamplesStatus] = useState<VerdictStatus>('idle')
  const [sampleOutputs, setSampleOutputs] = useState<string[]>([])
  const [sampleErrors, setSampleErrors] = useState<string[]>([])
  const [sampleVerdicts, setSampleVerdicts] = useState<('OK' | 'WA' | 'ERR' | 'pending' | null)[]>([])
  const [sampleTime, setSampleTime] = useState<number[]>([])

  const [customInput, setCustomInput] = useState('')
  const [customOutput, setCustomOutput] = useState('')
  const [customError, setCustomError] = useState('')
  const [customStatus, setCustomStatus] = useState<VerdictStatus>('idle')
  const [customTime, setCustomTime] = useState<number | null>(null)
  const [customMemory, setCustomMemory] = useState<number | null>(null)

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'queued' | 'testing' | 'done'>('idle')
  const [submitId, setSubmitId] = useState<string | null>(null)
  const [submitVerdict, setSubmitVerdict] = useState<string | null>(null)
  const [submitPassed, setSubmitPassed] = useState<number | null>(null)
  const [submitTime, setSubmitTime] = useState<number | null>(null)
  const [submitMemory, setSubmitMemory] = useState<number | null>(null)
  // Failed test case data from last submission
  const [failedTestData, setFailedTestData] = useState<{input: string, expected: string, output: string, testNumber: number} | null>(null)

  const [history, setHistory] = useState<RunHistoryItem[]>([])

  // Template system state
  const [templateSavedDate, setTemplateSavedDate] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const leftPaneRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const editorRef = useRef<any>(null)
  const vimModeRef = useRef<any>(null)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Detect if this is a contest problem (active contest)
  const isContestProblem = useMemo(() => {
    const path = window.location.pathname
    return path.includes('/contest/') && !path.includes('/gym/')
  }, [])

  // Map Codeforces Language to Monaco Language ID
  const monacoLanguage = useMemo(() => {
    const matchedLang = languagesList.find((l) => l.id === langId)
    if (!matchedLang) return 'cpp'
    const name = matchedLang.name.toLowerCase()
    if (name.includes('c++') || name.includes('g++') || name.includes('clang++') || name.includes('msvc++')) return 'cpp'
    if (name.includes('python') || name.includes('pypy')) return 'python'
    if (name.includes('java')) return 'java'
    if (name.includes('kotlin')) return 'kotlin'
    if (name.includes('rust')) return 'rust'
    if (name.includes('go')) return 'go'
    if (name.includes('c#') || name.includes('mono') || name.includes('.net')) return 'csharp'
    if (name.includes('javascript') || name.includes('node')) return 'javascript'
    if (name.includes('typescript')) return 'typescript'
    if (name.includes('ruby')) return 'ruby'
    if (name.includes('php')) return 'php'
    if (name.includes('haskell')) return 'haskell'
    if (name.includes('scala')) return 'scala'
    if (name.includes('pascal')) return 'pascal'
    return 'plaintext'
  }, [langId, languagesList])

  // Load problem code and language from storage
  useEffect(() => {
    async function loadWorkspaceState() {
      setLoading(true)
      const storedCode = await getProblemCode(problem.key)
      const storedLang = await getProblemLang(problem.key)
      const storedHistory = await getProblemHistory(problem.key)
      const storedCustomSamples = await getCustomSamples(problem.key)

      setCode(storedCode || '// Write your solution here\n')
      setHistory(storedHistory)
      setCustomSamples(storedCustomSamples)
      
      if (storedLang && languagesList.some((l) => l.id === storedLang)) {
        setLangId(storedLang)
      } else if (languagesList.length > 0) {
        // Default to G++23 or G++20 or first item
        const gpp = languagesList.find((l) => l.name.includes('G++23') || l.name.includes('G++20') || l.name.includes('G++17'))
        setLangId(gpp ? gpp.id : languagesList[0].id)
      }
      setLoading(false)
    }
    loadWorkspaceState()
  }, [problem.key, languagesList])

  // Load template info when language changes
  useEffect(() => {
    if (langId) {
      getTemplate(langId).then(tmpl => {
        setTemplateSavedDate(tmpl ? Date.now() : null) // Using current time as fallback just for indicator
      })
    }
  }, [langId])



  // Save code changes to storage (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleCodeChange(val: string | undefined) {
    const nextCode = val || ''
    setCode(nextCode)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveProblemCode(problem.key, nextCode)
    }, 400)
  }

  // Save selected language to storage
  function handleLanguageChange(id: string) {
    setLangId(id)
    saveProblemLang(problem.key, id)
  }

  // ── History Management ──────────────────────────────────────
  function addHistoryItem(item: RunHistoryItem) {
    setHistory((prev) => {
      const next = [item, ...prev]
      saveProblemHistory(problem.key, next).catch(console.error)
      return next
    })
  }

  // ── Template Management (Single slot) ──────────────────────────────
  async function loadTemplate() {
    const tmplCode = await getTemplate(langId)
    if (!tmplCode) {
      showToast(`No template saved for this language. Save code first.`, 'error')
      return
    }
    const currentCode = code.trim()
    if (currentCode.length > 0 && currentCode !== '// Write your solution here') {
      const confirmed = window.confirm(`This will replace your current code with the saved template. Continue?`)
      if (!confirmed) return
    }
    setCode(tmplCode)
    saveProblemCode(problem.key, tmplCode)
    showToast(`Template loaded!`, 'success')
  }

  async function saveCodeAsTemplate() {
    if (!code.trim()) {
      showToast('Write some code first before saving as template.', 'error')
      return
    }
    await saveTemplate(langId, code)
    setTemplateSavedDate(Date.now())
    showToast(`Saved as Template!`, 'success')
  }

  // ── Add Failed Test Case to Samples ─────────────────────────────
  function addFailedTestToSamples(input: string, expectedOutput: string) {
    const newSample: CustomSampleTest = {
      input,
      output: expectedOutput,
      source: `failed-submission-${submitId || 'unknown'}`
    }
    const updated = [...customSamples, newSample]
    setCustomSamples(updated)
    saveCustomSamples(problem.key, updated).catch(console.error)
    showToast(`Test case added! You now have ${sampleTests.length + 1} sample test cases.`, 'success')
    setActiveTab('samples')
  }

  // Handle Resizer Mouse Dragging (Vertical or Horizontal split)
  const handleSplitResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const isVertical = settings.layoutMode === 'vertical'
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = leftPaneRef.current?.getBoundingClientRect().width || 0
    const startHeight = leftPaneRef.current?.getBoundingClientRect().height || 0
    const totalWidth = containerRef.current?.getBoundingClientRect().width || 1
    const totalHeight = containerRef.current?.getBoundingClientRect().height || 1

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isVertical) {
        const deltaX = moveEvent.clientX - startX
        let newRatio = (startWidth + deltaX) / totalWidth
        newRatio = Math.max(0.15, Math.min(0.85, newRatio))
        setSplitRatio(newRatio)
        updateSettings({ splitRatio: newRatio })
      } else {
        const deltaY = moveEvent.clientY - startY
        let newRatio = (startHeight + deltaY) / totalHeight
        newRatio = Math.max(0.15, Math.min(0.85, newRatio))
        setSplitRatio(newRatio)
        updateSettings({ splitRatio: newRatio })
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (editorRef.current) editorRef.current.layout()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function openConsole() {
    const restoreHeight = savedConsoleHeightRef.current >= DEFAULT_CONSOLE_HEIGHT
      ? savedConsoleHeightRef.current
      : DEFAULT_CONSOLE_HEIGHT
    setConsoleHeight(restoreHeight)
    setConsoleOpen(true)
  }

  function minimizeConsole() {
    // Save the current height before minimizing
    if (consoleHeight >= 100) {
      savedConsoleHeightRef.current = consoleHeight
    }
    setConsoleOpen(false)
  }

  const handleHorizontalResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = consoleOpen ? consoleHeight : 36

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      
      // Auto-open if dragging up while minimized
      if (!consoleOpen && deltaY < -10) {
        setConsoleOpen(true)
      }

      const newHeight = Math.max(100, Math.min(600, startHeight - deltaY))
      setConsoleHeight(newHeight)
      savedConsoleHeightRef.current = newHeight
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (editorRef.current) editorRef.current.layout()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Toggle layout mode
  function switchLayout(mode: 'split' | 'editor-only' | 'problem-only') {
    setLayoutMode(mode)
    updateSettings({ workspaceActive: mode !== 'problem-only' })
    setTimeout(() => {
      if (editorRef.current) editorRef.current.layout()
    }, 50)
  }

  // Get Codeforces CSRF Token from DOM
  function getCsrfToken(): string {
    const meta = document.querySelector('meta[name="X-Csrf-Token"]')?.getAttribute('content')
    if (meta) return meta
    const input = document.querySelector('input[name="csrf_token"]') as HTMLInputElement
    if (input) return input.value

    const scripts = Array.from(document.getElementsByTagName('script'))
    for (const script of scripts) {
      const text = script.textContent || ''
      const match = text.match(/(?:csrf_token|headerCsrfToken)\s*=\s*['"]([a-f0-9]{32})['\"]/i)
      if (match) return match[1]
      const match2 = text.match(/(?:csrf_token|headerCsrfToken)\s*=\s*['"]([^'"]+)['"]/)
      if (match2) return match2[1]
    }
    return ''
  }

  // Get Logged In Handle from DOM
  function getLoggedHandle(): string | null {
    const link = document.querySelector('.lang-chooser a[href^="/profile/"]')
    return link?.textContent?.trim() || null
  }

  // Execute code via background service worker → Piston API
  async function executeCode(sourceCode: string, inputText: string, languageId: string): Promise<{
    output: string
    stderr: string
    exitCode: number
    isCompileError: boolean
    signal: string | null
  }> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'cfp/execute-code',
          source: sourceCode,
          input: inputText,
          langId: languageId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Extension communication error'))
            return
          }
          if (!response || !response.success) {
            reject(new Error(response?.error || 'Code execution failed'))
            return
          }
          resolve(response)
        }
      )
    })
  }

  // Run a Custom Test Case
  async function runCustomInput() {
    if (customStatus === 'running') return
    setCustomStatus('running')
    setCustomOutput('')
    setCustomError('')
    openConsole()
    setActiveTab('custom')

    try {
      const result = await executeCode(code, customInput, langId)

      setCustomStatus('done')

      if (result.isCompileError) {
        setCustomError(result.stderr)
        setCustomOutput('')
        showToast('Compilation Error', 'error')
      } else {
        setCustomOutput(result.output)
        if (result.stderr && result.stderr.trim().length > 0) {
          setCustomError(result.stderr)
        }
        if (result.exitCode !== 0) {
          showToast(`Runtime Error (exit code ${result.exitCode})`, 'error')
        }
      }

      setCustomTime(null)
      setCustomMemory(null)

      // Add to History
      addHistoryItem({
        id: `custom-${Date.now()}`,
        timestamp: Date.now(),
        sourceCode: code,
        type: 'custom',
        status: result.isCompileError ? 'CE' : result.exitCode !== 0 ? 'RE' : 'Success',
        output: result.output,
        compilerMarkup: result.stderr
      })
    } catch (err: any) {
      setCustomStatus('error')
      setCustomError(err.message || 'Error occurred')
      showToast(err.message || 'Custom run failed', 'error')
    }
  }

  // Run all Sample Test Cases
  async function runSamples() {
    if (samplesStatus === 'running') return
    if (sampleTests.length === 0) {
      showToast('No samples parsed for this problem', 'error')
      return
    }

    setSamplesStatus('running')
    openConsole()
    setActiveTab('samples')
    
    const nextOutputs = new Array(sampleTests.length).fill('')
    const nextErrors = new Array(sampleTests.length).fill('')
    const nextVerdicts = new Array(sampleTests.length).fill('pending')
    const nextTimes = new Array(sampleTests.length).fill(0)
    
    setSampleOutputs([...nextOutputs])
    setSampleErrors([...nextErrors])
    setSampleVerdicts([...nextVerdicts])
    setSampleTime([...nextTimes])

    for (let i = 0; i < sampleTests.length; i++) {
      const sample = sampleTests[i]
      try {
        nextVerdicts[i] = 'running'
        setSampleVerdicts([...nextVerdicts])

        const result = await executeCode(code, sample.input, langId)

        nextOutputs[i] = result.output
        
        if (result.isCompileError) {
          nextErrors[i] = result.stderr
          nextVerdicts[i] = 'CE'
        } else if (result.exitCode !== 0) {
          nextErrors[i] = result.stderr || `Exit code: ${result.exitCode}`
          nextVerdicts[i] = 'RE'
        } else {
          if (result.stderr && result.stderr.trim().length > 0) {
            nextErrors[i] = result.stderr
          }
          // Judge-style output comparison: trim each line, strip trailing blank lines
          const normalizeOutput = (s: string) =>
            s.replace(/\r\n/g, '\n')
             .split('\n')
             .map(line => line.trimEnd())
             .join('\n')
             .replace(/\n+$/, '')
             .trim()
          
          const cleanExpected = normalizeOutput(sample.output)
          const cleanOutput = normalizeOutput(result.output || '')
          
          if (cleanExpected === cleanOutput) {
            nextVerdicts[i] = 'OK'
          } else {
            nextVerdicts[i] = 'WA'
          }
        }

        setSampleOutputs([...nextOutputs])
        setSampleErrors([...nextErrors])
        setSampleVerdicts([...nextVerdicts])
        setSampleTime([...nextTimes])

        // If we got a compile error, no point running remaining samples
        if (result.isCompileError) {
          for (let j = i + 1; j < sampleTests.length; j++) {
            nextVerdicts[j] = 'CE'
            nextErrors[j] = 'Skipped (compilation error)'
          }
          setSampleVerdicts([...nextVerdicts])
          setSampleErrors([...nextErrors])
          break
        }

      } catch (err: any) {
        nextErrors[i] = err.message || 'Error occurred'
        nextVerdicts[i] = 'ERR'
        setSampleErrors([...nextErrors])
        setSampleVerdicts([...nextVerdicts])
      }
    }

    setSamplesStatus('done')
    showToast('Completed running samples', 'info')
  }

  // ── Fetch Failed Test Case from Submission Page ─────────────────
  async function fetchFailedTestCase(submissionId: string) {
    try {
      showToast('Fetching failed test case...', 'info')
      const contestId = problem.contestId
      const url = `/contest/${contestId}/submission/${submissionId}`
      
      const res = await fetch(url)
      if (!res.ok) {
        // Try problemset URL
        const altUrl = `/submission/${submissionId}`
        const altRes = await fetch(altUrl)
        if (!altRes.ok) {
          showToast('Could not fetch submission details. It may not be available yet.', 'error')
          return
        }
        const html = await altRes.text()
        parseAndSetFailedTestCase(html, submissionId)
        return
      }
      const html = await res.text()
      parseAndSetFailedTestCase(html, submissionId)
    } catch (err: any) {
      showToast(`Failed to fetch test case: ${err.message}`, 'error')
    }
  }

  function parseAndSetFailedTestCase(html: string, submissionId: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // Codeforces puts test case data in elements with specific classes
    const inputEl = doc.querySelector('.test-example-line') || doc.querySelector('.input pre') || doc.querySelector('[class*="input"]')
    const answerEl = doc.querySelector('.answer') || doc.querySelector('[class*="answer"]')
    const outputEl = doc.querySelector('.output') || doc.querySelector('[class*="output"]')
    
    // Try the round-box approach (common in CF submission pages)
    const roundBoxes = doc.querySelectorAll('.roundbox .titled')
    let testInput = ''
    let testExpected = ''
    let testOutput = ''
    let testNumber = 1
    
    // Parse from the checker log / test case sections
    const allPres = doc.querySelectorAll('pre')
    const preTexts: string[] = []
    allPres.forEach(pre => {
      const text = pre.textContent?.trim() || ''
      if (text.length > 0) preTexts.push(text)
    })
    
    // Look for "Input", "Output", "Answer" headers
    const allHeaders = doc.querySelectorAll('.section-title')
    let currentSection = ''
    allHeaders.forEach(header => {
      const text = header.textContent?.trim().toLowerCase() || ''
      const nextPre = header.nextElementSibling?.querySelector('pre') || header.nextElementSibling
      const preText = nextPre?.textContent?.trim() || ''
      
      if (text.includes('input')) {
        testInput = preText
      } else if (text.includes('answer') || text.includes('jury') || text.includes('expected')) {
        testExpected = preText
      } else if (text.includes('output') || text.includes('participant')) {
        testOutput = preText
      }
    })

    // Fallback: try to find test number from verdict text
    const verdictText = doc.querySelector('.verdict-format-judged')?.textContent || ''
    const testMatch = verdictText.match(/test\s*(\d+)/i)
    if (testMatch) testNumber = parseInt(testMatch[1])

    if (testInput || testExpected || testOutput) {
      setFailedTestData({
        input: testInput,
        expected: testExpected,
        output: testOutput,
        testNumber
      })
      showToast('Failed test case data loaded!', 'success')
    } else {
      showToast('Could not parse test case data from submission page. Codeforces may not expose this data for this problem.', 'error')
    }
  }

  // Submit Code to Codeforces Queue
  async function submitSolutionCode() {
    if (submitStatus === 'submitting' || submitStatus === 'testing' || submitStatus === 'queued') return
    const csrf = getCsrfToken()
    const handle = getLoggedHandle()
    
    if (!csrf) {
      showToast('CSRF Token not found. Are you logged in?', 'error')
      return
    }
    if (!handle) {
      showToast('Please log in to Codeforces to submit solutions.', 'error')
      return
    }

    setSubmitStatus('submitting')
    setSubmitVerdict(null)
    setSubmitPassed(null)
    setSubmitTime(null)
    setSubmitMemory(null)
    setFailedTestData(null)
    openConsole()
    setActiveTab('submissions')

    try {
      // Formulate action URL based on gym vs contest vs problemset
      let submitUrl = '/problemset/submit?action=submitSolution'
      const path = window.location.pathname
      if (path.includes('/gym/')) {
        submitUrl = `/gym/${problem.contestId}/submit?action=submitSolution`
      } else if (path.includes('/contest/')) {
        submitUrl = `/contest/${problem.contestId}/submit?action=submitSolution`
      }

      const formData = new FormData()
      formData.append('csrf_token', csrf)
      formData.append('action', 'submitSolution')
      if (submitUrl.includes('/problemset/')) {
        formData.append('submittedProblemCode', `${problem.contestId}${problem.index}`)
      } else {
        formData.append('submittedProblemIndex', problem.index)
      }
      formData.append('programTypeId', langId)
      formData.append('source', code)
      formData.append('tabSize', '4')

      const res = await fetch(submitUrl, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error(`Submission failed with status ${res.status}`)
      }

      setSubmitStatus('queued')
      setSubmitVerdict('IN QUEUE')
      showToast('Solution submitted! Waiting in queue...', 'success')

      // Start polling the official API user.status
      let attempts = 0
      
      const interval = setInterval(async () => {
        attempts++
        if (attempts > 60) {
          // Timeout after 90 seconds
          clearInterval(interval)
          setSubmitStatus('done')
          setSubmitVerdict('TIMEOUT')
          showToast('Polling verdict timed out. Check your status manually.', 'error')
          return
        }

        try {
          const apiRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&count=5`)
          if (!apiRes.ok) return
          const data = await apiRes.json()
          
          if (data.status === 'OK' && data.result) {
            // Find our submission: matching problem index, contest id and within recent timestamps
            const match = data.result.find((sub: any) => {
              const isMatch = String(sub.problem.contestId) === String(problem.contestId) &&
                String(sub.problem.index).toUpperCase() === String(problem.index).toUpperCase()
              return isMatch
            })

            if (match) {
              setSubmitId(String(match.id))

              // Check if the verdict is ready
              if (match.verdict) {
                if (match.verdict === 'TESTING') {
                  // Still being tested
                  setSubmitStatus('testing')
                  setSubmitVerdict(`TESTING (Test ${match.passedTestCount + 1})`)
                  setSubmitPassed(match.passedTestCount)
                } else {
                  // Final verdict reached
                  clearInterval(interval)
                  setSubmitStatus('done')
                  setSubmitVerdict(match.verdict)
                  setSubmitPassed(match.passedTestCount)
                  setSubmitTime(match.timeConsumedMillis)
                  setSubmitMemory(match.memoryConsumedBytes ? Math.round(match.memoryConsumedBytes / 1024) : null)

                  if (match.verdict === 'OK') {
                    showToast('✅ ACCEPTED!', 'success')
                  } else {
                    showToast(`❌ VERDICT: ${match.verdict} on test ${match.passedTestCount + 1}`, 'error')
                    // Attempt to fetch failed test case for non-contest problems
                    if (!isContestProblem) {
                      fetchFailedTestCase(String(match.id))
                    }
                  }

                  // Add to history list
                  addHistoryItem({
                    id: `sub-${match.id}`,
                    timestamp: Date.now(),
                    sourceCode: code,
                    type: 'submission',
                    status: match.verdict,
                    timeConsumed: match.timeConsumedMillis,
                    memoryConsumed: match.memoryConsumedBytes,
                    verdict: match.verdict,
                    passedTests: match.passedTestCount
                  })
                }
              } else {
                // No verdict yet → In Queue
                setSubmitStatus('queued')
                setSubmitVerdict('IN QUEUE')
              }
            }
          }
        } catch (err) {
          console.error('Error fetching submission status:', err)
        }
      }, 1500)

    } catch (err: any) {
      setSubmitStatus('idle')
      showToast(err.message || 'Submission failed', 'error')
    }
  }

  // Vim bindings mount
  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor
    
    // Set font size and Monaco defaults
    editor.updateOptions({
      fontSize: settings.fontSize,
      fontFamily: 'var(--cfp-font-mono, monospace)',
      minimap: { enabled: true },
      lineNumbers: 'on',
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      folding: true,
      bracketPairColorization: { enabled: true },
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      wordWrap: 'on',
      tabSize: 4
    })

    // External paste works by default since we removed competitive mode overrides.

    // Cache problem statement for offline view
    const statementEl = document.querySelector('.problem-statement')
    if (statementEl) {
      chrome.storage.local.set({
        [`cfp:cache:statement:${problem.key}`]: statementEl.outerHTML
      })
    }

    // 1. Vim Mode
    if (settings.keyboardMode === 'vim') {
      const statusNode = document.getElementById('cfp-vim-status')
      vimModeRef.current = initVimMode(editor, statusNode)
    }

    // 2. Emacs Mode
    if (settings.keyboardMode === 'emacs') {
      // Ctrl+A: Beginning of line
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyA, () => {
        const pos = editor.getPosition()
        if (pos) editor.setPosition({ lineNumber: pos.lineNumber, column: 1 })
      })
      // Ctrl+E: End of line
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyE, () => {
        const pos = editor.getPosition()
        if (pos) {
          const lineVal = editor.getModel().getLineContent(pos.lineNumber)
          editor.setPosition({ lineNumber: pos.lineNumber, column: lineVal.length + 1 })
        }
      })
      // Ctrl+K: Kill line
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK, () => {
        const pos = editor.getPosition()
        if (pos) {
          const model = editor.getModel()
          const lineVal = model.getLineContent(pos.lineNumber)
          const range = new monacoInstance.Range(pos.lineNumber, pos.column, pos.lineNumber, lineVal.length + 1)
          editor.executeEdits('emacs-kill', [{ range, text: '' }])
        }
      })
      // Ctrl+Y: Yank (Paste)
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyY, () => {
        navigator.clipboard.readText().then((text) => {
          const pos = editor.getPosition()
          if (pos && text) {
            const range = new monacoInstance.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
            editor.executeEdits('emacs-yank', [{ range, text }])
          }
        })
      })
    }

    // 3. Restore Editor Cursor and Scroll state (Crash Recovery)
    chrome.storage.local.get(`cfp:state:${problem.key}`).then((res) => {
      const stateObj = res[`cfp:state:${problem.key}`] as any
      if (stateObj) {
        if (stateObj.position) editor.setPosition(stateObj.position)
        if (stateObj.scrollTop) editor.setScrollTop(stateObj.scrollTop)
      }
    })

    // Listen to changes to save editor state
    editor.onDidChangeCursorPosition(() => {
      const pos = editor.getPosition()
      const scroll = editor.getScrollTop()
      chrome.storage.local.set({
        [`cfp:state:${problem.key}`]: { position: pos, scrollTop: scroll }
      })
    })

    editor.onDidScrollChange(() => {
      const pos = editor.getPosition()
      const scroll = editor.getScrollTop()
      chrome.storage.local.set({
        [`cfp:state:${problem.key}`]: { position: pos, scrollTop: scroll }
      })
    })
  }

  // Toggle Vim mode dynamically
  useEffect(() => {
    if (editorRef.current) {
      if (settings.isVimMode) {
        if (!vimModeRef.current) {
          const statusNode = document.getElementById('cfp-vim-status')
          vimModeRef.current = initVimMode(editorRef.current, statusNode)
        }
      } else {
        if (vimModeRef.current) {
          vimModeRef.current.dispose()
          vimModeRef.current = null
          const statusNode = document.getElementById('cfp-vim-status')
          if (statusNode) statusNode.innerHTML = ''
        }
      }
    }
  }, [settings.isVimMode])

  // Resize listener
  useEffect(() => {
    const handleWindowResize = () => {
      if (editorRef.current) editorRef.current.layout()
    }
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  // ── No dropdowns anymore ──

  if (loading) {
    return (
      <div className="cfp-workspace-loading">
        <div className="cfp-workspace-spinner"></div>
        <div>Loading Premium Workspace...</div>
      </div>
    )
  }

  // ── Render Helper: Submission Status Badge ──────────────────────
  function getSubmitStatusBadge() {
    const statusMap: Record<string, { text: string; className: string }> = {
      'submitting': { text: '📤 Uploading...', className: 'cfp-badge--pending' },
      'queued': { text: '🕐 In Queue', className: 'cfp-badge--pending' },
      'testing': { text: `⚡ ${submitVerdict || 'Testing...'}`, className: 'cfp-badge--pending' },
    }

    if (submitStatus === 'done') {
      if (submitVerdict === 'OK') {
        return { text: '✅ Accepted', className: 'cfp-badge--ok' }
      }
      return { text: `❌ ${submitVerdict}`, className: 'cfp-badge--err' }
    }

    return statusMap[submitStatus] || { text: 'Idle', className: '' }
  }

  return (
    <div className="cfp-workspace" ref={containerRef}>
      {/* ═══ ROW 1: Top Identity Bar ═══ */}
      <div className="cfp-workspace__header cfp-workspace__header--top">
        {/* Identity info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={chrome.runtime.getURL('Lurix-Logo.png')} alt="Lurix Logo" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
          <div className="cfp-workspace__logo">Lurix <span>Pro</span></div>
          <div style={{ fontSize: '11px', color: 'var(--cfp-text-muted)', borderLeft: '1px solid var(--cfp-border)', paddingLeft: '8px' }}>
            Practice Without Friction
          </div>
          {isContestProblem && (
            <div style={{ 
              background: 'var(--cfp-danger-muted)', color: 'var(--cfp-danger)', 
              fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
              marginLeft: '8px'
            }}>
              ● CONTEST
            </div>
          )}
        </div>
        <div className="cfp-workspace__title" style={{ flex: 1, marginLeft: '20px' }}>{problemTitle}</div>

        {/* Layout Toggles */}
        <div className="cfp-workspace__layout-toggles">
          {layoutMode === 'split' && (
            <button
              className="cfp-layout-btn"
              onClick={() => updateSettings({ layoutMode: settings.layoutMode === 'vertical' ? 'horizontal' : 'vertical' })}
              title="Toggle split direction"
              style={{ borderRight: '1px solid var(--cfp-border)' }}
            >
              {settings.layoutMode === 'vertical' ? 'Split ▬' : 'Split ❚'}
            </button>
          )}
          <button
            className={`cfp-layout-btn ${layoutMode === 'problem-only' ? 'cfp-layout-btn--active' : ''}`}
            onClick={() => switchLayout('problem-only')}
            title="Problem statement only"
          >
            Statement
          </button>
          <button
            className={`cfp-layout-btn ${layoutMode === 'split' ? 'cfp-layout-btn--active' : ''}`}
            onClick={() => switchLayout('split')}
            title="Split side-by-side view"
          >
            Split
          </button>
          <button
            className={`cfp-layout-btn ${layoutMode === 'editor-only' ? 'cfp-layout-btn--active' : ''}`}
            onClick={() => switchLayout('editor-only')}
            title="Editor only"
          >
            Editor
          </button>
        </div>

        {/* Exit Workspace view Button */}
        <button className="cfp-workspace__close-btn" onClick={onClose} title="Classic Codeforces Layout">
          Exit ✕
        </button>
      </div>

      {/* ═══ ROW 2: Action Toolbar ═══ */}
      <div className="cfp-workspace__header cfp-workspace__header--actions">
        {/* Language Selector */}
        <select
          className="cfp-workspace__select"
          value={langId}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          {languagesList.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>

        {/* Vim Mode Toggle */}
        <button
          className={`cfp-workspace__btn ${settings.isVimMode ? 'cfp-workspace__btn--active' : ''}`}
          onClick={() => updateSettings({ isVimMode: !settings.isVimMode })}
          title="Toggle Vim keybindings"
        >
          Vim
        </button>

        {/* Template Load */}
        <button
          className="cfp-workspace__btn"
          onClick={loadTemplate}
          title="Load your saved code template"
        >
          📄 Load Template
        </button>

        {/* Template Save */}
        <button
          className="cfp-workspace__btn"
          onClick={saveCodeAsTemplate}
          title="Save current code as template"
        >
          💾 Save Template
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Run Samples */}
        <button
          className="cfp-workspace__btn cfp-workspace__btn--secondary"
          onClick={runSamples}
          disabled={samplesStatus === 'running'}
        >
          {samplesStatus === 'running' ? '⏳ Running...' : '▶ Run Samples'}
        </button>

        {/* Submit */}
        <button
          className="cfp-workspace__btn cfp-workspace__btn--primary"
          onClick={submitSolutionCode}
          disabled={submitStatus === 'submitting' || submitStatus === 'testing' || submitStatus === 'queued'}
        >
          {submitStatus === 'submitting' && '📤 Submitting...'}
          {submitStatus === 'queued' && '🕐 In Queue...'}
          {submitStatus === 'testing' && '⚡ Testing...'}
          {submitStatus === 'idle' && '🚀 Submit'}
          {submitStatus === 'done' && '🔄 Resubmit'}
        </button>
      </div>

      {/* Main split viewport workspace */}
      <div className="cfp-workspace__body" style={{ flexDirection: settings.layoutMode === 'vertical' ? 'row' : 'column' }}>
        {/* Left Pane: Problem Statement */}
        <div
          ref={leftPaneRef}
          className="cfp-workspace__pane cfp-workspace__pane--left"
          style={{
            display: layoutMode === 'editor-only' ? 'none' : 'flex',
            width: layoutMode === 'problem-only'
              ? '100%'
              : settings.layoutMode === 'vertical'
                ? `${splitRatio * 100}%`
                : '100%',
            height: layoutMode === 'problem-only'
              ? '100%'
              : settings.layoutMode === 'vertical'
                ? '100%'
                : `${splitRatio * 100}%`,
            flexDirection: 'row'
          }}
        >
          <div className="cfp-statement-navigation">
            <button onClick={() => scrollToSection('.legend')} className="cfp-nav-link">
              Description
            </button>
            <button onClick={() => scrollToSection('.input-specification')} className="cfp-nav-link">
              Input
            </button>
            <button onClick={() => scrollToSection('.output-specification')} className="cfp-nav-link">
              Output
            </button>
            {sampleTests.length > 0 && (
              <button onClick={() => scrollToSection('.sample-tests')} className="cfp-nav-link">
                Examples
              </button>
            )}
            <button onClick={() => scrollToSection('.note')} className="cfp-nav-link">
              Notes
            </button>
          </div>
          <div className="cfp-statement-container">
            <ProblemStatementElement leftPaneRef={leftPaneRef} problemKey={problem.key} />
          </div>
          {layoutMode === 'problem-only' && (
            <button
              className="cfp-workspace__btn cfp-workspace__btn--primary"
              onClick={() => switchLayout('split')}
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                zIndex: 99,
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              💻 Solve & Open IDE
            </button>
          )}
        </div>

        {/* Resizer bar */}
        {layoutMode === 'split' && (
          <div
            className={settings.layoutMode === 'vertical' ? "cfp-workspace__resizer" : "cfp-console__resizer"}
            onMouseDown={handleSplitResize}
            style={settings.layoutMode === 'horizontal' ? { height: '5px', cursor: 'row-resize', background: 'var(--cfp-border)', transition: 'background 150ms ease' } : {}}
          />
        )}

        {/* Right Pane: Editor & Console */}
        <div
          ref={rightPaneRef}
          className="cfp-workspace__pane cfp-workspace__pane--right"
          style={{
            display: layoutMode === 'problem-only' ? 'none' : 'flex',
            width: layoutMode === 'editor-only'
              ? '100%'
              : settings.layoutMode === 'vertical'
                ? `${(1 - splitRatio) * 100}%`
                : '100%',
            height: layoutMode === 'editor-only'
              ? '100%'
              : settings.layoutMode === 'vertical'
                ? '100%'
                : `${(1 - splitRatio) * 100}%`
          }}
        >
          {/* Monaco Editor Container */}
          <div 
            className="cfp-editor-section" 
            ref={editorContainerRef} 
            style={{ flex: 1 }}
            onPaste={(e) => {
              if (settings.isCompetitiveMode) {
                // Allow paste if the source is from within the editor itself
                const clipData = e.clipboardData?.getData('text/plain') || ''
                // Block external pastes (we can't perfectly distinguish, but
                // Monaco handles its own internal copy/paste via commands, 
                // not the DOM paste event, so any DOM paste event is external)
                e.preventDefault()
                showToast('🏆 Competitive Mode: External paste disabled. Type your solution!', 'error')
              }
            }}
          >
            <Editor
              height="100%"
              theme={settings.themeId.includes('light') ? 'light' : 'vs-dark'}
              language={monacoLanguage}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              loading={<div className="cfp-editor-loading">Spinning up Monaco Editor...</div>}
            />
            {settings.isVimMode && <div id="cfp-vim-status" className="cfp-vim-status" />}
          </div>

          {/* Integrated Console Horizontal Resizer */}
          <div className="cfp-console__resizer" onMouseDown={handleHorizontalResize} />

          {/* Console Area */}
          <div
            className="cfp-workspace__console"
            style={{
              height: consoleOpen ? `${consoleHeight}px` : '36px'
            }}
          >
            {/* Console Toolbar Headers */}
            <div className="cfp-console__header">
              <div className="cfp-console__tabs">
                <button
                  className="cfp-console__tab-btn"
                  style={{ color: 'var(--cfp-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    if (consoleOpen) {
                      minimizeConsole()
                    } else {
                      openConsole()
                    }
                  }}
                  title={consoleOpen ? 'Minimize Console' : 'Maximize Console'}
                >
                  {consoleOpen ? '▼ Minimize' : '▲ Maximize'}
                </button>
                <div style={{ width: '1px', background: 'var(--cfp-border)', margin: '8px 4px' }} />
                
                <button
                  className={`cfp-console__tab-btn ${activeTab === 'samples' ? 'cfp-console__tab-btn--active' : ''}`}
                  onClick={() => {
                    setActiveTab('samples')
                    openConsole()
                  }}
                >
                  Samples {sampleTests.length > 0 && `(${sampleTests.length})`}
                </button>
                <button
                  className={`cfp-console__tab-btn ${activeTab === 'custom' ? 'cfp-console__tab-btn--active' : ''}`}
                  onClick={() => {
                    setActiveTab('custom')
                    openConsole()
                  }}
                >
                  Custom Test
                </button>
                <button
                  className={`cfp-console__tab-btn ${activeTab === 'submissions' ? 'cfp-console__tab-btn--active' : ''}`}
                  onClick={() => {
                    setActiveTab('submissions')
                    openConsole()
                  }}
                >
                  Submission Status
                </button>
              </div>
            </div>

            {/* Console body content */}
            {consoleOpen && (
              <div className="cfp-console__body">
                {/* Samples Tab */}
                {activeTab === 'samples' && (
                  <div className="cfp-tab-content cfp-tab-content--samples">
                    {sampleTests.length === 0 ? (
                      <div className="cfp-console__empty">No sample test cases found.</div>
                    ) : (
                      <div className="cfp-samples-list">
                        {sampleTests.map((sample, idx) => {
                          const status = sampleVerdicts[idx]
                          const output = sampleOutputs[idx]
                          const error = sampleErrors[idx]
                          const time = sampleTime[idx]
                          const isUserAdded = idx >= parsedSampleTests.length

                          return (
                            <div className="cfp-sample-item" key={idx}>
                              <div className="cfp-sample-item__header">
                                <span className="cfp-sample-item__title">
                                  {isUserAdded ? `Added Case #${idx + 1}` : `Sample Case #${idx + 1}`}
                                  {isUserAdded && (
                                    <span style={{ fontSize: '10px', color: 'var(--cfp-accent)', marginLeft: '6px' }}>
                                      (from failed submission)
                                    </span>
                                  )}
                                </span>
                                {status === 'pending' && <span className="cfp-badge cfp-badge--pending">Running...</span>}
                                {status === 'OK' && <span className="cfp-badge cfp-badge--ok">PASS ({time} ms)</span>}
                                {status === 'WA' && <span className="cfp-badge cfp-badge--wa">WRONG ANSWER ({time} ms)</span>}
                                {status === 'ERR' && <span className="cfp-badge cfp-badge--err">ERROR</span>}
                                {isUserAdded && (
                                  <button
                                    className="cfp-copy-sub-btn"
                                    style={{ color: '#ff453a', marginLeft: '8px' }}
                                    onClick={() => {
                                      const updatedCustom = customSamples.filter((_, i) => i !== idx - parsedSampleTests.length)
                                      setCustomSamples(updatedCustom)
                                      saveCustomSamples(problem.key, updatedCustom)
                                      showToast('Test case removed', 'info')
                                    }}
                                    title="Remove this test case"
                                  >
                                    ✕ Remove
                                  </button>
                                )}
                              </div>

                              <div className="cfp-sample-grid">
                                <div className="cfp-sample-grid__col">
                                  <div className="cfp-pre-label">
                                    Input
                                    <button
                                      className="cfp-copy-sub-btn"
                                      onClick={() => {
                                        navigator.clipboard.writeText(sample.input)
                                        showToast('Copied input', 'success')
                                      }}
                                    >
                                      Copy
                                    </button>
                                  </div>
                                  <pre className="cfp-pre cfp-pre--input">{sample.input}</pre>
                                </div>
                                <div className="cfp-sample-grid__col">
                                  <div className="cfp-pre-label">Expected Output</div>
                                  <pre className="cfp-pre cfp-pre--expected">{sample.output}</pre>
                                </div>
                                {(output || error) && (
                                  <div className="cfp-sample-grid__col cfp-sample-grid__col--span2">
                                    <div className="cfp-pre-label">Your Output</div>
                                    {error ? (
                                      <pre className="cfp-pre cfp-pre--err" dangerouslySetInnerHTML={{ __html: error }} />
                                    ) : (
                                      <div className="cfp-output-compare">
                                        <pre className="cfp-pre cfp-pre--output">{output}</pre>
                                        {status === 'WA' && (
                                          <div className="cfp-diff-viewer">
                                            <div className="cfp-pre-label">Diff (Red = Extra/Different)</div>
                                            <CompareDiff original={sample.output} modified={output} />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Test Tab */}
                {activeTab === 'custom' && (
                  <div className="cfp-tab-content cfp-tab-content--custom">
                    <div className="cfp-custom-test-grid">
                      <div className="cfp-custom-test-left">
                        <div className="cfp-pre-label">Input Data</div>
                        <textarea
                          className="cfp-console__textarea"
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="Provide standard input here..."
                        />
                        <button
                          className="cfp-workspace__btn cfp-workspace__btn--secondary"
                          style={{ marginTop: '8px', width: '100%' }}
                          onClick={runCustomInput}
                          disabled={customStatus === 'running'}
                        >
                          {customStatus === 'running' ? 'Running Custom Test...' : 'Run Custom Code'}
                        </button>
                      </div>

                      <div className="cfp-custom-test-right">
                        <div className="cfp-pre-label">
                          Execution Output
                          {customStatus === 'done' && customTime !== null && (
                            <span className="cfp-metrics">
                              ({customTime} ms)
                            </span>
                          )}
                        </div>
                        {customStatus === 'running' && (
                          <div className="cfp-console-status">
                            <div className="cfp-workspace-spinner"></div>
                            Compiling and executing code...
                          </div>
                        )}
                        {customStatus === 'idle' && (
                          <div className="cfp-console__empty">Provide inputs and run code to view outputs.</div>
                        )}
                        {customStatus === 'error' && (
                          <pre className="cfp-pre cfp-pre--err" dangerouslySetInnerHTML={{ __html: customError }} />
                        )}
                        {customStatus === 'done' && (
                          <>
                            {customError ? (
                              <pre className="cfp-pre cfp-pre--err" dangerouslySetInnerHTML={{ __html: customError }} />
                            ) : (
                              <pre className="cfp-pre cfp-pre--output">{customOutput}</pre>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submissions/History Tab */}
                {activeTab === 'submissions' && (
                  <div className="cfp-tab-content cfp-tab-content--submissions">
                    {/* Active Submission Status */}
                    {submitStatus !== 'idle' && (
                      <div className="cfp-active-submission">
                        <h3>Active Submission</h3>
                        <div className="cfp-active-submission__row">
                          <span className="cfp-sub-label">Status:</span>
                          <span className={`cfp-badge ${getSubmitStatusBadge().className}`}>
                            {getSubmitStatusBadge().text}
                          </span>
                        </div>
                        {submitPassed !== null && (
                          <div className="cfp-active-submission__row">
                            <span className="cfp-sub-label">Passed Tests:</span>
                            <strong>{submitPassed}</strong>
                          </div>
                        )}
                        {submitStatus === 'done' && submitTime !== null && (
                          <div className="cfp-active-submission__row">
                            <span className="cfp-sub-label">Performance:</span>
                            <span>
                              {submitTime} ms / {submitMemory} KB
                            </span>
                          </div>
                        )}

                        {/* Failed Test Case Data (practice only) */}
                        {submitStatus === 'done' && submitVerdict !== 'OK' && failedTestData && !isContestProblem && (
                          <div className="cfp-failed-test-case" style={{
                            marginTop: '12px', padding: '12px',
                            background: 'rgba(255, 69, 58, 0.08)',
                            borderRadius: '8px', border: '1px solid rgba(255, 69, 58, 0.2)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <h4 style={{ margin: 0, color: '#ff453a', fontSize: '13px' }}>
                                Failed on Test #{failedTestData.testNumber}
                              </h4>
                              <button
                                className="cfp-workspace__btn cfp-workspace__btn--secondary"
                                style={{ fontSize: '11px', padding: '4px 10px' }}
                                onClick={() => addFailedTestToSamples(failedTestData.input, failedTestData.expected)}
                              >
                                ➕ Use Test Case
                              </button>
                            </div>
                            {failedTestData.input && (
                              <div style={{ marginBottom: '6px' }}>
                                <div className="cfp-pre-label" style={{ fontSize: '11px' }}>Input</div>
                                <pre className="cfp-pre cfp-pre--input" style={{ maxHeight: '100px' }}>{failedTestData.input}</pre>
                              </div>
                            )}
                            {failedTestData.expected && (
                              <div style={{ marginBottom: '6px' }}>
                                <div className="cfp-pre-label" style={{ fontSize: '11px' }}>Expected Output</div>
                                <pre className="cfp-pre cfp-pre--expected" style={{ maxHeight: '100px' }}>{failedTestData.expected}</pre>
                              </div>
                            )}
                            {failedTestData.output && (
                              <div>
                                <div className="cfp-pre-label" style={{ fontSize: '11px' }}>Your Output</div>
                                <pre className="cfp-pre cfp-pre--err" style={{ maxHeight: '100px' }}>{failedTestData.output}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="cfp-history-section">
                      <h3>Run History</h3>
                      {history.length === 0 ? (
                        <div className="cfp-console__empty">No submissions or tests executed in this workspace session.</div>
                      ) : (
                        <div className="cfp-history-list">
                          {history.map((item) => (
                            <div className="cfp-history-item" key={item.id}>
                              <div className="cfp-history-item__header">
                                <strong>
                                  {item.type === 'submission' ? `Submission` : 'Custom Test'}
                                </strong>
                                <span className={`cfp-badge cfp-badge--${item.status === 'OK' || item.status === 'Success' ? 'ok' : 'err'}`}>
                                  {item.status}
                                </span>
                              </div>
                              <div className="cfp-history-item__meta">
                                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                {item.timeConsumed !== undefined && (
                                  <span>{item.timeConsumed} ms</span>
                                )}
                                {item.memoryConsumed !== undefined && (
                                  <span>{Math.round(item.memoryConsumed / 1024)} KB</span>
                                )}
                                {item.passedTests !== undefined && (
                                  <span>Passed {item.passedTests} tests</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Watermark */}
      <div className="cfp-watermark" style={{
        position: 'absolute',
        bottom: '8px',
        right: '16px',
        fontSize: '10px',
        color: 'var(--cfp-text-muted)',
        opacity: 0.5,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 100
      }}>
        Built by Dhakshin
      </div>
    </div>
  )
}

// Problem Statement Element Portal Helper
function ProblemStatementElement({ leftPaneRef, problemKey }: { leftPaneRef: React.RefObject<HTMLDivElement | null>; problemKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offlineHtml, setOfflineHtml] = useState<string | null>(null)

  useEffect(() => {
    const statement = document.querySelector('.problem-statement')
    if (statement && containerRef.current) {
      const parent = statement.parentElement
      containerRef.current.appendChild(statement)

      return () => {
        if (parent && statement) {
          parent.appendChild(statement)
        }
      }
    } else {
      // Offline mode: load from cache
      chrome.storage.local.get(`cfp:cache:statement:${problemKey}`).then((res) => {
        const cached = res[`cfp:cache:statement:${problemKey}`] as string | undefined
        if (cached) {
          setOfflineHtml(cached)
        }
      })
    }
  }, [problemKey])

  if (offlineHtml) {
    return <div ref={containerRef} className="cfp-statement-content" dangerouslySetInnerHTML={{ __html: offlineHtml }} />
  }

  return <div ref={containerRef} className="cfp-statement-content" />
}

// Basic Line Diff Viewer
function CompareDiff({ original, modified }: { original: string; modified: string }) {
  const diffLines = useMemo(() => {
    const origLines = original.split('\n')
    const modLines = modified.split('\n')
    const result: { type: 'normal' | 'add' | 'remove'; val: string }[] = []

    let oIdx = 0
    let mIdx = 0

    while (oIdx < origLines.length || mIdx < modLines.length) {
      const orig = origLines[oIdx]
      const mod = modLines[mIdx]

      if (orig === mod) {
        result.push({ type: 'normal', val: orig })
        oIdx++
        mIdx++
      } else if (mod !== undefined && (orig === undefined || !origLines.slice(oIdx).includes(mod))) {
        result.push({ type: 'add', val: `+ ${mod}` })
        mIdx++
      } else {
        result.push({ type: 'remove', val: `- ${orig}` })
        oIdx++
      }
    }
    return result
  }, [original, modified])

  return (
    <pre className="cfp-diff-code">
      {diffLines.map((line, idx) => (
        <div key={idx} className={`cfp-diff-line cfp-diff-line--${line.type}`}>
          {line.val}
        </div>
      ))}
    </pre>
  )
}

function scrollToSection(selector: string) {
  const element = document.querySelector(`.cfp-statement-content ${selector}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
