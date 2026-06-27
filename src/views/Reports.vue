<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { marked } from 'marked'
import { isApiReady, safeCall, formatDate, formatDateTime, relativeTime, today } from '@/lib/utils'
import type { Report, ReportTemplate, WorkRecord } from '@/types'
import { toast } from '@/lib/toast'
import { Loader2, Trash2, Download, FileText, Sparkles, ChevronLeft, Pencil, Check, Eye, Edit3, Save } from 'lucide-vue-next'

marked.setOptions({ breaks: true, gfm: true })

const reports = ref<Report[]>([])
const templates = ref<ReportTemplate[]>([])
const loading = ref(true)
const generating = ref(false)
const streamingContent = ref('')
const generatingId = ref<string | null>(null)
const selectedReport = ref<Report | null>(null)
const editingTitle = ref(false)
const titleDraft = ref('')
const editMode = ref(false)
const contentDraft = ref('')
const savingContent = ref(false)
const errorMessage = ref('')

function showError(msg: string) {
  errorMessage.value = msg
  setTimeout(() => {
    if (errorMessage.value === msg) {
      errorMessage.value = ''
    }
  }, 3000)
}

const form = ref({
  type: 'daily' as 'daily' | 'weekly' | 'monthly',
  startDate: today(),
  endDate: today(),
  templateId: '',
  customInstruction: '',
  useMemory: true
})

const recommendedTemplateId = ref('')

let unsubStream: (() => void) | null = null
let unsubStatus: (() => void) | null = null

const typeLabels = { daily: '日报', weekly: '周报', monthly: '月报' }

const clusteringLabels: Record<string, string> = {
  timeline: '按时间顺序排列',
  category: '按分类归纳',
  project: '按项目维度组织'
}

function clusteringDesc(clustering?: string): string {
  if (!clustering) return ''
  return clusteringLabels[clustering] ?? ''
}

// 当前类型下可选模板
const filteredTemplates = computed(() =>
  templates.value.filter(t => t.type === form.value.type)
)

// 智能推荐：基于工作记录分类占比推荐模板
async function computeRecommendation() {
  if (form.value.type !== 'daily') {
    recommendedTemplateId.value = ''
    return
  }
  if (!form.value.startDate) return
  try {
    const start = new Date(form.value.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(form.value.endDate)
    end.setHours(23, 59, 59, 999)
    const recs = await safeCall(
      () => window.api.workRecords.list({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 500
      }),
      [] as WorkRecord[]
    )
    if (recs.length === 0) {
      recommendedTemplateId.value = ''
      return
    }
    const counts: Record<string, number> = {}
    for (const r of recs) {
      const cat = r.category ?? '其他'
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    const total = recs.length
    const devRatio = (counts['开发'] ?? 0) / total
    const commRatio = ((counts['会议'] ?? 0) + (counts['沟通'] ?? 0)) / total

    if (devRatio > 0.5) {
      recommendedTemplateId.value = 'tpl-daily-scrum'
    } else if (commRatio > 0.4) {
      recommendedTemplateId.value = 'tpl-daily-standard'
    } else if (Object.keys(counts).length > 3) {
      recommendedTemplateId.value = 'tpl-daily-result'
    } else {
      recommendedTemplateId.value = 'tpl-daily-standard'
    }
    if (!filteredTemplates.value.find(t => t.id === recommendedTemplateId.value)) {
      recommendedTemplateId.value = ''
    }
  } catch {
    recommendedTemplateId.value = ''
  }
}

const renderedContent = computed(() => {
  const content = selectedReport.value?.content || streamingContent.value
  if (!content) return ''
  return marked.parse(content) as string
})

// 5+1 模板 fallback（dev 模式 / IPC 不可用时使用，与 electron/db.ts 保持一致）
const FALLBACK_TEMPLATES: ReportTemplate[] = [
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
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z'
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
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z'
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
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z'
  },
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
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z'
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
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z'
  },
  {
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
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z'
  }
]

async function load() {
  loading.value = true
  try {
    const [r, t] = await Promise.all([
      safeCall(() => window.api.reports.list({ limit: 100 }), [] as Report[]),
      safeCall(() => window.api.reportTemplates.list(), FALLBACK_TEMPLATES)
    ])
    reports.value = r
    // 模板兜底：IPC 返回空时用 fallback（dev 模式）
    templates.value = t && t.length > 0 ? t : FALLBACK_TEMPLATES
  } finally {
    loading.value = false
  }
}

async function loadRecords(): Promise<WorkRecord[]> {
  const start = new Date(form.value.startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(form.value.endDate)
  end.setHours(23, 59, 59, 999)
  return safeCall(
    () => window.api.workRecords.list({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 500
    }),
    [] as WorkRecord[]
  )
}

function openGenerate() {
  form.value = {
    type: 'daily',
    startDate: today(),
    endDate: today(),
    templateId: '',
    customInstruction: '',
    useMemory: true
  }
  recommendedTemplateId.value = ''
  streamingContent.value = ''
  generatingId.value = null
  computeRecommendation().then(() => {
    if (!form.value.templateId && recommendedTemplateId.value) {
      form.value.templateId = recommendedTemplateId.value
    }
  })
}

// 表单类型或日期变化时重新计算推荐
function onFormChange() {
  form.value.templateId = ''
  computeRecommendation().then(() => {
    if (recommendedTemplateId.value) {
      form.value.templateId = recommendedTemplateId.value
    }
  })
}

async function generate() {
  if (!isApiReady()) {
    showError('Electron 未启动，无法生成报告')
    return
  }
  const records = await loadRecords()
  if (records.length === 0) {
    showError('所选日期范围内没有工作记录，无法生成报告')
    return
  }
  const settings = await safeCall(() => window.api.settings.get(), null as any)
  const tpl = form.value.templateId ? templates.value.find(t => t.id === form.value.templateId) : null

  // 拉取今日计划注入到日报
  let plans: Array<{ text: string; completed: boolean }> = []
  if (form.value.type === 'daily') {
    try {
      const planList = await safeCall(
        () => window.api.plans.list({ date: form.value.startDate }),
        [] as any[]
      )
      plans = planList.map((p: any) => ({ text: p.text, completed: p.completed }))
    } catch {
      plans = []
    }
  }

  generating.value = true
  streamingContent.value = ''
  selectedReport.value = null

  const input = {
    type: form.value.type,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    templateBody: tpl?.content,
    clustering: tpl?.clustering ?? 'timeline',
    plans: plans.length > 0 ? plans : undefined,
    customInstruction: form.value.customInstruction || undefined,
    memoryContent: form.value.useMemory ? settings?.memoryContent : undefined,
    records: records.map(r => ({
      startedAt: r.startedAt,
      summary: r.summary,
      category: r.category ?? undefined
    }))
  }

  try {
    const res = await window.api.ai.generateReport(input)
    generatingId.value = res.id

    unsubStream = window.api.ai.onReportStreamChunk((data) => {
      if (data.id === generatingId.value) {
        streamingContent.value += data.chunk
      }
    })
    unsubStatus = window.api.ai.onReportStatusChanged(async (data) => {
      if (data.id === generatingId.value) {
        generating.value = false
        if (data.status === 'completed') {
          await load()
          const r = reports.value.find(x => x.id === data.id)
          if (r) selectedReport.value = r
          toast.success('报告生成完成')
        } else if (data.status === 'failed') {
          showError('生成失败：' + (data.error ?? '未知错误'))
        }
        unsubStream?.()
        unsubStatus?.()
      }
    })
  } catch (e: any) {
    generating.value = false
    showError('生成失败：' + (e?.message ?? '未知错误'))
  }
}

function viewReport(r: Report) {
  selectedReport.value = r
  streamingContent.value = ''
}

function backToList() {
  selectedReport.value = null
}

async function deleteReport(id: string) {
  if (!isApiReady()) return showError('Electron 未启动')
  if (!confirm('确认删除这份报告？')) return
  await window.api.reports.delete(id)
  if (selectedReport.value?.id === id) selectedReport.value = null
  await load()
  toast.success('报告已删除')
}

async function exportReport(r: Report) {
  if (!isApiReady()) return showError('Electron 未启动')
  const res = await window.api.reports.exportToFile(r.id, 'md')
  if (!res.ok && res.message) showError(res.message)
  else toast.success('已导出为 ' + (res.path ?? '文件'))
}

function startEditTitle() {
  if (!selectedReport.value) return
  titleDraft.value = selectedReport.value.title
  editingTitle.value = true
}

async function saveTitle() {
  if (!selectedReport.value || !isApiReady()) return
  await window.api.reports.updateTitle(selectedReport.value.id, titleDraft.value)
  selectedReport.value.title = titleDraft.value
  const r = reports.value.find(x => x.id === selectedReport.value!.id)
  if (r) r.title = titleDraft.value
  editingTitle.value = false
  toast.success('标题已更新')
}

function startEditContent() {
  if (!selectedReport.value) return
  contentDraft.value = selectedReport.value.content
  editMode.value = true
}

function cancelEditContent() {
  editMode.value = false
  contentDraft.value = ''
}

async function saveContent() {
  if (!selectedReport.value || !isApiReady()) return
  savingContent.value = true
  try {
    await window.api.reports.updateContent(selectedReport.value.id, contentDraft.value)
    selectedReport.value.content = contentDraft.value
    const r = reports.value.find(x => x.id === selectedReport.value!.id)
    if (r) r.content = contentDraft.value
    editMode.value = false
  } finally {
    savingContent.value = false
  }
}

onMounted(load)
onUnmounted(() => {
  unsubStream?.()
  unsubStatus?.()
})
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto w-full h-full overflow-y-auto min-h-0">
    <!-- 报告详情视图 -->
    <template v-if="selectedReport">
      <div class="flex items-center gap-3 mb-4">
        <button class="btn-ghost btn-icon" @click="backToList"><ChevronLeft class="w-4 h-4" /></button>
        <div class="flex-1 flex items-center gap-2">
          <input v-if="editingTitle" v-model="titleDraft" class="input flex-1" @keyup.enter="saveTitle" />
          <h1 v-else class="text-xl font-semibold flex-1">{{ selectedReport.title }}</h1>
          <button v-if="editingTitle" class="btn-primary btn-sm" @click="saveTitle"><Check class="w-3.5 h-3.5" /></button>
          <button v-else class="btn-ghost btn-icon btn-sm" @click="startEditTitle"><Pencil class="w-3.5 h-3.5" /></button>
        </div>
        <template v-if="editMode">
          <button class="btn-ghost btn-sm" @click="cancelEditContent" :disabled="savingContent">取消</button>
          <button class="btn-primary btn-sm" @click="saveContent" :disabled="savingContent">
            <Save v-if="!savingContent" class="w-3.5 h-3.5" />
            <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
            保存
          </button>
        </template>
        <template v-else>
          <button class="btn-outline btn-sm" @click="startEditContent"><Edit3 class="w-3.5 h-3.5" /> 编辑</button>
          <button class="btn-outline btn-sm" @click="exportReport(selectedReport)"><Download class="w-3.5 h-3.5" /> 导出</button>
        </template>
        <button class="btn-ghost btn-sm hover:text-destructive" @click="deleteReport(selectedReport.id)"><Trash2 class="w-3.5 h-3.5" /></button>
      </div>

      <div class="text-xs text-muted-foreground mb-4 flex items-center gap-3">
        <span>{{ typeLabels[selectedReport.type] }}</span>
        <span>{{ selectedReport.startDate }} 至 {{ selectedReport.endDate }}</span>
        <span>{{ relativeTime(selectedReport.createdAt) }}</span>
        <span v-if="selectedReport.model" class="font-mono">{{ selectedReport.model }}</span>
      </div>

      <!-- 左右分栏：编辑模式时左侧编辑器 + 右侧预览；预览模式时全宽预览 -->
      <div v-if="editMode" class="grid grid-cols-2 gap-4" style="height: calc(100vh - 220px);">
        <div class="card p-0 overflow-hidden flex flex-col">
          <div class="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground">
            <Edit3 class="w-3.5 h-3.5" />
            <span>编辑（Markdown）</span>
          </div>
          <textarea
            v-model="contentDraft"
            class="flex-1 w-full p-4 text-sm font-mono resize-none border-0 outline-none bg-transparent"
            style="user-select: text"
          ></textarea>
        </div>
        <div class="card p-0 overflow-hidden flex flex-col">
          <div class="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground">
            <Eye class="w-3.5 h-3.5" />
            <span>预览</span>
          </div>
          <div class="flex-1 overflow-auto p-6 markdown-body" v-html="marked.parse(contentDraft || '*暂无内容*')"></div>
        </div>
      </div>

      <div v-else class="card p-6 markdown-body" v-html="renderedContent"></div>
    </template>

    <!-- 列表视图 · 单栏铺满：上方配置 + 下方历史报告 -->
    <template v-else>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="font-display text-[26px] font-bold tracking-tight">生成报告</h1>
          <p class="text-xs text-muted-foreground mt-1">配置参数后点击生成，AI 自动撰写报告</p>
        </div>
        <button class="btn-primary" @click="openGenerate" :disabled="generating">
          <Sparkles v-if="!generating" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          {{ generating ? '生成中...' : '快速生成报告' }}
        </button>
      </div>

      <!-- 配置区 · 铺满整宽 -->
      <div class="card p-6 mb-6">
        <div class="grid grid-cols-12 gap-5">
          <!-- 左列：报告类型 + 日期 + 模板 -->
          <div class="col-span-12 lg:col-span-7 space-y-4">
            <div>
              <label class="label mb-1.5 block text-muted-foreground text-[11.5px] font-mono uppercase tracking-wider">报告类型</label>
              <q-btn-toggle
                v-model="form.type"
                spread
                no-caps
                unelevated
                toggle-color="primary"
                color="white"
                text-color="foreground"
                class="report-type-toggle full-width"
                :options="[
                  { label: '日报', value: 'daily' },
                  { label: '周报', value: 'weekly' },
                  { label: '月报', value: 'monthly' }
                ]"
                @update:model-value="onFormChange"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label mb-1.5 block text-muted-foreground text-[11.5px] font-mono uppercase tracking-wider">开始日期</label>
                <q-input v-model="form.startDate" outlined dense mask="####-##-##" class="date-input">
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="form.startDate" mask="YYYY-MM-DD" minimal @update:model-value="onFormChange" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <div>
                <label class="label mb-1.5 block text-muted-foreground text-[11.5px] font-mono uppercase tracking-wider">结束日期</label>
                <q-input v-model="form.endDate" outlined dense mask="####-##-##" class="date-input">
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="form.endDate" mask="YYYY-MM-DD" minimal @update:model-value="onFormChange" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="label text-muted-foreground text-[11.5px] font-mono uppercase tracking-wider">报告模板</label>
                <button
                  v-if="form.templateId"
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  @click="form.templateId = ''"
                >不使用模板</button>
              </div>
              <p class="text-xs text-muted-foreground mb-2">选择输出格式作为 AI 生成的基准参考</p>
              <div class="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                <button
                  v-for="tpl in filteredTemplates"
                  :key="tpl.id"
                  type="button"
                  class="p-3 rounded-[10px] border text-left transition-all duration-200"
                  :class="form.templateId === tpl.id
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'"
                  :style="form.templateId === tpl.id ? { background: 'hsl(27 92% 63% / 0.08)' } : {}"
                  @click="form.templateId = tpl.id"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium truncate">{{ tpl.name }}</span>
                    <span v-if="recommendedTemplateId === tpl.id" class="text-[10.5px] flex items-center gap-0.5 flex-shrink-0" style="color: hsl(27 92% 50%)">
                      <Sparkles class="w-3 h-3" />推荐
                    </span>
                  </div>
                  <p class="text-xs text-muted-foreground mt-1">{{ clusteringDesc(tpl.clustering) }}</p>
                  <span class="text-[10px] text-muted-foreground mt-1 inline-block font-mono">
                    {{ tpl.isBuiltin ? '内置' : '自定义' }}
                  </span>
                </button>
                <button
                  v-if="filteredTemplates.length === 0"
                  type="button"
                  class="p-3 rounded-[10px] border border-dashed border-border text-xs text-muted-foreground col-span-2 text-center"
                >该类型暂无模板</button>
              </div>
            </div>
          </div>

          <!-- 右列：自定义指令 + 记忆 + 开始生成 -->
          <div class="col-span-12 lg:col-span-5 space-y-4">
            <div>
              <label class="label mb-1.5 block text-muted-foreground text-[11.5px] font-mono uppercase tracking-wider">自定义指令（可选）</label>
              <textarea v-model="form.customInstruction" class="textarea" rows="4" placeholder="例如：突出数据成果，简洁风格"></textarea>
            </div>
            <div class="flex items-center justify-between p-3 rounded-[10px] border border-border">
              <div>
                <div class="text-sm font-medium">使用个人工作记忆</div>
                <div class="text-xs text-muted-foreground mt-0.5">将设置中的 AI 记忆内容注入提示词</div>
              </div>
              <q-toggle v-model="form.useMemory" color="primary" keep-color />
            </div>
            <div class="flex justify-end">
              <button class="btn-primary btn-lg" @click="generate" :disabled="generating">
                <Sparkles v-if="!generating" class="w-4 h-4" />
                <Loader2 v-else class="w-4 h-4 animate-spin" />
                {{ generating ? '正在生成…' : '开始生成报告' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 流式生成中 -->
      <div v-if="generating" class="card p-5 mb-4">
        <div class="flex items-center gap-2 text-sm mb-3" style="color: hsl(27 92% 50%)">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span class="font-semibold">正在生成 {{ typeLabels[form.type] }}…</span>
          <span class="ml-auto chip chip-cool">实时</span>
        </div>
        <div class="markdown-body text-sm" v-html="marked.parse(streamingContent || '等待响应...')"></div>
      </div>

      <!-- 历史报告区 · 下方铺满 -->
      <div>
        <div class="flex items-center gap-2.5 mb-3">
          <h2 class="font-display text-[15px] font-semibold tracking-tight">历史报告</h2>
          <span class="chip chip-neutral">{{ reports.length }}</span>
        </div>

        <div v-if="loading" class="flex items-center gap-2 text-muted-foreground py-6 justify-center">
          <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
        </div>

        <div v-else-if="reports.length === 0" class="card p-12 text-center text-muted-foreground">
          <div class="w-14 h-14 rounded-[14px] mx-auto mb-3 flex items-center justify-center"
               style="background: linear-gradient(135deg, hsl(165 21% 92%), hsl(27 92% 95%));">
            <FileText class="w-6 h-6 text-primary" />
          </div>
          <div class="font-display text-[15px] font-semibold mb-1 text-foreground">还没有生成过报告</div>
          <p class="text-xs">配置上方参数后点击"开始生成报告"</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="r in reports"
            :key="r.id"
            class="card card-hover p-4 cursor-pointer"
            @click="viewReport(r)"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                   style="background: linear-gradient(135deg, hsl(27 92% 95%), hsl(165 21% 92%)); color: hsl(27 92% 50%);">
                <FileText class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate text-foreground">{{ r.title }}</div>
                <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                  <span class="chip chip-neutral !text-[10px] !py-0 !px-1.5">{{ typeLabels[r.type] }}</span>
                  <span class="font-mono text-[10.5px]">{{ r.startDate }} ~ {{ r.endDate }}</span>
                </div>
                <div class="text-[11px] text-muted-foreground mt-1.5">{{ relativeTime(r.createdAt) }}</div>
                <div class="flex items-center gap-1.5 mt-2">
                  <span v-if="r.status === 'generating'" class="chip chip-warn !text-[10px]">生成中</span>
                  <span v-else-if="r.status === 'failed'" class="chip !text-[10px]" style="background: hsl(16 65% 95%); color: hsl(16 65% 35%)">失败</span>
                  <span v-else class="chip !text-[10px]" style="background: hsl(142 50% 92%); color: hsl(142 60% 30%)">已完成</span>
                  <div class="ml-auto flex items-center gap-1">
                    <button class="btn-ghost btn-icon btn-sm" @click.stop="exportReport(r)" title="导出"><Download class="w-3.5 h-3.5" /></button>
                    <button class="btn-ghost btn-icon btn-sm hover:!text-destructive" @click.stop="deleteReport(r.id)" title="删除"><Trash2 class="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Quasar 控件皮肤统一到 design token */
.report-type-toggle :deep(.q-btn) {
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
}
.report-type-toggle :deep(.q-btn--unelevated) {
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  border: 1px solid hsl(var(--border));
  transition: all .2s ease;
}
.report-type-toggle :deep(.q-btn--unelevated:hover) {
  background: hsl(var(--accent));
  border-color: hsl(var(--muted-foreground) / 0.3);
}
.report-type-toggle :deep(.q-btn-item) {
  margin: 0 2px;
}

.date-input :deep(.q-field__control) {
  border-radius: 10px;
  background: hsl(var(--background));
  min-height: 36px;
}
.date-input :deep(.q-field__control):hover {
  border-color: hsl(var(--muted-foreground) / 0.3);
}
.date-input :deep(.q-field--focused .q-field__control) {
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.14);
  border-color: hsl(var(--primary));
}
.date-input :deep(.q-field__native),
.date-input :deep(.q-field__input) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.01em;
}

/* Quasar 弹窗 / 日历 与主题一致 */
:deep(.q-date) {
  border-radius: 14px;
  font-family: inherit;
}
:deep(.q-date__header) {
  background: linear-gradient(135deg, hsl(27 92% 95%), hsl(165 21% 92%));
}
:deep(.q-date__today) {
  color: hsl(27 92% 50%);
  font-weight: 700;
}
:deep(.q-date__event) {
  background: hsl(27 92% 63% / 0.2);
  color: hsl(27 92% 50%);
}
</style>
