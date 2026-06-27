<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { marked } from 'marked'
import type { Report, ReportTemplate, WorkRecord } from '@/types'
import { formatDate, formatDateTime, relativeTime, today, todayISO, endOfTodayISO } from '@/lib/utils'
import { Loader2, Plus, Trash2, Download, FileText, Sparkles, ChevronLeft, Pencil, Check, Eye, Edit3, Save } from 'lucide-vue-next'

marked.setOptions({ breaks: true, gfm: true })

const reports = ref<Report[]>([])
const templates = ref<ReportTemplate[]>([])
const loading = ref(true)
const showGenerate = ref(false)
const generating = ref(false)
const streamingContent = ref('')
const generatingId = ref<string | null>(null)
const selectedReport = ref<Report | null>(null)
const editingTitle = ref(false)
const titleDraft = ref('')
const editMode = ref(false)
const contentDraft = ref('')
const savingContent = ref(false)

const form = ref({
  type: 'daily' as 'daily' | 'weekly' | 'monthly',
  startDate: today(),
  endDate: today(),
  templateId: '',
  customInstruction: '',
  useMemory: true
})

let unsubStream: (() => void) | null = null
let unsubStatus: (() => void) | null = null

const typeLabels = { daily: '日报', weekly: '周报', monthly: '月报' }

const renderedContent = computed(() => {
  const content = selectedReport.value?.content || streamingContent.value
  if (!content) return ''
  return marked.parse(content) as string
})

async function load() {
  loading.value = true
  const [r, t] = await Promise.all([
    window.api.reports.list({ limit: 100 }),
    window.api.reportTemplates.list()
  ])
  reports.value = r
  templates.value = t
  loading.value = false
}

async function loadRecords(): Promise<WorkRecord[]> {
  const start = new Date(form.value.startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(form.value.endDate)
  end.setHours(23, 59, 59, 999)
  return window.api.workRecords.list({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    limit: 500
  })
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
  streamingContent.value = ''
  generatingId.value = null
  showGenerate.value = true
}

async function generate() {
  const records = await loadRecords()
  if (records.length === 0) {
    alert('所选日期范围内没有工作记录，无法生成报告')
    return
  }
  const settings = await window.api.settings.get()
  const tpl = form.value.templateId ? templates.value.find(t => t.id === form.value.templateId) : null

  showGenerate.value = false
  generating.value = true
  streamingContent.value = ''
  selectedReport.value = null

  const input = {
    type: form.value.type,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    templateBody: tpl?.content,
    customInstruction: form.value.customInstruction || undefined,
    memoryContent: form.value.useMemory ? settings.memoryContent : undefined,
    records: records.map(r => ({
      startedAt: r.startedAt,
      summary: r.summary,
      category: r.category ?? undefined
    }))
  }

  const res = await window.api.ai.generateReport(input)
  generatingId.value = res.id

  // 订阅流式
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
      } else if (data.status === 'failed') {
        alert('生成失败：' + (data.error ?? '未知错误'))
      }
      unsubStream?.()
      unsubStatus?.()
    }
  })
}

function viewReport(r: Report) {
  selectedReport.value = r
  streamingContent.value = ''
}

function backToList() {
  selectedReport.value = null
}

async function deleteReport(id: string) {
  if (!confirm('确认删除这份报告？')) return
  await window.api.reports.delete(id)
  if (selectedReport.value?.id === id) selectedReport.value = null
  await load()
}

async function exportReport(r: Report) {
  const res = await window.api.reports.exportToFile(r.id, 'md')
  if (!res.ok && res.message) alert(res.message)
}

function startEditTitle() {
  if (!selectedReport.value) return
  titleDraft.value = selectedReport.value.title
  editingTitle.value = true
}

async function saveTitle() {
  if (!selectedReport.value) return
  await window.api.reports.updateTitle(selectedReport.value.id, titleDraft.value)
  selectedReport.value.title = titleDraft.value
  const r = reports.value.find(x => x.id === selectedReport.value!.id)
  if (r) r.title = titleDraft.value
  editingTitle.value = false
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
  if (!selectedReport.value) return
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
  <div class="p-6 max-w-7xl mx-auto">
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
      <div v-if="editMode" class="grid grid-cols-2 gap-4 h-[calc(100vh-220px)]">
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

    <!-- 列表视图 -->
    <template v-else>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">报告</h1>
        <button class="btn-primary" @click="openGenerate" :disabled="generating">
          <Sparkles v-if="!generating" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          {{ generating ? '生成中...' : '生成报告' }}
        </button>
      </div>

      <!-- 流式生成中 -->
      <div v-if="generating" class="card p-6 mb-6">
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Loader2 class="w-4 h-4 animate-spin" />
          正在生成 {{ typeLabels[form.type] }}...
        </div>
        <div class="markdown-body text-sm" v-html="marked.parse(streamingContent || '等待响应...')"></div>
      </div>

      <!-- 列表 -->
      <div v-if="loading" class="flex items-center gap-2 text-muted-foreground">
        <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
      </div>

      <div v-else-if="reports.length === 0" class="card p-12 text-center text-muted-foreground">
        <FileText class="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>还没有生成过报告</p>
        <p class="text-xs mt-1">点击右上角"生成报告"开始</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="r in reports"
          :key="r.id"
          class="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
          @click="viewReport(r)"
        >
          <div class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ r.title }}</div>
            <div class="text-xs text-muted-foreground mt-0.5">
              {{ typeLabels[r.type] }} · {{ r.startDate }} 至 {{ r.endDate }} · {{ relativeTime(r.createdAt) }}
            </div>
          </div>
          <span v-if="r.status === 'generating'" class="text-xs text-amber-600">生成中</span>
          <span v-else-if="r.status === 'failed'" class="text-xs text-destructive">失败</span>
          <button class="btn-ghost btn-icon btn-sm" @click.stop="exportReport(r)"><Download class="w-3.5 h-3.5" /></button>
          <button class="btn-ghost btn-icon btn-sm hover:text-destructive" @click.stop="deleteReport(r.id)"><Trash2 class="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <!-- 生成表单弹窗 -->
      <div v-if="showGenerate" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showGenerate = false">
        <div class="card p-6 w-full max-w-lg mx-4">
          <h3 class="text-lg font-semibold mb-4">生成报告</h3>
          <div class="space-y-4">
            <div>
              <label class="label mb-1 block">报告类型</label>
              <div class="flex gap-2">
                <button
                  v-for="t in (['daily','weekly','monthly'] as const)"
                  :key="t"
                  :class="['btn flex-1', form.type === t ? 'btn-primary' : 'btn-outline']"
                  @click="form.type = t"
                >{{ typeLabels[t] }}</button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label mb-1 block">开始日期</label>
                <input type="date" v-model="form.startDate" class="input" />
              </div>
              <div>
                <label class="label mb-1 block">结束日期</label>
                <input type="date" v-model="form.endDate" class="input" />
              </div>
            </div>
            <div>
              <label class="label mb-1 block">报告模板（可选）</label>
              <select v-model="form.templateId" class="input">
                <option value="">不使用模板</option>
                <option v-for="t in templates.filter(t => t.type === form.type)" :key="t.id" :value="t.id">
                  {{ t.name }}{{ t.isBuiltin ? '（内置）' : '' }}
                </option>
              </select>
            </div>
            <div>
              <label class="label mb-1 block">自定义指令（可选）</label>
              <textarea v-model="form.customInstruction" class="textarea" rows="2" placeholder="例如：突出数据成果，简洁风格"></textarea>
            </div>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" v-model="form.useMemory" />
              使用个人工作记忆
            </label>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button class="btn-outline" @click="showGenerate = false">取消</button>
            <button class="btn-primary" @click="generate">
              <Sparkles class="w-4 h-4" /> 开始生成
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
