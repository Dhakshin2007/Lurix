<div align="center">
  <img src="https://i.postimg.cc/mkCH77Y4/Lurix-Logo.png" alt="Lurix Logo" width="128" />
  <h1>Lurix</h1>
  <p><strong>Practice Without Friction.</strong></p>
  <p>A native, IDE-level competitive programming environment injected directly into Codeforces.</p>
</div>

---

## 🚀 Overview

Lurix is a comprehensive, professional-grade Chrome Extension that consolidates the code editor, terminal, and browser into a single unified interface. By injecting the powerful Monaco Editor (the engine behind VS Code) directly into Codeforces, it completely eliminates context switching and streamlines the problem-solving workflow.

## ✨ Core Features

- **Monaco Editor Engine:** Full IDE experience directly in the browser.
- **Intellisense & Snippets:** Rich C++ autocompletion (`#inc`, `for`, `main`, `fastio`).
- **Instant Local Execution:** Bypasses Codeforces queue by compiling and running code locally using the Wandbox API.
- **Multi-Test Auto-Runner:** Scrapes sample test cases and evaluates them instantly with expected vs. actual diffing.
- **True Error Surfacing:** Intercepts Codeforces DOM to reveal hidden submission errors.
- **Competitive Mode:** Fullscreen focus mode with a live execution timer.
- **Local-First Caching:** Your code is cached in `chrome.storage.local`. Never lose a line of code to a refreshed tab again.
- **Premium Aesthetics:** Sleek glassmorphism, tag pills, and dynamically color-coded difficulty ratings.

## 🛠️ Development & Build Instructions

Lurix is built using **React**, **TypeScript**, **Vite**, and **CRXJS**.

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
To run the extension in development mode with Hot Module Replacement (HMR):
```bash
npm run dev
```
*Load the `dist` folder into Chrome via `chrome://extensions` -> **Load unpacked**.*

### 3. Production Build
To create an optimized production build for the Chrome Web Store:
```bash
npm run build
```
This will compile the extension and base64-encode required fonts to bypass strict Content Security Policies. The final production assets will be placed in the `dist` directory.

## 📄 Privacy Policy & Contact

Lurix operates entirely client-side. We do not collect, store, sell, or transmit any personally identifying information (PII) to our own servers. 

**Support & Contact:**  
For any issues, feedback, or support, please email: **dhakshinkotha2007@gmail.com**
