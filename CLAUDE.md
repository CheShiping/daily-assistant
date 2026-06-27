# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**牙牙乐日报助手** (Daily Assistant) — an Electron desktop app that automatically tracks work activities via periodic screenshots + AI vision analysis, and generates daily/weekly/monthly work reports using OpenAI-compatible APIs. Windows-focused (PowerShell-based foreground app tracking).

## Commands

```bash
npm run dev              # Start Vite dev server + Electron (hot reload)
npm run build            # Type-check (vue-tsc) + Vite production build
npm run electron:build   # Full build + package as NSIS installer (output: release/)
```

No test framework or linter is configured.

## Architecture

### Two-process Electron model

- **Main process** (`electron/`): Node.js — window management, IPC handlers, database, AI calls, screenshot capture, app tracking
- **Renderer process** (`src/`): Vue 3 SPA — UI only, communicates with main exclusively through `window.api` (exposed via `contextBridge` in `electron/preload.ts`)

All IPC channels are registered in `electron/main.ts` and typed in `src/types.d.ts`. The preload script (`electron/preload.ts`) bridges them via `contextBridge.exposeInMainWorld('api', ...)`.

### Electron modules (`electron/`)

| File | Responsibility |
|------|---------------|
| `main.ts` | App lifecycle, BrowserWindow, Tray, IPC handler registration, scheduled report timer |
| `preload.ts` | `contextBridge` — maps `window.api.*` to `ipcRenderer.invoke`/`send` |
| `db.ts` | JSON file storage (`userData/daily-assistant.json`) — all CRUD for work records, reports, templates, screenshots, app usage. Debounced async save. |
| `settings.ts` | Reads/writes settings as key-value pairs in the DB's `settings` map. Typed `AppSettings` interface with defaults. |
| `ai.ts` | OpenAI-compatible `/chat/completions` client. Streaming report/template generation. Vision-based screenshot analysis. Keyword-based category classification fallback. |
| `screenshot.ts` | `desktopCapturer` periodic screenshots → PNG to disk → AI vision analysis → auto-creates work records. Recursive `setTimeout` with concurrency lock. |
| `appTracker.ts` | Windows: persistent PowerShell process using Win32 `GetForegroundWindow` → process name → friendly name mapping. Polls every 5s, flushes usage records every 60s or on app switch. |

### Renderer (`src/`)

- **Vue 3** + **Vue Router** (hash history) + **Tailwind CSS** (HSL CSS variable theme system)
- `@` alias maps to `src/`
- Routes: `/today`, `/generate`, `/timeline`, `/heatmap`, `/app-usage`, `/history`, `/agent`, `/records`, `/templates`, `/settings`
- Views import `window.api` directly — no store/state management library

### Data flow pattern

Renderer calls `window.api.xxx()` → `ipcRenderer.invoke('channel')` → main process handler in `electron/main.ts` → `electron/db.ts` CRUD → JSON file on disk. For AI streaming: main sends chunks back via `webContents.send()` → renderer listens with `window.api.ai.onReportStreamChunk(cb)`.

### AI integration

Uses OpenAI-compatible API format (`/chat/completions`). Configurable `baseUrl`, `apiKey`, `model`, `visionModel` via settings. Supports:
- Streaming report generation (daily/weekly/monthly)
- Vision analysis of screenshots (base64 image → category + summary)
- Template generation
- Keyword-based classification fallback when AI is unavailable

### Database (`electron/db.ts`)

JSON file at `app.getPath('userData')/daily-assistant.json`. Single in-memory object with debounced writes (100ms). Schema version 1. Tables: `workRecords`, `reports`, `templates`, `screenshots`, `appUsageRecords`, `settings`. Builtin templates are seeded on first run.

## Key Conventions

- All user-facing strings are in Chinese (zh-CN)
- Date format: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`), date-only comparisons use `.slice(0, 10)`
- IDs: UUID v4 via local `cryptoRandom()` (not a library)
- CSS: Tailwind + shadcn/ui-style HSL CSS variables (`--primary`, `--card`, `--sidebar-*`, etc.) defined in `tailwind.config.js`
