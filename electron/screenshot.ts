// 截图服务 - desktopCapturer 定时截图 + 视觉识别
<<<<<<< HEAD
import { desktopCapturer, screen, app, BrowserWindow, Notification } from 'electron'
=======
import { desktopCapturer, screen, app } from 'electron'
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
import path from 'node:path'
import fs from 'node:fs'
import { createScreenshot, updateScreenshot, createWorkRecord } from './db'
import { getSettings } from './settings'
import { analyzeScreenshot } from './ai'

<<<<<<< HEAD
const SENSITIVE_KEYWORDS = [
  '私人沟通', '社交媒体', '浏览社交媒体',
  '当前包含私人沟通', '桌面空闲', '查看桌面'
]

function isSensitive(category: string, summary: string): boolean {
  if (category !== '生活') return false
  return SENSITIVE_KEYWORDS.some(kw => summary.includes(kw))
}

function showNotification(title: string, body: string) {
  const settings = getSettings()
  if (!settings.showNotifications) return
  const win = BrowserWindow.getAllWindows()[0]
  // 窗口聚焦时不弹出
  if (win && win.isFocused()) return
  const n = new Notification({ title, body })
  n.show()
  setTimeout(() => n.close(), 3000)
}

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
let timer: NodeJS.Timeout | null = null
let isRunning = false
let isCapturing = false // 并发锁：防止上一次截图未完成时下一次重叠

export function isScreenshotRunning(): boolean {
  return isRunning
}

export function startScreenshot(): boolean {
  if (isRunning) return false
  const settings = getSettings()
  if (!settings.apiKey) return false
  isRunning = true
  const intervalMs = Math.max(30, settings.screenshotIntervalSec) * 1000

  // 递归 setTimeout：等上一次 captureAndAnalyze 完成后再排下一次，杜绝重叠
  const scheduleNext = () => {
    if (!isRunning) return
    timer = setTimeout(async () => {
      await captureAndAnalyze()
      scheduleNext()
    }, intervalMs)
  }

  // 立即触发第一次，完成后开始定时循环
  captureAndAnalyze().finally(() => scheduleNext())
  return true
}

export function stopScreenshot(): void {
  isRunning = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function cryptoRandom(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// 获取前台窗口应用名已移至 appTracker.ts

// 手动触发一次截图+识别
export async function captureNow(): Promise<{ ok: boolean; summary?: string; category?: string; error?: string }> {
  try {
    const settings = getSettings()
    if (!settings.apiKey) return { ok: false, error: '请先配置 API Key' }

    const displays = screen.getAllDisplays()
    const primary = displays.find(d => d.bounds.x === 0 && d.bounds.y === 0) ?? displays[0]
    if (!primary) return { ok: false, error: '未找到显示器' }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false
    })
    const source = sources.find(s => s.display_id === String(primary.id)) ?? sources[0]
    if (!source) return { ok: false, error: '未找到屏幕源' }

    const thumbnail = source.thumbnail
    const pngBuffer = thumbnail.toPNG()
    const dataUrl = thumbnail.toDataURL()
    const base64 = dataUrl.split(',')[1]

    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots')
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true })
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    const filePath = path.join(screenshotsDir, filename)
    fs.writeFileSync(filePath, pngBuffer)

    const id = cryptoRandom()
    const takenAt = new Date().toISOString()
    createScreenshot({ id, path: filePath, takenAt })

    if (settings.visionEnabled && base64) {
      console.log('[screenshot] 开始视觉识别, model:', settings.visionModel)
      const result = await analyzeScreenshot(base64, settings.memoryContent)
      console.log('[screenshot] 识别结果:', result.category, '|', result.summary.slice(0, 80))
      updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true })
<<<<<<< HEAD
      
      // 敏感场景跳过
      if (settings.sensitiveSceneSkip && isSensitive(result.category, result.summary)) {
        console.log('[screenshot] 检测到敏感场景，跳过记录')
        if (settings.autoDeleteScreenshots) {
          try { fs.unlinkSync(filePath) } catch {}
          updateScreenshot(id, { path: '' })
        }
        showNotification('⏭️ 已跳过', '检测到敏感内容，未记录')
        return { ok: true, summary: '敏感内容已跳过', category: '生活' }
      }

      // 创建 workRecord（source: 'manual'）
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      const endedAt = new Date(Date.now() + settings.screenshotIntervalSec * 1000).toISOString()
      createWorkRecord({
        startedAt: takenAt,
        endedAt,
        summary: result.summary,
        category: result.category,
<<<<<<< HEAD
        source: 'manual',
        screenshotPath: settings.autoDeleteScreenshots ? undefined : filePath
      })

      // 截图即销毁
      if (settings.autoDeleteScreenshots) {
        try { fs.unlinkSync(filePath) } catch {}
        updateScreenshot(id, { path: '' })
      }

      // 系统通知
      showNotification('✅ 快速记录', `${result.category} · ${result.summary.slice(0, 20)}`)

=======
        source: 'auto',
        screenshotPath: filePath
      })
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      return { ok: true, summary: result.summary, category: result.category }
    }
    console.warn('[screenshot] 视觉识别未启用或无 base64 数据')
    return { ok: false, error: '视觉识别未启用' }
  } catch (e: any) {
    console.error('[screenshot] 手动截图失败:', e?.message ?? e)
    return { ok: false, error: e?.message ?? '截图失败' }
  }
}

async function captureAndAnalyze() {
  if (isCapturing) {
    console.log('[screenshot:auto] 上一次截图仍在进行中，跳过本次')
    return
  }
  isCapturing = true
  try {
    const settings = getSettings()
    if (!settings.apiKey) return

    const displays = screen.getAllDisplays()
    const primary = displays.find(d => d.bounds.x === 0 && d.bounds.y === 0) ?? displays[0]
    if (!primary) return

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false
    })
    const source = sources.find(s => s.display_id === String(primary.id)) ?? sources[0]
    if (!source) return

    const thumbnail = source.thumbnail
    const pngBuffer = thumbnail.toPNG()
    const dataUrl = thumbnail.toDataURL()
    const base64 = dataUrl.split(',')[1]

    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots')
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true })
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    const filePath = path.join(screenshotsDir, filename)
    fs.writeFileSync(filePath, pngBuffer)

    const id = cryptoRandom()
    const takenAt = new Date().toISOString()
    createScreenshot({ id, path: filePath, takenAt })

    if (settings.visionEnabled && base64) {
      console.log('[screenshot:auto] 开始视觉识别, model:', settings.visionModel)
      const result = await analyzeScreenshot(base64, settings.memoryContent)
      console.log('[screenshot:auto] 识别结果:', result.category, '|', result.summary.slice(0, 80))
      updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true })

<<<<<<< HEAD
      // 敏感场景跳过
      if (settings.sensitiveSceneSkip && isSensitive(result.category, result.summary)) {
        console.log('[screenshot:auto] 检测到敏感场景，跳过记录')
        if (settings.autoDeleteScreenshots) {
          try { fs.unlinkSync(filePath) } catch {}
          updateScreenshot(id, { path: '' })
        }
        showNotification('⏭️ 已跳过', '检测到敏感内容，未记录')
        return
      }

      // 创建 workRecord（source: 'auto'）
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      const endedAt = new Date(Date.now() + settings.screenshotIntervalSec * 1000).toISOString()
      createWorkRecord({
        startedAt: takenAt,
        endedAt,
        summary: result.summary,
        category: result.category,
        source: 'auto',
<<<<<<< HEAD
        screenshotPath: settings.autoDeleteScreenshots ? undefined : filePath
      })

      // 截图即销毁
      if (settings.autoDeleteScreenshots) {
        try { fs.unlinkSync(filePath) } catch {}
        updateScreenshot(id, { path: '' })
        console.log('[screenshot:auto] 截图已删除')
      }

      // 系统通知
      showNotification('✅ 已记录', `${result.category} · ${result.summary.slice(0, 20)}`)
=======
        screenshotPath: filePath
      })
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
    }
  } catch (e) {
    console.error('[screenshot:auto] 截图失败:', e)
  } finally {
    isCapturing = false
  }
}

export function getScreenshotDir(): string {
  return path.join(app.getPath('userData'), 'screenshots')
}
