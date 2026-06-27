// 设置存储 - 基于 JSON
import { getAllSettings, setSetting } from './db'

export interface AppSettings {
  apiKey: string
  baseUrl: string
  model: string
  visionModel: string
  screenshotIntervalSec: number
  visionEnabled: boolean
  excludedApps: string[]
  memoryContent: string
  customInstruction: string
  preservePath: string
  scheduledReportEnabled: boolean
  scheduledReportTime: string
  // Phase 1 新增
  autoDeleteScreenshots: boolean
  sensitiveSceneSkip: boolean
  privacyLevel: 'loose' | 'standard' | 'strict'
  globalShortcut: string
  showNotifications: boolean
  subscription: 'free' | 'pro'
  subscriptionExpiry: string | null
  inviteCode: string
  localApiEnabled: boolean
  localApiPort: number
  localApiToken: string
}

const DEFAULTS: AppSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  visionModel: 'gpt-4o-mini',
  screenshotIntervalSec: 120,
  visionEnabled: true,
  excludedApps: [],
  memoryContent: '',
  customInstruction: '',
  preservePath: '',
  scheduledReportEnabled: true,
  scheduledReportTime: '18:00',
  // Phase 1 新增
  autoDeleteScreenshots: true,
  sensitiveSceneSkip: true,
  privacyLevel: 'standard',
  globalShortcut: 'Ctrl+Shift+J',
  showNotifications: true,
  subscription: 'free',
  subscriptionExpiry: null,
  inviteCode: '',
  localApiEnabled: false,
  localApiPort: 8088,
  localApiToken: ''
}

export function getSettings(): AppSettings {
  const map = getAllSettings()
  return {
    ...DEFAULTS,
    apiKey: map.apiKey ?? '',
    baseUrl: map.baseUrl ?? DEFAULTS.baseUrl,
    model: map.model ?? DEFAULTS.model,
    visionModel: map.visionModel ?? DEFAULTS.visionModel,
    screenshotIntervalSec: Number(map.screenshotIntervalSec ?? DEFAULTS.screenshotIntervalSec),
    visionEnabled: map.visionEnabled !== 'false',
    excludedApps: map.excludedApps ? JSON.parse(map.excludedApps) : [],
    memoryContent: map.memoryContent ?? '',
    customInstruction: map.customInstruction ?? '',
    preservePath: map.preservePath ?? '',
    scheduledReportEnabled: map.scheduledReportEnabled !== 'false',
    scheduledReportTime: map.scheduledReportTime ?? DEFAULTS.scheduledReportTime,
    // Phase 1 新增
    autoDeleteScreenshots: map.autoDeleteScreenshots !== 'false',
    sensitiveSceneSkip: map.sensitiveSceneSkip !== 'false',
    privacyLevel: (['loose', 'standard', 'strict'].includes(map.privacyLevel) ? map.privacyLevel : 'standard') as AppSettings['privacyLevel'],
    globalShortcut: map.globalShortcut ?? DEFAULTS.globalShortcut,
    showNotifications: map.showNotifications !== 'false',
    subscription: map.subscription === 'pro' ? 'pro' : 'free',
    subscriptionExpiry: map.subscriptionExpiry ?? null,
    inviteCode: map.inviteCode ?? '',
    localApiEnabled: map.localApiEnabled === 'true',
    localApiPort: Number(map.localApiPort ?? DEFAULTS.localApiPort),
    localApiToken: map.localApiToken ?? ''
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next = { ...current, ...patch }
  setSetting('apiKey', next.apiKey)
  setSetting('baseUrl', next.baseUrl)
  setSetting('model', next.model)
  setSetting('visionModel', next.visionModel)
  setSetting('screenshotIntervalSec', String(next.screenshotIntervalSec))
  setSetting('visionEnabled', String(next.visionEnabled))
  setSetting('excludedApps', JSON.stringify(next.excludedApps))
  setSetting('memoryContent', next.memoryContent)
  setSetting('customInstruction', next.customInstruction)
  setSetting('preservePath', next.preservePath)
  setSetting('scheduledReportEnabled', String(next.scheduledReportEnabled))
  setSetting('scheduledReportTime', next.scheduledReportTime)
  // Phase 1 新增
  setSetting('autoDeleteScreenshots', String(next.autoDeleteScreenshots))
  setSetting('sensitiveSceneSkip', String(next.sensitiveSceneSkip))
  setSetting('privacyLevel', next.privacyLevel)
  setSetting('globalShortcut', next.globalShortcut)
  setSetting('showNotifications', String(next.showNotifications))
  setSetting('subscription', next.subscription)
  setSetting('subscriptionExpiry', next.subscriptionExpiry ?? '')
  setSetting('inviteCode', next.inviteCode)
  setSetting('localApiEnabled', String(next.localApiEnabled))
  setSetting('localApiPort', String(next.localApiPort))
  setSetting('localApiToken', next.localApiToken)
  return next
}
