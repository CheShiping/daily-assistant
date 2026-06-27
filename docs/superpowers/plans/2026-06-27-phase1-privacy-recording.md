# Phase 1: 隐私 + 记录增强 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现截图即销毁、敏感场景跳过、三种记录方式、隐私三档、系统通知，修复热力图时区 bug，完成 v1→v2 数据迁移。

**Architecture:** 修改 electron 主进程的 screenshot.ts（截图流程）、db.ts（数据模型+迁移）、settings.ts（新字段）、main.ts（快捷键+IPC），渲染进程的 Settings.vue（隐私选项）、Heatmap.vue（bug 修复+样式），新增 Enter 键快捷记录逻辑。

**Tech Stack:** Electron, Vue 3, TypeScript, Node.js fs, Electron Notification API, globalShortcut

## Global Constraints

- 所有弹窗改为页面内内联展示
- 隐私优先：默认 sensitiveSceneSkip=true, autoDeleteScreenshots=true
- 快捷键默认 Ctrl+Shift+J（避免与浏览器冲突）
- 中文 UI，日期格式 YYYY-MM-DD，ISO 8601 时间戳
- 无测试框架，验证方式：`npm run dev` 手动测试 + `vue-tsc` 类型检查

---

### Task 1: 热力图时区 Bug 修复

**Files:**
- Modify: `electron/db.ts:382-412`（heatmap 函数）
- Modify: `src/views/Heatmap.vue`（样式优化）

**Interfaces:**
- 不影响现有 API，`heatmap()` 返回值类型不变

- [ ] **Step 1: 修复 heatmap 函数的时区问题**

在 `electron/db.ts` 中添加 `localDate` 辅助函数，并修改 `heatmap()` 函数中两处 `toISOString().slice(0, 10)` 调用：

```typescript
// 在文件顶部（getDb 函数之前）添加
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
```

修改 `heatmap()` 函数第 397 行（workRecord 日期提取）：
```typescript
// 修改前
const dateStr = d.toISOString().slice(0, 10)
// 修改后
const dateStr = localDate(d)
```

修改 `heatmap()` 函数第 405 行（网格生成循环）：
```typescript
// 修改前
const dateStr = cur.toISOString().slice(0, 10)
// 修改后
const dateStr = localDate(cur)
```

- [ ] **Step 2: 优化热力图样式**

在 `src/views/Heatmap.vue` 中修改 `cellColor()` 函数，使用更平滑的颜色渐变：

```typescript
function cellColor(count: number): string {
  if (count === 0) return 'hsl(var(--muted))'
  const ratio = maxCount.value === 0 ? 0 : count / maxCount.value
  if (ratio < 0.2) return 'hsl(142 40% 85%)'
  if (ratio < 0.4) return 'hsl(142 55% 70%)'
  if (ratio < 0.6) return 'hsl(142 65% 55%)'
  if (ratio < 0.8) return 'hsl(142 71% 45%)'
  return 'hsl(142 71% 35%)'
}
```

修改 cell 样式，增大尺寸并增强 hover 效果：
```html
<!-- 修改 template 中的 cell div -->
<div
  v-for="(c, h) in counts"
  :key="h"
  class="flex-1 h-7 rounded-[3px] transition-all duration-150 hover:scale-125 hover:ring-2 hover:ring-primary/50 cursor-pointer"
  :style="{ backgroundColor: cellColor(c) }"
  :title="`${date} ${h.toString().padStart(2, '0')}:00 · ${c} 条记录`"
></div>
```

- [ ] **Step 3: 验证**

```bash
npm run dev
```
打开热力图页面，确认今天（6月27日）的数据正确显示在最后一行。

- [ ] **Step 4: 提交**

```bash
git add electron/db.ts src/views/Heatmap.vue
git commit -m "fix: heatmap timezone bug and style optimization"
```

---

### Task 2: v1→v2 数据迁移

**Files:**
- Modify: `electron/db.ts`（getDb 函数）

**Interfaces:**
- `getDb()` 返回 `DBSchema`，version 字段从 1 升到 2
- 现有数据不丢失，新字段补默认值

- [ ] **Step 1: 修改 DBSchema 接口，新增 planItems 字段**

在 `electron/db.ts` 中修改 `DBSchema` 接口：

```typescript
export interface DBSchema {
  version: number
  workRecords: WorkRecord[]
  reports: Report[]
  templates: ReportTemplate[]
  screenshots: Screenshot[]
  appUsageRecords: AppUsageRecord[]
  planItems: PlanItem[]        // 新增
  settings: Record<string, string>
}
```

在文件中新增 `PlanItem` 接口（在 `AppUsageRecord` 接口之后）：

```typescript
export interface PlanItem {
  id: string
  date: string
  text: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}
```

修改 `DEFAULTS` 对象，添加 `planItems: []`：

```typescript
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
```

- [ ] **Step 2: 添加 v1→v2 迁移逻辑**

在 `getDb()` 函数中，数据加载后（`data = d` 之前）添加迁移逻辑：

```typescript
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
```

- [ ] **Step 3: 修改 ReportTemplate 接口，添加 clustering 字段**

在 `ReportTemplate` 接口中添加：

```typescript
export interface ReportTemplate {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly'
  content: string
  isBuiltin: boolean
  clustering: 'timeline' | 'category' | 'project'  // 新增
  createdAt: string
  updatedAt: string
}
```

修改内置模板 seed 代码，给每个模板添加 `clustering: 'timeline'`。

- [ ] **Step 4: 验证类型检查**

```bash
vue-tsc --noEmit
```

确认无类型错误。

- [ ] **Step 5: 提交**

```bash
git add electron/db.ts
git commit -m "feat: v1→v2 data migration with PlanItem and clustering"
```

---

### Task 3: Settings 新增字段

**Files:**
- Modify: `electron/settings.ts`（AppSettings 接口 + getSettings + updateSettings）

**Interfaces:**
- `AppSettings` 新增字段，`getSettings()` 返回完整对象，`updateSettings()` 支持新字段

- [ ] **Step 1: 修改 AppSettings 接口**

```typescript
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
```

- [ ] **Step 2: 修改 DEFAULTS**

```typescript
const DEFAULTS: AppSettings = {
  // 现有字段不变...
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
```

- [ ] **Step 3: 修改 getSettings() 函数**

在 `getSettings()` 中添加新字段的读取：

```typescript
export function getSettings(): AppSettings {
  const map = getAllSettings()
  return {
    // 现有字段不变...
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
```

- [ ] **Step 4: 修改 updateSettings() 函数**

在 `updateSettings()` 中添加新字段的写入：

```typescript
export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next = { ...current, ...patch }
  // 现有字段不变...
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
```

- [ ] **Step 5: 验证类型检查**

```bash
vue-tsc --noEmit
```

- [ ] **Step 6: 提交**

```bash
git add electron/settings.ts
git commit -m "feat: add Phase 1 settings fields (privacy, shortcut, notifications)"
```

---

### Task 4: 截图即销毁 + 敏感场景跳过 + 系统通知

**Files:**
- Modify: `electron/screenshot.ts`（captureAndAnalyze + captureNow）

**Interfaces:**
- 消费：`getSettings()` 返回的 `autoDeleteScreenshots`, `sensitiveSceneSkip`, `showNotifications`
- produce: `source` 字段写入 workRecord（'auto' | 'manual'）

- [ ] **Step 1: 添加敏感关键词常量和通知辅助函数**

在 `electron/screenshot.ts` 顶部添加：

```typescript
import { Notification } from 'electron'

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
```

需要在文件顶部导入 `BrowserWindow`：
```typescript
import { desktopCapturer, screen, app, BrowserWindow, Notification } from 'electron'
```

- [ ] **Step 2: 修改 captureAndAnalyze() 函数**

在 `captureAndAnalyze()` 函数中，AI 分析完成后（`updateScreenshot` 之后），添加敏感场景跳过和截图删除逻辑：

```typescript
// 在 updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true }) 之后

const settings = getSettings()

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
const endedAt = new Date(Date.now() + settings.screenshotIntervalSec * 1000).toISOString()
createWorkRecord({
  startedAt: takenAt,
  endedAt,
  summary: result.summary,
  category: result.category,
  source: 'auto',
  screenshotPath: settings.autoDeleteScreenshots ? null : filePath
})

// 截图即销毁
if (settings.autoDeleteScreenshots) {
  try { fs.unlinkSync(filePath) } catch {}
  updateScreenshot(id, { path: '' })
  console.log('[screenshot:auto] 截图已删除')
}

// 系统通知
showNotification('✅ 已记录', `${result.category} · ${result.summary.slice(0, 20)}`)
```

注意：需要删除原有的 `createWorkRecord` 调用（在 `updateScreenshot` 之后的那段），替换为上面的逻辑。

- [ ] **Step 3: 修改 captureNow() 函数**

类似地修改 `captureNow()` 函数，添加相同的敏感跳过、截图删除、通知逻辑：

```typescript
// 在 updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true }) 之后

const settings = getSettings()

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
const endedAt = new Date(Date.now() + settings.screenshotIntervalSec * 1000).toISOString()
createWorkRecord({
  startedAt: takenAt,
  endedAt,
  summary: result.summary,
  category: result.category,
  source: 'manual',
  screenshotPath: settings.autoDeleteScreenshots ? null : filePath
})

// 截图即销毁
if (settings.autoDeleteScreenshots) {
  try { fs.unlinkSync(filePath) } catch {}
  updateScreenshot(id, { path: '' })
}

// 系统通知
showNotification('✅ 快速记录', `${result.category} · ${result.summary.slice(0, 20)}`)

return { ok: true, summary: result.summary, category: result.category }
```

- [ ] **Step 4: 验证类型检查**

```bash
vue-tsc --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add electron/screenshot.ts
git commit -m "feat: screenshot auto-delete, sensitive scene skip, notifications"
```

---

### Task 5: 全局快捷键注册

**Files:**
- Modify: `electron/main.ts`（app.whenReady 中注册快捷键）

**Interfaces:**
- 消费：`getSettings().globalShortcut`，`captureNow()` from screenshot.ts
- 快捷键被占用时 console.warn

- [ ] **Step 1: 在 main.ts 中注册全局快捷键**

在 `electron/main.ts` 的 `app.whenReady()` 回调中，`startScheduledReport()` 之后添加：

```typescript
import { globalShortcut } from 'electron'
// 注意：globalShortcut 已在文件顶部的 import 中

function registerGlobalShortcut() {
  const settings = getSettings()
  const shortcut = settings.globalShortcut || 'Ctrl+Shift+J'
  
  // 先注销旧快捷键
  globalShortcut.unregisterAll()
  
  const ok = globalShortcut.register(shortcut, async () => {
    console.log('[shortcut] 触发快速记录:', shortcut)
    const result = await captureNow()
    if (result.ok) {
      console.log('[shortcut] 记录成功:', result.category, result.summary?.slice(0, 50))
    } else {
      console.error('[shortcut] 记录失败:', result.error)
    }
  })
  
  if (!ok) {
    console.warn('[shortcut] 快捷键注册失败，可能被其他应用占用:', shortcut)
  } else {
    console.log('[shortcut] 全局快捷键已注册:', shortcut)
  }
}

// 在 app.whenReady() 中调用
app.whenReady().then(() => {
  getDb()
  createWindow()
  createTray()
  startScreenshot()
  startAppTracker()
  startScheduledReport()
  registerGlobalShortcut()  // 新增
  // ...
})
```

- [ ] **Step 2: 在 app.on('before-quit') 中注销快捷键**

```typescript
app.on('before-quit', () => {
  globalShortcut.unregisterAll()  // 新增
  stopScreenshot()
  stopAppTracker()
  stopScheduledReport()
  closeDb()
})
```

- [ ] **Step 3: 添加 settings:update 时重新注册快捷键的 IPC**

在 `settings:update` handler 中添加重新注册：

```typescript
ipcMain.handle('settings:update', (_e, patch: Partial<AppSettings>) => {
  const result = updateSettings(patch)
  if (patch.globalShortcut !== undefined) {
    registerGlobalShortcut()
  }
  return result
})
```

- [ ] **Step 4: 验证**

```bash
npm run dev
```
按 Ctrl+Shift+J，确认触发截图记录。

- [ ] **Step 5: 提交**

```bash
git add electron/main.ts
git commit -m "feat: register global shortcut Ctrl+Shift+J for quick capture"
```

---

### Task 6: 窗口内 Enter 快速记录

**Files:**
- Modify: `src/App.vue`（添加全局 keydown 监听）

**Interfaces:**
- 消费：`window.api.screenshots.captureNow()`
- 排除 input/textarea/contentEditable 元素

- [ ] **Step 1: 在 App.vue 中添加全局 Enter 键监听**

在 `src/App.vue` 的 `<script setup>` 中添加：

```typescript
import { onMounted, onUnmounted } from 'vue'

function handleKeydown(e: KeyboardEvent) {
  // 只处理 Enter 键
  if (e.key !== 'Enter') return
  
  // 排除输入框、文本区域、可编辑元素
  const target = e.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('[contenteditable]') ||
    target.closest('input') ||
    target.closest('textarea')
  ) return
  
  // 触发快速记录
  e.preventDefault()
  window.api.screenshots.captureNow()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
```

- [ ] **Step 2: 验证**

```bash
npm run dev
```
在非输入框区域按 Enter，确认触发截图记录。在输入框中按 Enter，确认不触发。

- [ ] **Step 3: 提交**

```bash
git add src/App.vue
git commit -m "feat: Enter key quick capture in app window"
```

---

### Task 7: Settings.vue 添加隐私选项

**Files:**
- Modify: `src/views/Settings.vue`（添加隐私三档、快捷键配置、通知开关）

**Interfaces:**
- 消费：`window.api.settings.get()` / `window.api.settings.update()`
- 新增设置项：privacyLevel, globalShortcut, showNotifications, autoDeleteScreenshots, sensitiveSceneSkip

- [ ] **Step 1: 在 Settings.vue 中添加隐私级别选择器**

在现有的设置表单中，添加隐私级别三档选择：

```vue
<!-- 隐私级别 -->
<div class="card p-4">
  <h3 class="font-medium mb-3">隐私保护</h3>
  
  <div class="space-y-4">
    <div>
      <label class="text-sm text-muted-foreground">隐私级别</label>
      <div class="flex gap-2 mt-2">
        <button
          v-for="level in privacyLevels"
          :key="level.value"
          class="flex-1 px-3 py-2 rounded-lg border text-sm transition-colors"
          :class="settings.privacyLevel === level.value
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border hover:border-primary/50'"
          @click="updatePrivacyLevel(level.value)"
        >
          {{ level.label }}
        </button>
      </div>
      <p class="text-xs text-muted-foreground mt-1">
        {{ privacyLevelDesc }}
      </p>
    </div>
    
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm">截图分析后自动删除</div>
        <div class="text-xs text-muted-foreground">AI 分析完成后删除原始截图</div>
      </div>
      <Switch v-model="settings.autoDeleteScreenshots" @change="saveSettings" />
    </div>
    
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm">敏感场景自动跳过</div>
        <div class="text-xs text-muted-foreground">检测到私人聊天等敏感内容时不记录</div>
      </div>
      <Switch v-model="settings.sensitiveSceneSkip" @change="saveSettings" />
    </div>
  </div>
</div>
```

在 `<script setup>` 中添加：

```typescript
const privacyLevels = [
  { value: 'loose', label: '宽松' },
  { value: 'standard', label: '标准' },
  { value: 'strict', label: '严格' }
]

const privacyLevelDesc = computed(() => {
  switch (settings.value.privacyLevel) {
    case 'loose': return '保留截图，敏感内容脱敏记录'
    case 'standard': return '分析后删除截图，敏感内容跳过（推荐）'
    case 'strict': return '分析后删除截图，敏感内容跳过，不保存应用名'
    default: return ''
  }
})

function updatePrivacyLevel(level: string) {
  settings.value.privacyLevel = level as any
  // 根据级别自动设置子选项
  switch (level) {
    case 'loose':
      settings.value.autoDeleteScreenshots = false
      settings.value.sensitiveSceneSkip = false
      break
    case 'standard':
    case 'strict':
      settings.value.autoDeleteScreenshots = true
      settings.value.sensitiveSceneSkip = true
      break
  }
  saveSettings()
}
```

- [ ] **Step 2: 添加全局快捷键配置**

```vue
<div class="flex items-center justify-between">
  <div>
    <div class="text-sm">全局快捷键</div>
    <div class="text-xs text-muted-foreground">按下快捷键快速记录工作</div>
  </div>
  <div class="flex items-center gap-2">
    <code class="text-sm bg-muted px-2 py-1 rounded">{{ settings.globalShortcut }}</code>
    <button class="text-xs text-primary hover:underline" @click="editingShortcut = true">
      修改
    </button>
  </div>
</div>

<!-- 内联编辑快捷键（不弹窗） -->
<div v-if="editingShortcut" class="flex items-center gap-2 mt-2">
  <input
    v-model="settings.globalShortcut"
    class="input h-8 text-sm"
    placeholder="Ctrl+Shift+J"
  />
  <button class="btn btn-sm" @click="saveShortcut">保存</button>
  <button class="btn btn-sm btn-ghost" @click="editingShortcut = false">取消</button>
</div>
```

- [ ] **Step 3: 添加通知开关**

```vue
<div class="flex items-center justify-between">
  <div>
    <div class="text-sm">完成通知</div>
    <div class="text-xs text-muted-foreground">截图分析完成后弹出桌面通知</div>
  </div>
  <Switch v-model="settings.showNotifications" @change="saveSettings" />
</div>
```

- [ ] **Step 4: 验证**

```bash
npm run dev
```
打开设置页，确认隐私三档、快捷键配置、通知开关正常工作。

- [ ] **Step 5: 提交**

```bash
git add src/views/Settings.vue
git commit -m "feat: privacy settings UI with three-tier privacy level"
```

---

### Task 8: 类型声明更新

**Files:**
- Modify: `src/types.d.ts`（Api 接口更新）

**Interfaces:**
- `window.api` 类型与实际 IPC 保持一致

- [ ] **Step 1: 更新 types.d.ts 中的 AppSettings 接口**

```typescript
export interface AppSettings {
  apiKey: string
  baseUrl: string
  model: string
  visionModel: string
  scheduledReportEnabled: boolean
  scheduledReportTime: string
  screenshotIntervalSec: number
  visionEnabled: boolean
  excludedApps: string[]
  memoryContent: string
  customInstruction: string
  preservePath: string
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
```

- [ ] **Step 2: 添加 PlanItem 接口**

```typescript
export interface PlanItem {
  id: string
  date: string
  text: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: 验证**

```bash
vue-tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/types.d.ts
git commit -m "feat: update type declarations for Phase 1"
```

---

### Task 9: 构建验证

**Files:**
- 无文件变更

- [ ] **Step 1: 运行类型检查**

```bash
vue-tsc --noEmit
```
Expected: 无错误

- [ ] **Step 2: 运行构建**

```bash
npm run build
```
Expected: 构建成功

- [ ] **Step 3: 运行 dev 模式手动测试**

```bash
npm run dev
```

手动验证清单：
- [ ] 热力图显示今天（6月27日）的数据
- [ ] 设置页隐私三档可切换
- [ ] Ctrl+Shift+J 触发截图记录
- [ ] Enter 键在非输入框时触发记录
- [ ] 截图分析后文件被删除（标准/严格模式）
- [ ] 敏感场景不创建 workRecord
- [ ] 桌面弹出通知

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: Phase 1 complete - privacy, recording, heatmap fix"
```
