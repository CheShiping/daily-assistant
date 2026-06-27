// 活动窗口追踪服务 - 独立于截图，持续记录前台应用使用时长
// 优化: 持久化 PowerShell 进程 + Base64 编码，解决性能卡顿和中文乱码
import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createAppUsageRecord } from './db'

// PowerShell 脚本路径
const PS_SCRIPT_PATH = path.join(app.getPath('userData'), 'persistent-fg.ps1')

// PowerShell 脚本: 持久化运行，从 stdin 读取 "GET" 命令，
// 输出 "FG:<Base64>" 到 stdout（Base64 编码彻底避免中文乱码）
const PS_SCRIPT_CONTENT = `
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@ -ErrorAction SilentlyContinue

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line -eq "GET") {
        $result = ""
        try {
            $h = [Win32]::GetForegroundWindow()
            if ($h -ne 0) {
                $procId = 0
                [Win32]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
                if ($procId -ne 0) {
                    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($p) {
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($p.ProcessName)
                        $result = [Convert]::ToBase64String($bytes)
                    }
                }
            }
        } catch {}
        Write-Output "FG:$result"
    } elseif ($line -eq "EXIT") {
        break
    }
}
`

function ensurePsScript() {
  fs.writeFileSync(PS_SCRIPT_PATH, PS_SCRIPT_CONTENT, 'utf-8')
}

// 进程名 → 友好应用名映射
const APP_NAME_MAP: Record<string, string> = {
  'code': 'VS Code',
  'code-insiders': 'VS Code Insiders',
  'chrome': 'Google Chrome',
  'msedge': 'Microsoft Edge',
  'firefox': 'Firefox',
  'explorer': '文件资源管理器',
  'WINWORD': 'Word',
  'EXCEL': 'Excel',
  'POWERPNT': 'PowerPoint',
  'ONENOTE': 'OneNote',
  'OUTLOOK': 'Outlook',
  'WeChat': '微信',
  'QQ': 'QQ',
  'DingTalk': '钉钉',
  'Feishu': '飞书',
  'Lark': '飞书',
  'Teams': 'Microsoft Teams',
  'Slack': 'Slack',
  'Discord': 'Discord',
  'Telegram': 'Telegram',
  'notepad': '记事本',
  'notepad++': 'Notepad++',
  'idea': 'IntelliJ IDEA',
  'idea64': 'IntelliJ IDEA',
  'pycharm64': 'PyCharm',
  'webstorm64': 'WebStorm',
  'goland64': 'GoLand',
  'rider64': 'Rider',
  'clion64': 'CLion',
  'devenv': 'Visual Studio',
  'Cursor': 'Cursor',
  'windsurf': 'Windsurf',
  'figma': 'Figma',
  'Notion': 'Notion',
  'obsidian': 'Obsidian',
  'typora': 'Typora',
  'Terminal': '终端',
  'WindowsTerminal': 'Windows Terminal',
  'powershell': 'PowerShell',
  'cmd': '命令提示符',
  'git-bash': 'Git Bash',
  'nautilus': '文件管理器',
  'Finder': '访达',
  'Safari': 'Safari',
  'Preview': '预览',
  'Spotify': 'Spotify',
  'vlc': 'VLC',
  'potplayermini64': 'PotPlayer',
  'Photoshop': 'Photoshop',
  'Illustrator': 'Illustrator',
  'AfterFX': 'After Effects',
  'Premiere Pro': 'Premiere Pro',
  'Snipaste': 'Snipaste',
  'Teams_Work_': 'Microsoft Teams',
  'FoxitPDFReader': 'Foxit PDF Reader',
  'Acrobat': 'Adobe Acrobat',
  'sumatrapdf': 'SumatraPDF',
  'calibre': 'Calibre',
  'wps': 'WPS Office',
  'et': 'WPS 表格',
  'wpp': 'WPS 演示',
  'pdfxedit': 'PDF-XChange Editor'
}

function toFriendlyName(processName: string): string {
  return APP_NAME_MAP[processName] ?? processName
}

// ==================== 持久化 PowerShell 进程管理 ====================

let psProcess: ChildProcess | null = null
let stdoutBuffer = ''
let pendingResolve: ((value: string) => void) | null = null
let pendingTimeout: NodeJS.Timeout | null = null

function clearPendingTimeout() {
  if (pendingTimeout) {
    clearTimeout(pendingTimeout)
    pendingTimeout = null
  }
}

function resolvePending(value: string) {
  clearPendingTimeout()
  if (pendingResolve) {
    const resolve = pendingResolve
    pendingResolve = null
    resolve(value)
  }
}

function startPsProcess() {
  if (psProcess && !psProcess.killed && psProcess.stdin && psProcess.stdout) return

  ensurePsScript()

  psProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS_SCRIPT_PATH
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  })

  stdoutBuffer = ''

  psProcess.stdout?.on('data', (data: Buffer) => {
    stdoutBuffer += data.toString('utf-8')
    let idx: number
    while ((idx = stdoutBuffer.indexOf('\n')) >= 0) {
      const line = stdoutBuffer.slice(0, idx).replace(/\r$/, '').trim()
      stdoutBuffer = stdoutBuffer.slice(idx + 1)
      // 只处理 "FG:" 前缀的响应行，忽略其他输出
      if (line.startsWith('FG:') && pendingResolve) {
        const b64 = line.slice(3)
        try {
          if (b64) {
            const buf = Buffer.from(b64, 'base64')
            resolvePending(buf.toString('utf-8'))
          } else {
            resolvePending('')
          }
        } catch {
          resolvePending('')
        }
      }
    }
  })

  psProcess.stderr?.on('data', (data: Buffer) => {
    console.debug('[appTracker] PS stderr:', data.toString('utf-8').trim())
  })

  psProcess.stdin?.on('error', () => {})
  psProcess.stdout?.on('error', () => {})

  psProcess.on('error', (err) => {
    console.error('[appTracker] PowerShell 进程错误:', err.message)
    psProcess = null
    resolvePending('')
  })

  psProcess.on('exit', (code) => {
    console.log('[appTracker] PowerShell 进程退出, code=' + code)
    psProcess = null
    resolvePending('')
  })
}

function queryForegroundApp(): Promise<string> {
  return new Promise((resolve) => {
    if (!psProcess || psProcess.killed) {
      startPsProcess()
    }
    if (!psProcess || !psProcess.stdin || !psProcess.stdout) {
      resolve('')
      return
    }

    pendingResolve = resolve

    pendingTimeout = setTimeout(() => {
      if (pendingResolve === resolve) {
        console.warn('[appTracker] 查询超时, 重启 PowerShell 进程')
        pendingResolve = null
        resolve('')
        if (psProcess) {
          try { psProcess.kill() } catch {}
          psProcess = null
        }
      }
    }, 3000)

    try {
      psProcess.stdin.write('GET\n')
    } catch {
      resolvePending('')
    }
  })
}

// ==================== 前台应用查询 ====================

export async function getActiveAppName(): Promise<string> {
  try {
    if (process.platform === 'win32') {
      const name = await queryForegroundApp()
      return toFriendlyName(name || '未知')
    }
    if (process.platform === 'darwin') {
      return new Promise((resolve) => {
        const script = `tell application "System Events" to name of first application process whose frontmost is true`
        execFile('osascript', ['-e', script], { encoding: 'utf-8', timeout: 3000 }, (err, stdout) => {
          if (err) { resolve('未知'); return }
          resolve(toFriendlyName(stdout.trim() || '未知'))
        })
      })
    }
    return '未知'
  } catch {
    return '未知'
  }
}

// ==================== 追踪逻辑 ====================

let tracker: NodeJS.Timeout | null = null
let lastAppName: string | null = null
let lastSwitchTime: number = 0
let tickCount = 0
const POLL_INTERVAL = 5000 // 5 秒轮询一次
const FLUSH_INTERVAL = 12 // 每 12 次 tick（60 秒）强制写入一次

function flushCurrent() {
  if (!lastAppName || !lastSwitchTime) return
  const now = Date.now()
  const durationSec = Math.round((now - lastSwitchTime) / 1000)
  if (durationSec >= 1) {
    createAppUsageRecord({
      appName: lastAppName,
      startedAt: new Date(lastSwitchTime).toISOString(),
      endedAt: new Date(now).toISOString(),
      durationSec
    })
  }
  lastSwitchTime = now
}

async function tick() {
  const now = Date.now()
  const appName = await getActiveAppName()
  tickCount++

  if (lastAppName === null) {
    // 首次启动
    lastAppName = appName
    lastSwitchTime = now
    return
  }

  // 应用切换了，立即写入上一个应用的时长
  if (appName !== lastAppName) {
    flushCurrent()
    lastAppName = appName
    lastSwitchTime = now
    tickCount = 0
    return
  }

  // 应用没切换，每 FLUSH_INTERVAL 次 tick（60 秒）强制写入一次
  if (tickCount >= FLUSH_INTERVAL) {
    flushCurrent()
    tickCount = 0
  }
}

function scheduleTick() {
  tracker = setTimeout(async () => {
    await tick()
    if (tracker) scheduleTick()
  }, POLL_INTERVAL)
}

export function startAppTracker() {
  if (tracker) return
  ensurePsScript()
  startPsProcess()
  lastAppName = null
  lastSwitchTime = Date.now()
  tickCount = 0
  scheduleTick()
  console.log('[appTracker] 活动窗口追踪已启动 (持久化 PowerShell 模式)')
}

export function stopAppTracker() {
  if (!tracker) return
  clearTimeout(tracker)
  tracker = null

  // 停止前把当前应用的时长也记录下来
  if (lastAppName && lastSwitchTime) {
    const now = Date.now()
    const durationSec = Math.round((now - lastSwitchTime) / 1000)
    if (durationSec >= 1) {
      createAppUsageRecord({
        appName: lastAppName,
        startedAt: new Date(lastSwitchTime).toISOString(),
        endedAt: new Date(now).toISOString(),
        durationSec
      })
    }
  }
  lastAppName = null

  // 关闭持久化 PowerShell 进程
  resolvePending('')
  if (psProcess) {
    try { psProcess.kill() } catch {}
    psProcess = null
  }

  console.log('[appTracker] 活动窗口追踪已停止')
}
