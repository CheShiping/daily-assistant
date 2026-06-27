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
  scheduledReportTime: '18:00'
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
    scheduledReportTime: map.scheduledReportTime ?? DEFAULTS.scheduledReportTime
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
  return next
}
