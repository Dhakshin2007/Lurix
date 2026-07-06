import { DEFAULT_SETTINGS } from '@/shared/storage'

// Runs once when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({ 'cfp:settings': DEFAULT_SETTINGS })
  }
})

// Map Codeforces programTypeId to Wandbox compiler name
function mapToWandbox(cfLangId: string): { compiler: string; options: string; fileName: string } | null {
  const id = cfLangId.trim()
  // C++ variants
  if (['80', '89'].includes(id)) return { compiler: 'gcc-head', options: 'warning,gnu++2b', fileName: 'main.cpp' }
  if (['73', '72'].includes(id)) return { compiler: 'gcc-head', options: 'warning,gnu++2a', fileName: 'main.cpp' }
  if (['54', '52', '50', '42', '61'].includes(id)) return { compiler: 'gcc-head', options: 'warning,gnu++17', fileName: 'main.cpp' }
  // C variants
  if (['43', '75'].includes(id)) return { compiler: 'gcc-head-c', options: 'warning,c17', fileName: 'main.c' }
  // Python 3
  if (['31', '40', '70', '41', '7'].includes(id)) return { compiler: 'cpython-head', options: '', fileName: 'main.py' }
  // Java
  if (['87', '60', '36', '23'].includes(id)) return { compiler: 'openjdk-jdk-22+36', options: '', fileName: 'Main.java' }
  // Rust
  if (['75', '49'].includes(id)) return { compiler: 'rust-1.82.0', options: '', fileName: 'main.rs' }
  // Go
  if (['32'].includes(id)) return { compiler: 'go-1.23.2', options: '', fileName: 'main.go' }
  // JavaScript (Node.js)
  if (['34', '55'].includes(id)) return { compiler: 'nodejs-20.17.0', options: '', fileName: 'main.js' }
  // Ruby
  if (['67'].includes(id)) return { compiler: 'ruby-4.0.2', options: '', fileName: 'main.rb' }
  // PHP
  if (['6'].includes(id)) return { compiler: 'php-8.3.12', options: '', fileName: 'main.php' }
  // C#
  if (['65', '9', '79'].includes(id)) return { compiler: 'mono-6.12.0.199', options: '', fileName: 'Main.cs' }
  // Perl
  if (['13'].includes(id)) return { compiler: 'perl-5.42.0', options: '', fileName: 'main.pl' }
  // Haskell
  if (['12'].includes(id)) return { compiler: 'ghc-9.10.1', options: '', fileName: 'main.hs' }
  // Default: C++ as most CF users use it
  return { compiler: 'gcc-head', options: 'warning,gnu++2b', fileName: 'main.cpp' }
}

// Message hub
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'cfp/ping') {
    sendResponse({ type: 'cfp/pong' })
    return true
  }

  // Execute code via Wandbox API
  if (message?.type === 'cfp/execute-code') {
    const { source, input, langId } = message
    const lang = mapToWandbox(langId)

    if (!lang) {
      sendResponse({ success: false, error: 'Unsupported language for code execution' })
      return true
    }

    const payload = {
      compiler: lang.compiler,
      code: source,
      options: lang.options,
      stdin: input || '',
      save: false
    }

    fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`Wandbox API responded with ${res.status}: ${text}`)
        }
        const data = await res.json()

        const exitCode = parseInt(data.status || '0', 10)
        const compilerError = (data.compiler_error || '').trim()
        const compilerOutput = (data.compiler_output || '').trim()
        const programOutput = (data.program_output || '')
        const programError = (data.program_error || '').trim()

        // If there's a compiler error and no program output, it's a CE
        const isCompileError = compilerError.length > 0 && programOutput.length === 0 && exitCode !== 0

        sendResponse({
          success: true,
          output: programOutput,
          stderr: isCompileError ? compilerError : (programError || compilerError),
          exitCode: exitCode,
          isCompileError: isCompileError,
          signal: data.signal || null
        })
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message || 'Failed to execute code' })
      })

    return true // Keep the message channel open for async response
  }

  return false
})
