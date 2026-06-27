import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// window.api 安全守卫：dev 模式（未启动 Electron）下为 undefined
// 所有 view 必须通过 safeCall 调用，避免抛错卡死 loading
export function isApiReady(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).api !== 'undefined'
}

export async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isApiReady()) return fallback
  try {
    return await fn()
  } catch (e) {
    console.warn('[safeCall] failed:', e)
    return fallback
  }
}

export const FALLBACK_SETTINGS = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  visionModel: 'gpt-4o',
  scheduledReportEnabled: false,
  scheduledReportTime: '18:00',
  screenshotIntervalSec: 300,
  visionEnabled: true,
  excludedApps: [] as string[],
  memoryContent: '',
  customInstruction: '',
  preservePath: '',
  autoDeleteScreenshots: true,
  sensitiveSceneSkip: true,
  privacyLevel: 'standard' as 'loose' | 'standard' | 'strict',
  globalShortcut: 'Ctrl+Shift+J',
  showNotifications: true,
  subscription: 'free' as 'free' | 'pro',
  subscriptionExpiry: null as string | null,
  inviteCode: '',
  localApiEnabled: false,
  localApiPort: 8088,
  localApiToken: ''
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function today(): string {
  return formatDate(new Date())
}

export function todayISO(): string {
  // 当地时间 00:00:00 的 ISO
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function endOfTodayISO(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return formatDate(d)
}
