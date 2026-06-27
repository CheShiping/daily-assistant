# Phase 2: Today 页 + 计划系统 + 报告增强 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 Today 首页（Hero + 计划 + 概览 + 时段 + 显示器），实现今日计划系统，增强报告模板（聚类策略 + 智能推荐 + 计划注入），在热力图和应用使用页添加 AI 洞察。

**Architecture:** Phase 1 已完成数据模型迁移（PlanItem 表、clustering 字段、Settings 新字段）。本阶段在渲染进程新增 Today.vue 重写、修改 Reports.vue 增强模板选择，在主进程新增 plans:* IPC、修改 ai.ts 添加聚类 prompt 和洞察生成。

**Tech Stack:** Vue 3 Composition API, TypeScript, Electron IPC, marked (Markdown 渲染), Chart.js (vue-chartjs)

## Global Constraints

- 依赖 Phase 1 完成（PlanItem 表、clustering 字段、Settings 新字段已就绪）
- 所有弹窗改为页面内内联展示
- 中文 UI，日期格式 YYYY-MM-DD
- 无测试框架，验证方式：`npm run dev` 手动测试 + `vue-tsc` 类型检查

---

### Task 1: PlanItem CRUD + IPC

**Files:**
- Modify: `electron/db.ts`（添加 planItems CRUD 函数）
- Modify: `electron/main.ts`（注册 plans:* IPC）
- Modify: `electron/preload.ts`（暴露 plans.* API）

**Interfaces:**
- Produces: `listPlans(opts)`, `createPlan(input)`, `updatePlan(input)`, `deletePlan(id)` in db.ts
- Produces: IPC channels `plans:list`, `plans:create`, `plans:update`, `plans:delete`
- Consumed by: Today.vue (Task 3)

- [ ] **Step 1: 在 db.ts 中添加 PlanItem CRUD 函数**

在 `electron/db.ts` 的 `clearAll()` 函数之前添加：

```typescript
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
```

- [ ] **Step 2: 在 main.ts 中注册 IPC handler**

在 `electron/main.ts` 的 IPC 区域（工作记录 IPC 之后）添加：

```typescript
// 计划
ipcMain.handle('plans:list', (_e, input: { date: string }) => listPlans(input))
ipcMain.handle('plans:create', (_e, input: { date: string; text: string }) => createPlan(input))
ipcMain.handle('plans:update', (_e, input: { id: string; text?: string; completed?: boolean; order?: number }) => updatePlan(input))
ipcMain.handle('plans:delete', (_e, input: { id: string }) => { deletePlan(input.id); return { ok: true } })
```

确保 `listPlans`, `createPlan`, `updatePlan`, `deletePlan` 已从 `./db` 导入。

- [ ] **Step 3: 在 preload.ts 中暴露 plans API**

在 `electron/preload.ts` 中添加：

```typescript
// 计划
plans: {
  list: (input: { date: string }) => ipcRenderer.invoke('plans:list', input),
  create: (input: { date: string; text: string }) => ipcRenderer.invoke('plans:create', input),
  update: (input: { id: string; text?: string; completed?: boolean; order?: number }) => ipcRenderer.invoke('plans:update', input),
  delete: (id: string) => ipcRenderer.invoke('plans:delete', { id })
},
```

- [ ] **Step 4: 更新 types.d.ts**

在 `src/types.d.ts` 的 `Api` 接口中添加：

```typescript
plans: {
  list(input: { date: string }): Promise<PlanItem[]>
  create(input: { date: string; text: string }): Promise<PlanItem>
  update(input: { id: string; text?: string; completed?: boolean; order?: number }): Promise<PlanItem>
  delete(id: string): Promise<{ ok: boolean }>
}
```

确保 `PlanItem` 接口已在 types.d.ts 中定义（Phase 1 Task 8）。

- [ ] **Step 5: 验证类型检查**

```bash
vue-tsc --noEmit
```

- [ ] **Step 6: 提交**

```bash
git add electron/db.ts electron/main.ts electron/preload.ts src/types.d.ts
git commit -m "feat: PlanItem CRUD and IPC channels"
```

---

### Task 2: ReportTemplate clustering 字段 + 模板更新

**Files:**
- Modify: `electron/db.ts`（内置模板 seed 添加 clustering）

**Interfaces:**
- `ReportTemplate.clustering: 'timeline' | 'category' | 'project'`
- Phase 1 已在迁移逻辑中给旧模板补了 clustering='timeline'

- [ ] **Step 1: 更新内置模板 seed，添加 clustering 和新模板**

修改 `electron/db.ts` 中 `getDb()` 函数的内置模板初始化代码：

```typescript
if (d.templates.filter(t => t.isBuiltin).length === 0) {
  const now = new Date().toISOString()
  d.templates.push(
    {
      id: 'tpl-daily-default',
      name: '标准日报模板',
      type: 'daily',
      content: '# {{日期}} 工作日报\n\n## 今日完成\n{{今日完成}}\n\n## 关键数据\n{{关键数据}}\n\n## 遇到的问题\n{{遇到的问题}}\n\n## 明日计划\n{{明日计划}}',
      isBuiltin: true,
      clustering: 'timeline',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tpl-daily-simple',
      name: '简洁日报',
      type: 'daily',
      content: '# {{日期}} 工作日报\n\n## 已完成\n{{今日完成}}\n\n## 未完成\n{{遇到的问题}}\n\n## 明日计划\n{{明日计划}}',
      isBuiltin: true,
      clustering: 'category',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tpl-daily-tech',
      name: '技术日报',
      type: 'daily',
      content: '# {{日期}} 技术日报\n\n## 开发进展\n{{今日完成}}\n\n## 技术问题与解决方案\n{{关键数据}}\n\n## 代码质量\n{{遇到的问题}}\n\n## 明日技术计划\n{{明日计划}}',
      isBuiltin: true,
      clustering: 'category',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tpl-daily-project',
      name: '项目日报',
      type: 'daily',
      content: '# {{日期}} 项目日报\n\n## 项目进展\n{{今日完成}}\n\n## 里程碑状态\n{{关键数据}}\n\n## 风险与阻塞\n{{遇到的问题}}\n\n## 下一步\n{{明日计划}}',
      isBuiltin: true,
      clustering: 'project',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tpl-daily-pomodoro',
      name: '番茄钟聚类',
      type: 'daily',
      content: '# {{日期}} 工作日报\n\n## 工作时间块\n{{今日完成}}\n\n## 效率分析\n{{关键数据}}\n\n## 明日计划\n{{明日计划}}',
      isBuiltin: true,
      clustering: 'timeline',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tpl-weekly-default',
      name: '标准周报模板',
      type: 'weekly',
      content: '# {{起始}} - {{结束}} 工作周报\n\n## 本周完成\n{{本周完成}}\n\n## 关键成果\n{{关键成果}}\n\n## 问题与风险\n{{问题与风险}}\n\n## 下周计划\n{{下周计划}}',
      isBuiltin: true,
      clustering: 'timeline',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'tpl-monthly-default',
      name: '标准月报模板',
      type: 'monthly',
      content: '# {{月份}} 工作月报\n\n## 本月完成\n{{本月完成}}\n\n## 关键数据\n{{关键数据}}\n\n## 复盘与改进\n{{复盘与改进}}\n\n## 下月计划\n{{下月计划}}',
      isBuiltin: true,
      clustering: 'timeline',
      createdAt: now,
      updatedAt: now
    }
  )
  save()
}
```

- [ ] **Step 2: 验证**

```bash
vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add electron/db.ts
git commit -m "feat: add clustering field to built-in templates"
```

---

### Task 3: Today.vue 完整重写

**Files:**
- Modify: `src/views/Today.vue`（完整重写）

**Interfaces:**
- Consumes: `window.api.workRecords.list()`, `window.api.plans.*`, `window.api.heatmap.list()`, `window.api.system.displays()`, `window.api.settings.get()`
- 复用 Heatmap.vue 的 `cellColor()` 逻辑

- [ ] **Step 1: 重写 Today.vue 的 script setup**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, GripVertical, Loader2, Monitor } from 'lucide-vue-next'

const router = useRouter()

// 工作记录
const records = ref<any[]>([])
const loading = ref(true)

// 计划
const plans = ref<any[]>([])
const newPlanText = ref('')
const editingPlanId = ref<string | null>(null)
const editingPlanText = ref('')

// 设置
const settings = ref<any>({})

// 显示器
const displays = ref<any[]>([])

// 今日日期
const todayStr = formatDate(new Date())

// 加载数据
async function loadAll() {
  loading.value = true
  const [s, recs, pl, disp] = await Promise.all([
    window.api.settings.get(),
    window.api.workRecords.list({ date: todayStr }),
    window.api.plans.list({ date: todayStr }),
    window.api.system.displays()
  ])
  settings.value = s
  records.value = recs
  plans.value = pl
  displays.value = disp
  loading.value = false
}

onMounted(loadAll)

// 隐私状态
const privacyPills = computed(() => {
  const pills = []
  if (settings.value.autoDeleteScreenshots) pills.push('截图分析后即销毁 ✓')
  else pills.push('截图保留中')
  pills.push('数据仅存本地 ✓')
  if (settings.value.sensitiveSceneSkip) pills.push('内容脱敏处理 ✓')
  return pills
})

// 最近 5 条记录
const recentRecords = computed(() => records.value.slice(0, 5))

// 计划操作
async function addPlan() {
  if (!newPlanText.value.trim()) return
  await window.api.plans.create({ date: todayStr, text: newPlanText.value.trim() })
  newPlanText.value = ''
  plans.value = await window.api.plans.list({ date: todayStr })
}

async function togglePlan(plan: any) {
  await window.api.plans.update({ id: plan.id, completed: !plan.completed })
  plans.value = await window.api.plans.list({ date: todayStr })
}

async function deletePlan(id: string) {
  await window.api.plans.delete(id)
  plans.value = await window.api.plans.list({ date: todayStr })
}

function startEditPlan(plan: any) {
  editingPlanId.value = plan.id
  editingPlanText.value = plan.text
}

async function saveEditPlan() {
  if (!editingPlanId.value || !editingPlanText.value.trim()) return
  await window.api.plans.update({ id: editingPlanId.value, text: editingPlanText.value.trim() })
  editingPlanId.value = null
  editingPlanText.value = ''
  plans.value = await window.api.plans.list({ date: todayStr })
}

// 拖拽排序
function onDragStart(e: DragEvent, plan: any) {
  e.dataTransfer?.setData('text/plain', plan.id)
}

async function onDrop(e: DragEvent, target: any) {
  e.preventDefault()
  const sourceId = e.dataTransfer?.getData('text/plain')
  if (!sourceId || sourceId === target.id) return
  const sourceIdx = plans.value.findIndex(p => p.id === sourceId)
  const targetIdx = plans.value.findIndex(p => p.id === target.id)
  if (sourceIdx < 0 || targetIdx < 0) return
  // 交换 order
  const sourceOrder = plans.value[sourceIdx].order
  const targetOrder = plans.value[targetIdx].order
  await window.api.plans.update({ id: sourceId, order: targetOrder })
  await window.api.plans.update({ id: target.id, order: sourceOrder })
  plans.value = await window.api.plans.list({ date: todayStr })
}

// 24h 时段数据
const hourCounts = ref<number[]>(new Array(24).fill(0))

async function loadHeatmap() {
  const cells = await window.api.heatmap.list({
    startDate: new Date(todayStr + 'T00:00:00').toISOString(),
    endDate: new Date(todayStr + 'T23:59:59').toISOString()
  })
  hourCounts.value = new Array(24).fill(0)
  for (const c of cells) {
    if (c.date === todayStr) hourCounts.value[c.hour] = c.count
  }
}

onMounted(loadHeatmap)

const maxHourCount = computed(() => Math.max(...hourCounts.value, 1))

function cellColor(count: number): string {
  if (count === 0) return 'hsl(var(--muted))'
  const ratio = count / maxHourCount.value
  if (ratio < 0.2) return 'hsl(142 40% 85%)'
  if (ratio < 0.4) return 'hsl(142 55% 70%)'
  if (ratio < 0.6) return 'hsl(142 65% 55%)'
  if (ratio < 0.8) return 'hsl(142 71% 45%)'
  return 'hsl(142 71% 35%)'
}

// 时间格式化
function formatHour(h: number): string {
  return h.toString().padStart(2, '0') + ':00'
}

function formatRecordTime(iso: string): string {
  const d = new Date(iso)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}
</script>
```

- [ ] **Step 2: 重写 Today.vue 的 template**

```vue
<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <!-- API Key 未配置提示 -->
    <div v-if="!settings.apiKey" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
      ⚠️ 尚未配置 API Key，请前往 <button class="underline font-medium" @click="$router.push('/settings')">设置</button> 配置后才能使用截图识别和报告生成功能。
    </div>

    <!-- Hero 横幅 -->
    <div class="card p-6">
      <div class="flex items-start gap-4">
        <div class="text-4xl">📋</div>
        <div>
          <h1 class="text-xl font-bold">你只管工作，日报交给我</h1>
          <p class="text-sm text-muted-foreground mt-1">静默记录工作轨迹，AI 帮你写好每一份日报…</p>
          <div class="flex flex-wrap gap-2 mt-3">
            <span
              v-for="pill in privacyPills"
              :key="pill"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {{ pill }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 今日计划 -->
    <div class="card p-5">
      <h2 class="font-medium mb-3">今日计划</h2>
      <div class="space-y-2">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="flex items-center gap-2 group"
          draggable="true"
          @dragstart="onDragStart($event, plan)"
          @dragover.prevent
          @drop="onDrop($event, plan)"
        >
          <GripVertical class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
          <input
            type="checkbox"
            :checked="plan.completed"
            class="rounded"
            @change="togglePlan(plan)"
          />
          <template v-if="editingPlanId === plan.id">
            <input
              v-model="editingPlanText"
              class="flex-1 input h-7 text-sm"
              @keyup.enter="saveEditPlan"
              @keyup.escape="editingPlanId = null"
              @blur="saveEditPlan"
            />
          </template>
          <template v-else>
            <span
              class="flex-1 text-sm"
              :class="plan.completed ? 'line-through text-muted-foreground' : ''"
              @dblclick="startEditPlan(plan)"
            >
              {{ plan.text }}
            </span>
          </template>
          <button class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" @click="deletePlan(plan.id)">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-3">
        <Plus class="w-4 h-4 text-muted-foreground" />
        <input
          v-model="newPlanText"
          class="flex-1 input h-8 text-sm"
          placeholder="添加计划…"
          @keyup.enter="addPlan"
        />
      </div>
    </div>

    <!-- 工作概览 -->
    <div class="card p-5">
      <h2 class="font-medium mb-3">工作概览</h2>
      <div v-if="loading" class="flex items-center gap-2 text-muted-foreground py-6 justify-center">
        <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
      </div>
      <div v-else-if="records.length === 0" class="text-center py-6">
        <div class="text-3xl mb-2">🟢</div>
        <p class="text-sm text-muted-foreground">今天还没有工作记录，开始工作后会自动记录</p>
      </div>
      <div v-else>
        <div class="space-y-2">
          <div v-for="r in recentRecords" :key="r.id" class="flex items-center gap-3 text-sm">
            <span class="text-muted-foreground font-mono text-xs w-12">{{ formatRecordTime(r.startedAt) }}</span>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted">{{ r.category ?? '其他' }}</span>
            <span class="flex-1 truncate">{{ r.summary }}</span>
          </div>
        </div>
        <button
          v-if="records.length > 5"
          class="text-sm text-primary hover:underline mt-3"
          @click="$router.push('/timeline')"
        >
          查看全部 →
        </button>
      </div>
    </div>

    <!-- 时段记录 -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-medium">时段记录</h2>
      </div>
      <div class="flex items-center gap-1">
        <div v-for="h in 24" :key="h - 1" class="flex-1 text-center">
          <div
            class="h-7 rounded-[3px] transition-all duration-150 hover:scale-125 cursor-pointer"
            :style="{ backgroundColor: cellColor(hourCounts[h - 1]) }"
            :title="`${formatHour(h - 1)} · ${hourCounts[h - 1]} 条记录`"
          ></div>
          <div v-if="(h - 1) % 6 === 0" class="text-[10px] text-muted-foreground mt-1">{{ formatHour(h - 1) }}</div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
        <span>少</span>
        <div class="w-4 h-4 rounded-sm" style="background-color: hsl(var(--muted))"></div>
        <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 40% 85%)"></div>
        <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 55% 70%)"></div>
        <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 65% 55%)"></div>
        <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 71% 45%)"></div>
        <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 71% 35%)"></div>
        <span>多</span>
      </div>
    </div>

    <!-- 已连接显示器 -->
    <div class="card p-5">
      <h2 class="font-medium mb-3">已连接显示器</h2>
      <div v-if="displays.length === 0" class="text-sm text-muted-foreground">未检测到显示器</div>
      <div v-else class="space-y-2">
        <div v-for="d in displays" :key="d.id" class="flex items-center gap-3 text-sm">
          <Monitor class="w-4 h-4 text-muted-foreground" />
          <span>{{ d.label }}</span>
          <span class="text-muted-foreground">·</span>
          <span class="text-muted-foreground">{{ d.width }}×{{ d.height }}</span>
          <span class="text-muted-foreground">·</span>
          <span class="text-muted-foreground">{{ d.scaleFactor * 100 }}%</span>
          <span v-if="d.isPrimary" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">主显示器</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 验证**

```bash
npm run dev
```
打开 Today 页，确认 Hero、计划、概览、时段、显示器全部正常显示。

- [ ] **Step 4: 提交**

```bash
git add src/views/Today.vue
git commit -m "feat: complete Today page rewrite with plan system"
```

---

### Task 4: 报告模板增强 — 智能推荐 + 聚类 prompt

**Files:**
- Modify: `src/views/Reports.vue`（模板卡片选择 + 智能推荐）
- Modify: `electron/ai.ts`（聚类策略 prompt + 计划注入）

**Interfaces:**
- Consumes: `window.api.reportTemplates.list()`, `window.api.workRecords.list()`, `window.api.plans.list()`
- `generateReport()` prompt 根据 clustering 字段调整组织方式

- [ ] **Step 1: 修改 ai.ts 的 generateReport() 函数**

在 `electron/ai.ts` 的 `generateReport()` 函数中，修改 userPrompt 构建逻辑：

```typescript
// 在 lines.push(`【工作记录】`) 之前添加

// 聚类策略提示
if (input.templateBody) {
  // 从模板中提取聚类方式（通过 input 传入）
  const clusteringHints: Record<string, string> = {
    timeline: '按时间线排列工作记录，标注每个时间段做了什么。',
    category: '按工作分类归纳（开发/会议/文档/测试/沟通等），每类下列出具体事项。',
    project: '识别工作记录中的项目关键词，按项目维度分组组织内容。'
  }
  const hint = clusteringHints[input.clustering ?? 'timeline'] ?? clusteringHints.timeline
  lines.push(`【组织方式】${hint}`)
}

// 计划注入
if (input.plans && input.plans.length > 0) {
  lines.push('【今日计划】')
  const completed = input.plans.filter(p => p.completed)
  const incomplete = input.plans.filter(p => !p.completed)
  if (completed.length > 0) {
    lines.push('已完成：')
    completed.forEach(p => lines.push(`- [x] ${p.text}`))
  }
  if (incomplete.length > 0) {
    lines.push('未完成：')
    incomplete.forEach(p => lines.push(`- [ ] ${p.text}`))
  }
}
```

修改 `GenerateReportInput` 接口：

```typescript
export interface GenerateReportInput {
  type: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate: string
  templateBody?: string
  customInstruction?: string
  memoryContent?: string
  clustering?: 'timeline' | 'category' | 'project'  // 新增
  plans?: Array<{ text: string; completed: boolean }>  // 新增
  records: Array<{ startedAt: string; summary: string; category?: string }>
  appUsageSummary?: Array<{ appName: string; durationMinutes: number }>
}
```

- [ ] **Step 2: 修改 Reports.vue 的模板选择 UI**

在 `src/views/Reports.vue` 中，将模板下拉选择改为卡片式选择：

```vue
<!-- 替换原有的模板下拉选择 -->
<div>
  <label class="text-sm font-medium">报告模板</label>
  <p class="text-xs text-muted-foreground mb-2">选择报告输出的格式模板，作为 AI 生成的基准参考</p>
  <div class="grid grid-cols-2 gap-2">
    <button
      v-for="tpl in filteredTemplates"
      :key="tpl.id"
      class="p-3 rounded-lg border text-left transition-colors"
      :class="selectedTemplateId === tpl.id
        ? 'border-primary bg-primary/5'
        : 'border-border hover:border-primary/50'"
      @click="selectedTemplateId = tpl.id"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{{ tpl.name }}</span>
        <span v-if="recommendedTemplateId === tpl.id" class="text-xs text-primary">推荐 ✓</span>
      </div>
      <p class="text-xs text-muted-foreground mt-1">
        {{ clusteringDesc(tpl.clustering) }}
      </p>
      <span class="text-[10px] text-muted-foreground mt-1 inline-block">
        {{ tpl.isBuiltin ? '内置' : '自定义' }}
      </span>
    </button>
  </div>
</div>
```

在 script 中添加智能推荐逻辑：

```typescript
const recommendedTemplateId = ref('')

async function computeRecommendation() {
  if (!form.value.startDate) return
  const records = await window.api.workRecords.list({
    startDate: form.value.startDate,
    endDate: form.value.endDate
  })
  if (records.length === 0) return

  // 统计 category 占比
  const counts: Record<string, number> = {}
  for (const r of records) {
    const cat = r.category ?? '其他'
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  const total = records.length
  const devRatio = (counts['开发'] ?? 0) / total
  const commRatio = ((counts['会议'] ?? 0) + (counts['沟通'] ?? 0)) / total

  if (devRatio > 0.5) {
    recommendedTemplateId.value = 'tpl-daily-tech'
  } else if (commRatio > 0.4) {
    recommendedTemplateId.value = 'tpl-daily-simple'
  } else if (Object.keys(counts).length > 3) {
    recommendedTemplateId.value = 'tpl-daily-project'
  } else {
    recommendedTemplateId.value = 'tpl-daily-default'
  }
}

function clusteringDesc(clustering: string): string {
  switch (clustering) {
    case 'timeline': return '按时间顺序排列'
    case 'category': return '按分类归纳'
    case 'project': return '按项目维度组织'
    default: return ''
  }
}
```

在生成报告时，传入 clustering 和 plans：

```typescript
async function generate() {
  // ... 获取模板内容 ...
  const selectedTemplate = templates.value.find(t => t.id === selectedTemplateId.value)
  const plans = await window.api.plans.list({ date: form.value.startDate })

  const input = {
    type: form.value.type,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    templateBody: selectedTemplate?.content,
    clustering: selectedTemplate?.clustering ?? 'timeline',
    plans: plans.map(p => ({ text: p.text, completed: p.completed })),
    customInstruction: form.value.customInstruction,
    records: records.map(r => ({ startedAt: r.startedAt, summary: r.summary, category: r.category }))
  }
  // ... 调用 generateReport ...
}
```

- [ ] **Step 3: 报告生成流程 UI**

在 Reports.vue 中添加生成中状态和完成后操作：

```vue
<!-- 生成中状态 -->
<div v-if="generating" class="card p-5">
  <div class="flex items-center gap-2 mb-3">
    <Loader2 class="w-4 h-4 animate-spin" />
    <span class="text-sm">正在生成...</span>
  </div>
  <div class="prose prose-sm max-w-none" v-html="renderedStream"></div>
</div>

<!-- 完成后操作 -->
<div v-if="reportDone" class="card p-5">
  <div class="flex items-center gap-2 mb-3">
    <span class="text-sm text-primary">✓ 生成完成</span>
  </div>
  <div class="prose prose-sm max-w-none" v-html="renderedContent"></div>
  <div class="flex gap-2 mt-4">
    <button class="btn btn-sm" @click="startInlineEdit">编辑</button>
    <button class="btn btn-sm btn-outline" @click="exportMd">导出 MD</button>
    <button class="btn btn-sm btn-outline" @click="exportTxt">导出 TXT</button>
    <button class="btn btn-sm btn-outline" @click="$router.push('/history')">查看历史</button>
  </div>
</div>
```

- [ ] **Step 4: 验证**

```bash
npm run dev
```
打开生成报告页，确认模板卡片选择、推荐标签、计划注入正常。

- [ ] **Step 5: 提交**

```bash
git add src/views/Reports.vue electron/ai.ts
git commit -m "feat: report template cards, smart recommendation, plan injection"
```

---

### Task 5: AI 洞察建议（热力图 + 应用使用）

**Files:**
- Modify: `src/views/Heatmap.vue`（添加 AI 洞察）
- Modify: `src/views/AppUsage.vue`（添加 AI 洞察）
- Modify: `electron/ai.ts`（添加 generateInsight 函数）
- Modify: `electron/main.ts`（注册 ai:insight IPC）
- Modify: `electron/preload.ts`（暴露 ai.generateInsight）

**Interfaces:**
- 新增 `ai:insight` IPC 通道
- `generateInsight(type, data)` → 流式返回一行洞察文本

- [ ] **Step 1: 在 ai.ts 中添加 generateInsight 函数**

```typescript
export async function generateInsight(
  type: 'heatmap' | 'appUsage',
  data: any,
  onChunk: (chunk: string) => void,
  onDone: (full: string) => void,
  onError: (err: Error) => void
): Promise<void> {
  const settings = getSettings()
  if (!settings.apiKey) { onError(new Error('请先配置 API Key')); return }

  const prompts: Record<string, string> = {
    heatmap: `以下是用户的时段热力图数据（日期 × 小时 × 记录数）：\n${JSON.stringify(data)}\n\n请用一句话总结用户的工作节奏特点和一个改进建议。不超过 100 字。`,
    appUsage: `以下是用户的应用使用时长数据：\n${JSON.stringify(data)}\n\n请用一句话总结用户的时间分配特点和一个改进建议。不超过 100 字。`
  }

  try {
    const res = await fetch(apiUrl(settings, '/chat/completions'), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: '你是一个工作效率分析助手。请简洁、具体地回答。' },
          { role: 'user', content: prompts[type] }
        ],
        stream: true,
        temperature: 0.5,
        max_tokens: 200
      })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('无响应流')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const eventLines = buffer.split('\n')
      buffer = eventLines.pop() ?? ''
      for (const line of eventLines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) { full += delta; onChunk(delta) }
        } catch {}
      }
    }
    onDone(full)
  } catch (e) { onError(e as Error) }
}
```

- [ ] **Step 2: 注册 IPC 和 preload**

在 `electron/main.ts` 中添加：

```typescript
ipcMain.handle('ai:insight', async (_e, input: { type: 'heatmap' | 'appUsage'; data: any }) => {
  return new Promise((resolve, reject) => {
    generateInsight(
      input.type,
      input.data,
      (chunk) => emit('ai:insight-stream-chunk', { type: input.type, chunk }),
      (full) => { emit('ai:insight-status-changed', { type: input.type, status: 'completed', content: full }); resolve({ ok: true }) },
      (err) => { emit('ai:insight-status-changed', { type: input.type, status: 'failed', error: err.message }); reject(err) }
    )
  })
})
```

在 `electron/preload.ts` 中添加：

```typescript
ai: {
  // 现有...
  generateInsight: (input: { type: string; data: any }) => ipcRenderer.invoke('ai:insight', input),
  onInsightStreamChunk: (cb: (data: any) => void) => {
    const l = (_e: any, d: any) => cb(d)
    ipcRenderer.on('ai:insight-stream-chunk', l)
    return () => ipcRenderer.removeListener('ai:insight-stream-chunk', l)
  },
  onInsightStatusChanged: (cb: (data: any) => void) => {
    const l = (_e: any, d: any) => cb(d)
    ipcRenderer.on('ai:insight-status-changed', l)
    return () => ipcRenderer.removeListener('ai:insight-status-changed', l)
  }
}
```

- [ ] **Step 3: 在 Heatmap.vue 中添加 AI 洞察**

在热力图卡片下方添加：

```vue
<!-- AI 洞察 -->
<div v-if="cells.length > 0" class="card p-4 mt-4">
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm font-medium">AI 洞察</span>
    <button class="text-xs text-muted-foreground hover:text-primary" @click="refreshInsight">刷新</button>
  </div>
  <div v-if="insightLoading" class="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 class="w-3 h-3 animate-spin" /> 分析中...
  </div>
  <p v-else class="text-sm text-muted-foreground">{{ insightText }}</p>
  <button class="text-xs text-primary hover:underline mt-2" @click="$router.push('/agent')">展开详细分析 →</button>
</div>
```

在 script 中添加：

```typescript
const insightText = ref('')
const insightLoading = ref(false)
const insightCache = new Map<string, string>()

async function loadInsight() {
  const cacheKey = `${startDate.value}_${endDate.value}`
  if (insightCache.has(cacheKey)) {
    insightText.value = insightCache.get(cacheKey)!
    return
  }
  if (cells.value.length === 0) return
  insightLoading.value = true
  const unsub = window.api.ai.onInsightStreamChunk((data) => {
    if (data.type === 'heatmap') insightText.value += data.chunk
  })
  try {
    await window.api.ai.generateInsight({ type: 'heatmap', data: cells.value })
    insightCache.set(cacheKey, insightText.value)
  } catch (e: any) {
    insightText.value = '生成失败：' + (e.message ?? '未知错误')
  } finally {
    insightLoading.value = false
    unsub()
  }
}

function refreshInsight() {
  const cacheKey = `${startDate.value}_${endDate.value}`
  insightCache.delete(cacheKey)
  insightText.value = ''
  loadInsight()
}

// 在 load() 函数末尾调用
// loadInsight()
```

- [ ] **Step 4: 在 AppUsage.vue 中添加类似 AI 洞察**

逻辑与 Heatmap.vue 相同，type 改为 `'appUsage'`。

- [ ] **Step 5: 验证类型检查**

```bash
vue-tsc --noEmit
```

- [ ] **Step 6: 提交**

```bash
git add src/views/Heatmap.vue src/views/AppUsage.vue electron/ai.ts electron/main.ts electron/preload.ts
git commit -m "feat: AI insights on heatmap and app usage pages"
```

---

### Task 6: 构建验证

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
- [ ] Today 页 Hero + 隐私 Pill + 计划 + 概览 + 时段 + 显示器全部正常
- [ ] 计划可以添加/完成/编辑/删除/拖拽排序
- [ ] 生成报告页模板卡片选择正常，推荐标签显示
- [ ] 报告生成时显示流式渲染，完成后有操作按钮
- [ ] 计划注入到报告 prompt 中
- [ ] 热力图下方显示 AI 洞察
- [ ] 应用使用页下方显示 AI 洞察

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: Phase 2 complete - Today page, plan system, report enhancement, AI insights"
```
