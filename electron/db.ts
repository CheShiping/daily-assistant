// JSON 文件存储 - 零原生依赖，适合本应用数据量
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export interface WorkRecord {
  id: string
  startedAt: string
  endedAt: string | null
  summary: string
  category: string | null
  appName: string | null
  source: string
  screenshotPath: string | null
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly'
  content: string
  startDate: string
  endDate: string
  status: 'generating' | 'completed' | 'failed'
  model: string | null
  createdAt: string
  updatedAt: string
}

export interface ReportTemplate {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly'
  content: string
  isBuiltin: boolean
  clustering: 'timeline' | 'category' | 'project'
  createdAt: string
  updatedAt: string
}

export interface Screenshot {
  id: string
  path: string
  takenAt: string
  analysis: string | null
  appName: string | null
  analyzed: boolean
  createdAt: string
}

export interface AppUsageRecord {
  id: string
  appName: string
  startedAt: string
  endedAt: string
  durationSec: number
  createdAt: string
}

export interface PlanItem {
  id: string
  date: string
  text: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface DBSchema {
  version: number
  workRecords: WorkRecord[]
  reports: Report[]
  templates: ReportTemplate[]
  screenshots: Screenshot[]
  appUsageRecords: AppUsageRecord[]
  planItems: PlanItem[]
  settings: Record<string, string>
}

const DEFAULTS: DBSchema = {
  version: 1,
  workRecords: [],
  reports: [],
  templates: [],
  screenshots: [],
  appUsageRecords: [],
  planItems: [],
  settings: {}
}

let dbPath = ''
let data: DBSchema | null = null
let saveTimer: NodeJS.Timeout | null = null

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getDb(): DBSchema {
  if (data) return data
  const userData = app.getPath('userData')
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true })
  dbPath = path.join(userData, 'daily-assistant.json')
  let d: DBSchema
  if (fs.existsSync(dbPath)) {
    try {
      d = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(dbPath, 'utf-8')) }
    } catch {
      d = { ...DEFAULTS }
    }
  } else {
    d = { ...DEFAULTS }
  }

  // v1→v2 迁移
  if (d.version < 2) {
    // 补模板 clustering 字段
    for (const t of d.templates) {
      if (!(t as any).clustering) (t as any).clustering = 'timeline'
    }
    // 补默认设置
    const defaults: Record<string, string> = {
      autoDeleteScreenshots: 'true',
      sensitiveSceneSkip: 'true',
      privacyLevel: 'standard',
      globalShortcut: 'Ctrl+Shift+J',
      showNotifications: 'true',
      subscription: 'free',
      localApiEnabled: 'false',
      localApiPort: '8088',
      localApiToken: ''
    }
    for (const [key, val] of Object.entries(defaults)) {
      if (!d.settings[key]) d.settings[key] = val
    }
    d.version = 2
  }

  // 初始化内置模板
  if (d.templates.filter(t => t.isBuiltin).length === 0) {
    const now = new Date().toISOString()
    // 5 个内置模板 + 1 个示例自定义模板
    // 内容参考网上流行的日报 / 周报 / 月报格式
    const builtinTemplates: ReportTemplate[] = [
      // ===== 日报 =====
      {
        id: 'tpl-daily-standard',
        name: '标准日报',
        type: 'daily',
        content: `# {{日期}} 工作日报

## 📌 今日完成
{{今日完成}}

## 📊 关键数据
{{关键数据}}

## ⚠️ 遇到的问题
{{遇到的问题}}

## 🎯 明日计划
{{明日计划}}`,
        isBuiltin: true,
        clustering: 'timeline',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl-daily-scrum',
        name: '敏捷冲刺日报',
        type: 'daily',
        content: `# {{日期}} · Sprint 冲刺日报

## ✅ 昨日完成
- [ ] {{昨日任务 1}}
- [ ] {{昨日任务 2}}
- [ ] {{昨日任务 3}}

## 🔄 今日计划
- [ ] {{今日任务 1}}
- [ ] {{今日任务 2}}
- [ ] {{今日任务 3}}

## 🚧 阻碍 / 风险
{{阻碍描述}}

## 💡 需要协助
{{协助内容（无则填"无"）}}`,
        isBuiltin: true,
        clustering: 'category',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl-daily-result',
        name: '成果型日报',
        type: 'daily',
        content: `# {{日期}} 工作日报（成果导向）

## 🌟 核心成果
{{今日完成}}

## 📈 数据指标
| 维度 | 数值 | 变化 |
|------|------|------|
| {{指标 1}} | {{数值}} | {{变化}} |
| {{指标 2}} | {{数值}} | {{变化}} |

## 💭 思考与沉淀
{{关键数据}}

## 🔥 风险与机会
{{遇到的问题}}

## 📅 明日聚焦
{{明日计划}}`,
        isBuiltin: true,
        clustering: 'project',
        createdAt: now,
        updatedAt: now
      },

      // ===== 周报 =====
      {
        id: 'tpl-weekly-standard',
        name: '标准周报',
        type: 'weekly',
        content: `# {{起始}} - {{结束}} 工作周报

## 📋 本周概览
{{本周概览}}

## ✅ 本周完成
{{本周完成}}

## 🏆 关键成果
{{关键成果}}

## 📊 数据分析
{{数据分析}}

## ⚠️ 问题与风险
{{问题与风险}}

## 🎯 下周计划
{{下周计划}}`,
        isBuiltin: true,
        clustering: 'category',
        createdAt: now,
        updatedAt: now
      },

      // ===== 月报 =====
      {
        id: 'tpl-monthly-okr',
        name: 'OKR 月度复盘',
        type: 'monthly',
        content: `# {{月份}} OKR 月度复盘

## 🎯 本月 OKR 进展

### O1 · {{目标 1}}
- KR1: {{关键结果 1}} —— 进度 {{百分比 1}}%
- KR2: {{关键结果 2}} —— 进度 {{百分比 2}}%

### O2 · {{目标 2}}
- KR1: {{关键结果 3}} —— 进度 {{百分比 3}}%

## 🏆 关键成果
{{本月完成}}

## 📊 关键数据
{{关键数据}}

## 🔍 复盘与改进
### 做得好
{{做得好的方面}}

### 待改进
{{待改进的方面}}

## 🎯 下月计划
{{下月计划}}`,
        isBuiltin: true,
        clustering: 'project',
        createdAt: now,
        updatedAt: now
      }
    ]

    // 1 个示例自定义模板（用户可作为起点编辑）
    const sampleCustom: ReportTemplate = {
      id: 'tpl-custom-sample',
      name: '我的自定义模板（示例）',
      type: 'daily',
      content: `# {{日期}} · {{汇报对象}}日报

## 一、核心进展
{{今日完成}}

## 二、关键产出
{{关键数据}}

## 三、风险与依赖
{{遇到的问题}}

## 四、明日计划
{{明日计划}}

> 自定义说明：可编辑占位符、调整章节顺序、保存为新模板。`,
      isBuiltin: false,
      clustering: 'timeline',
      createdAt: now,
      updatedAt: now
    }

    // 只添加不存在的模板（避免重复 seed）
    for (const t of [...builtinTemplates, sampleCustom]) {
      if (!d.templates.find(x => x.id === t.id)) d.templates.push(t)
    }
    save()
  } else {
    // 已有内置模板，补全可能缺失的新模板
    const now = new Date().toISOString()
    const builtinToAdd: ReportTemplate[] = [
      {
        id: 'tpl-daily-scrum',
        name: '敏捷冲刺日报',
        type: 'daily',
        content: `# {{日期}} · Sprint 冲刺日报

## ✅ 昨日完成
- [ ] {{昨日任务 1}}
- [ ] {{昨日任务 2}}
- [ ] {{昨日任务 3}}

## 🔄 今日计划
- [ ] {{今日任务 1}}
- [ ] {{今日任务 2}}
- [ ] {{今日任务 3}}

## 🚧 阻碍 / 风险
{{阻碍描述}}

## 💡 需要协助
{{协助内容（无则填"无"）}}`,
        isBuiltin: true,
        clustering: 'category',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl-daily-result',
        name: '成果型日报',
        type: 'daily',
        content: `# {{日期}} 工作日报（成果导向）

## 🌟 核心成果
{{今日完成}}

## 📈 数据指标
| 维度 | 数值 | 变化 |
|------|------|------|
| {{指标 1}} | {{数值}} | {{变化}} |
| {{指标 2}} | {{数值}} | {{变化}} |

## 💭 思考与沉淀
{{关键数据}}

## 🔥 风险与机会
{{遇到的问题}}

## 📅 明日聚焦
{{明日计划}}`,
        isBuiltin: true,
        clustering: 'project',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl-monthly-okr',
        name: 'OKR 月度复盘',
        type: 'monthly',
        content: `# {{月份}} OKR 月度复盘

## 🎯 本月 OKR 进展

### O1 · {{目标 1}}
- KR1: {{关键结果 1}} —— 进度 {{百分比 1}}%
- KR2: {{关键结果 2}} —— 进度 {{百分比 2}}%

### O2 · {{目标 2}}
- KR1: {{关键结果 3}} —— 进度 {{百分比 3}}%

## 🏆 关键成果
{{本月完成}}

## 📊 关键数据
{{关键数据}}

## 🔍 复盘与改进
### 做得好
{{做得好的方面}}

### 待改进
{{待改进的方面}}

## 🎯 下月计划
{{下月计划}}`,
        isBuiltin: true,
        clustering: 'project',
        createdAt: now,
        updatedAt: now
      }
    ]
    // 补全示例自定义模板
    const sampleCustom: ReportTemplate = {
      id: 'tpl-custom-sample',
      name: '我的自定义模板（示例）',
      type: 'daily',
      content: `# {{日期}} · {{汇报对象}}日报

## 一、核心进展
{{今日完成}}

## 二、关键产出
{{关键数据}}

## 三、风险与依赖
{{遇到的问题}}

## 四、明日计划
{{明日计划}}

> 自定义说明：可编辑占位符、调整章节顺序、保存为新模板。`,
      isBuiltin: false,
      clustering: 'timeline',
      createdAt: now,
      updatedAt: now
    }
    let added = false
    for (const t of [...builtinToAdd, sampleCustom]) {
      if (!d.templates.find(x => x.id === t.id)) {
        d.templates.push(t)
        added = true
      }
    }
    if (added) save()
  }
  data = d
  return d
}

// 防抖保存
export function save(): void {
  if (!data) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (data) fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
  }, 100)
}

// 立即保存
export function saveSync(): void {
  if (!data) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
}

export function closeDb(): void {
  saveSync()
  data = null
}

// ============ 工作记录 ============
export function listWorkRecords(opts: { date?: string; startDate?: string; endDate?: string; limit?: number; offset?: number } = {}): WorkRecord[] {
  const db = getDb()
  let rows = [...db.workRecords]
  if (opts.date) {
    const target = opts.date
    rows = rows.filter(r => r.startedAt.slice(0, 10) === target)
  } else if (opts.startDate && opts.endDate) {
    rows = rows.filter(r => r.startedAt >= opts.startDate! && r.startedAt <= opts.endDate!)
  }
  // 按 startedAt 升序（与原版一致，list 返回时按日期升序）
  // 原版无日期时返回 DESC
  if (opts.date || (opts.startDate && opts.endDate)) {
    rows.sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  } else {
    rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }
  const offset = opts.offset ?? 0
  const limit = opts.limit ?? 200
  return rows.slice(offset, offset + limit)
}

export function createWorkRecord(input: { startedAt: string; summary: string; category?: string; endedAt?: string; appName?: string; source?: string; screenshotPath?: string }): WorkRecord {
  const db = getDb()
  const now = new Date().toISOString()
  const rec: WorkRecord = {
    id: cryptoRandom(),
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? null,
    summary: input.summary,
    category: input.category ?? null,
    appName: input.appName ?? null,
    source: input.source ?? 'manual',
    screenshotPath: input.screenshotPath ?? null,
    createdAt: now,
    updatedAt: now
  }
  db.workRecords.push(rec)
  save()
  return rec
}

export function updateWorkRecord(input: { id: string; summary?: string; category?: string; startedAt?: string; endedAt?: string }): WorkRecord {
  const db = getDb()
  const r = db.workRecords.find(x => x.id === input.id)
  if (!r) throw new Error('记录不存在')
  if (input.summary !== undefined) r.summary = input.summary
  if (input.category !== undefined) r.category = input.category
  if (input.startedAt !== undefined) r.startedAt = input.startedAt
  if (input.endedAt !== undefined) r.endedAt = input.endedAt
  r.updatedAt = new Date().toISOString()
  save()
  return r
}

export function deleteWorkRecord(id: string): void {
  const db = getDb()
  db.workRecords = db.workRecords.filter(r => r.id !== id)
  save()
}

export function dailySummary(date: string): { total: number; byCategory: Record<string, number>; records: WorkRecord[] } {
  const records = listWorkRecords({ date })
  const byCategory: Record<string, number> = {}
  for (const r of records) {
    const c = r.category ?? '其他'
    byCategory[c] = (byCategory[c] ?? 0) + 1
  }
  return { total: records.length, byCategory, records }
}

// ============ 报告 ============
export function listReports(opts: { limit?: number; offset?: number } = {}): Report[] {
  const db = getDb()
  const rows = [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const offset = opts.offset ?? 0
  const limit = opts.limit ?? 50
  return rows.slice(offset, offset + limit)
}

export function createReport(input: { id: string; title: string; type: string; startDate: string; endDate: string; model: string }): Report {
  const db = getDb()
  const now = new Date().toISOString()
  const r: Report = {
    id: input.id,
    title: input.title,
    type: input.type as Report['type'],
    content: '',
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'generating',
    model: input.model,
    createdAt: now,
    updatedAt: now
  }
  db.reports.push(r)
  save()
  return r
}

export function updateReport(id: string, patch: Partial<Report>): void {
  const db = getDb()
  const r = db.reports.find(x => x.id === id)
  if (!r) return
  Object.assign(r, patch, { updatedAt: new Date().toISOString() })
  save()
}

export function deleteReport(id: string): void {
  const db = getDb()
  db.reports = db.reports.filter(r => r.id !== id)
  save()
}

// ============ 模板 ============
export function listTemplates(type?: string): ReportTemplate[] {
  const db = getDb()
  let rows = [...db.templates]
  if (type) rows = rows.filter(t => t.type === type)
  rows.sort((a, b) => (a.isBuiltin === b.isBuiltin ? a.createdAt.localeCompare(b.createdAt) : a.isBuiltin ? -1 : 1))
  return rows
}

export function createTemplate(input: { name: string; type: string; content: string; clustering?: 'timeline' | 'category' | 'project' }): ReportTemplate {
  const db = getDb()
  const now = new Date().toISOString()
  const t: ReportTemplate = {
    id: cryptoRandom(),
    name: input.name,
    type: input.type as ReportTemplate['type'],
    content: input.content,
    isBuiltin: false,
    clustering: input.clustering || 'timeline',
    createdAt: now,
    updatedAt: now
  }
  db.templates.push(t)
  save()
  return t
}

export function updateTemplate(input: { id: string; name?: string; content?: string }): ReportTemplate {
  const db = getDb()
  const t = db.templates.find(x => x.id === input.id)
  if (!t) throw new Error('模板不存在')
  if (t.isBuiltin) throw new Error('内置模板不可修改')
  if (input.name !== undefined) t.name = input.name
  if (input.content !== undefined) t.content = input.content
  t.updatedAt = new Date().toISOString()
  save()
  return t
}

export function deleteTemplate(id: string): void {
  const db = getDb()
  const t = db.templates.find(x => x.id === id)
  if (t?.isBuiltin) throw new Error('内置模板不可删除')
  db.templates = db.templates.filter(x => x.id !== id)
  save()
}

// ============ 截图 ============
export function createScreenshot(input: { id: string; path: string; takenAt: string }): Screenshot {
  const db = getDb()
  const s: Screenshot = {
    id: input.id,
    path: input.path,
    takenAt: input.takenAt,
    analysis: null,
    appName: null,
    analyzed: false,
    createdAt: new Date().toISOString()
  }
  db.screenshots.push(s)
  save()
  return s
}

export function updateScreenshot(id: string, patch: Partial<Screenshot>): void {
  const db = getDb()
  const s = db.screenshots.find(x => x.id === id)
  if (!s) return
  Object.assign(s, patch)
  save()
}

export function listScreenshots(opts: { date?: string; limit?: number } = {}): Screenshot[] {
  const db = getDb()
  let rows = [...db.screenshots]
  if (opts.date) rows = rows.filter(s => s.takenAt.slice(0, 10) === opts.date)
  rows.sort((a, b) => b.takenAt.localeCompare(a.takenAt))
  return rows.slice(0, opts.limit ?? 100)
}

// ============ 设置 ============
export function getSetting(key: string): string | undefined {
  return getDb().settings[key]
}

export function setSetting(key: string, value: string): void {
  const db = getDb()
  db.settings[key] = value
  save()
}

export function getAllSettings(): Record<string, string> {
  return { ...getDb().settings }
}

// ============ 时间线/热力图/应用使用 ============
export function timeline(opts: { startDate?: string; endDate?: string } = {}): WorkRecord[] {
  const db = getDb()
  let rows = [...db.workRecords]
  if (opts.startDate && opts.endDate) {
    rows = rows.filter(r => r.startedAt >= opts.startDate! && r.startedAt <= opts.endDate!)
  } else {
    // 默认今天
    const todayStr = localDate(new Date())
    rows = rows.filter(r => r.startedAt.slice(0, 10) === todayStr)
  }
  rows.sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  return rows
}

// 热力图：每日每小时记录数，返回 { date, hour, count }[]
export function heatmap(opts: { startDate?: string; endDate?: string } = {}): Array<{ date: string; hour: number; count: number }> {
  const db = getDb()
  let rows = [...db.workRecords]
  const end = opts.endDate ? new Date(opts.endDate) : new Date()
  const start = opts.startDate ? new Date(opts.startDate) : new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  rows = rows.filter(r => {
    const t = new Date(r.startedAt).getTime()
    return t >= start.getTime() && t <= end.getTime()
  })
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = new Date(r.startedAt)
    const dateStr = localDate(d)
    const hour = d.getHours()
    const key = `${dateStr}_${hour}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  const result: Array<{ date: string; hour: number; count: number }> = []
  const cur = new Date(start)
  while (cur <= end) {
    const dateStr = localDate(cur)
    for (let h = 0; h < 24; h++) {
      const key = `${dateStr}_${h}`
      result.push({ date: dateStr, hour: h, count: map.get(key) ?? 0 })
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

// 应用使用时长：按 category 聚合分钟数
// ============ 应用使用记录 ============
export function createAppUsageRecord(input: { appName: string; startedAt: string; endedAt: string; durationSec: number }): AppUsageRecord {
  const db = getDb()
  const rec: AppUsageRecord = {
    id: cryptoRandom(),
    appName: input.appName,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSec: input.durationSec,
    createdAt: new Date().toISOString()
  }
  db.appUsageRecords.push(rec)
  save()
  return rec
}

export function appUsage(opts: { startDate?: string; endDate?: string } = {}): Array<{ appName: string; durationMinutes: number; durationSec: number; count: number; firstAt: string | null; lastAt: string | null; share: number }> {
  const db = getDb()
  let rows = [...db.appUsageRecords]
  if (opts.startDate && opts.endDate) {
    rows = rows.filter(r => r.startedAt >= opts.startDate! && r.startedAt <= opts.endDate!)
  } else {
    const todayStr = localDate(new Date())
    rows = rows.filter(r => r.startedAt.slice(0, 10) === todayStr)
  }
  const map = new Map<string, { durationSec: number; count: number; firstAt: string | null; lastAt: string | null }>()
  for (const r of rows) {
    const cur = map.get(r.appName) ?? { durationSec: 0, count: 0, firstAt: null, lastAt: null }
    cur.durationSec += r.durationSec
    cur.count += 1
    if (!cur.firstAt || r.startedAt < cur.firstAt) cur.firstAt = r.startedAt
    if (!cur.lastAt || r.startedAt > cur.lastAt) cur.lastAt = r.startedAt
    map.set(r.appName, cur)
  }
  const list = Array.from(map.entries())
    .map(([appName, v]) => ({ appName, ...v, durationMinutes: Math.round(v.durationSec / 60) }))
    .sort((a, b) => b.durationSec - a.durationSec)
  const total = list.reduce((s, x) => s + x.durationSec, 0)
  return list.map(x => ({ ...x, share: total > 0 ? +(x.durationSec / total * 100).toFixed(1) : 0 }))
}

// ============ 计划 ============
export function listPlans(opts: { date: string }): PlanItem[] {
  const db = getDb()
  return db.planItems
    .filter(p => p.date === opts.date)
    .sort((a, b) => a.order - b.order)
}

export function createPlan(input: { date: string; text: string }): PlanItem {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = db.planItems.filter(p => p.date === input.date)
  const maxOrder = existing.length > 0 ? Math.max(...existing.map(p => p.order)) : 0
  const plan: PlanItem = {
    id: cryptoRandom(),
    date: input.date,
    text: input.text,
    completed: false,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now
  }
  db.planItems.push(plan)
  save()
  return plan
}

export function updatePlan(input: { id: string; text?: string; completed?: boolean; order?: number }): PlanItem {
  const db = getDb()
  const p = db.planItems.find(x => x.id === input.id)
  if (!p) throw new Error('计划不存在')
  if (input.text !== undefined) p.text = input.text
  if (input.completed !== undefined) p.completed = input.completed
  if (input.order !== undefined) p.order = input.order
  p.updatedAt = new Date().toISOString()
  save()
  return p
}

export function deletePlan(id: string): void {
  const db = getDb()
  db.planItems = db.planItems.filter(p => p.id !== id)
  save()
}

// ============ 数据管理 ============
export function exportAll(): DBSchema {
  return JSON.parse(JSON.stringify(getDb()))
}

export function importAll(input: Partial<DBSchema>): void {
  const db = getDb()
  if (Array.isArray(input.workRecords)) db.workRecords = input.workRecords as WorkRecord[]
  if (Array.isArray(input.reports)) db.reports = input.reports as Report[]
  if (Array.isArray(input.templates)) {
    // 保留内置模板
    const builtin = db.templates.filter(t => t.isBuiltin)
    db.templates = [...builtin, ...(input.templates as ReportTemplate[]).filter(t => !t.isBuiltin)]
  }
  if (input.settings) db.settings = { ...input.settings }
  save()
}

export function clearAll(): void {
  const db = getDb()
  db.workRecords = []
  db.reports = []
  db.templates = []
  db.screenshots = []
  db.appUsageRecords = []
  save()
}

function cryptoRandom(): string {
  // 简单的 UUID v4 生成，避免引入 uuid 依赖到主进程
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
