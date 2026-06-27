<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bot, Sparkles, Send, Loader2, Copy, Check, Power, RefreshCw,
  Calendar, ClipboardList, MessageSquare, Zap, Plus, History, X,
  ChevronDown, Download, ExternalLink, Settings as SettingsIcon,
  MessageCircle, FileJson
} from 'lucide-vue-next'
import { marked } from 'marked'
import { isApiReady, safeCall, today, formatDate, formatDateTime } from '@/lib/utils'
import { toast } from '@/lib/toast'

const router = useRouter()

marked.setOptions({ breaks: true, gfm: true })

// ============ 对话状态 ============
interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMsg[]
  createdAt: string
  updatedAt: string
}

const sessions = ref<ChatSession[]>([])
const currentSession = ref<ChatSession | null>(null)
const input = ref('')
const sending = ref(false)
const chatBox = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
let chatChunkUnsub: (() => void) | null = null
let chatStatusUnsub: (() => void) | null = null

// 输入框自适应：单行 ~24px，撑高上限 ~120px（约原 5 倍，DeepSeek 风格）
const MIN_H = 28
const MAX_H = 120
const MAX_LEN = 20000  // 单次输入上限
function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  const next = Math.min(Math.max(el.scrollHeight, MIN_H), MAX_H)
  el.style.height = next + 'px'
}
function onInputChange() {
  // 截断超过上限的内容
  if (input.value.length > MAX_LEN) {
    input.value = input.value.slice(0, MAX_LEN)
  }
  autoResize()
}

// 是否存在可清空的内容（input 有字 / 对话有消息）
const hasContent = computed(() => {
  return (input.value?.length ?? 0) > 0 || (currentSession.value?.messages?.length ?? 0) > 0
})

// UI 状态
const showHistory = ref(false)            // 默认隐藏对话历史
const showContextMenu = ref(false)        // 上下文下拉
const showExportMenu = ref(false)         // 导 出 下 拉
const showApiMenu = ref(false)            // API 下拉
const apiKeyMissing = ref(false)

const quickPrompts = [
  '总结我本周的工作重心',
  '哪些应用占用了我最多时间？',
  '对比今天和昨天的效率',
  '帮我梳理下周工作计划'
]

function genSessionId(): string {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function newSession() {
  const s: ChatSession = {
    id: genSessionId(),
    title: '新对话',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  sessions.value.unshift(s)
  currentSession.value = s
  showHistory.value = false
  toast.success('已新建对话')
}

function selectSession(s: ChatSession) {
  currentSession.value = s
  showHistory.value = false
}

function deleteSession(id: string) {
  const idx = sessions.value.findIndex(s => s.id === id)
  if (idx < 0) return
  sessions.value.splice(idx, 1)
  if (currentSession.value?.id === id) {
    currentSession.value = sessions.value[0] ?? newBlankSession()
  }
  toast.info('已删除对话')
}

function newBlankSession(): ChatSession {
  const s: ChatSession = {
    id: genSessionId(),
    title: '新对话',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  sessions.value.unshift(s)
  return s
}

async function buildContextSystemMessage(): Promise<string> {
  const now = new Date()
  const start = new Date()
  start.setDate(now.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  const startISO = start.toISOString()
  const endISO = now.toISOString()

  const [records, appUsage] = await Promise.all([
    safeCall(
      () => window.api.workRecords.list({ startDate: startISO, endDate: endISO, limit: 200 }),
      [] as any[]
    ),
    safeCall(
      () => window.api.appUsage.list({ startDate: startISO, endDate: endISO }),
      [] as any[]
    )
  ])

  const lines: string[] = [
    '你是牙牙乐日报助手的内置 AI 工作助手。基于用户的真实工作数据回答问题。',
    '以下是用户最近 7 天的工作数据，作为回答的上下文依据：',
    ''
  ]
  if (records.length > 0) {
    lines.push(`【最近 7 天工作记录（共 ${records.length} 条，最多展示 200 条）】`)
    for (const r of records.slice(0, 200)) {
      const time = r.startedAt.slice(5, 16).replace('T', ' ')
      lines.push(`- ${time} [${r.category ?? '其他'}] ${r.summary}`)
    }
  } else {
    lines.push('【最近 7 天工作记录】暂无记录')
  }
  lines.push('')
  if (appUsage.length > 0) {
    const top = appUsage.slice(0, 20)
    lines.push(`【应用使用时长 Top 20】`)
    for (const a of top) {
      const min = Math.round((a.durationSec ?? a.durationMinutes * 60) / 60)
      lines.push(`- ${a.appName}: ${min} 分钟（占比 ${a.share}%）`)
    }
  } else {
    lines.push('【应用使用时长】暂无数据')
  }
  lines.push('')
  lines.push('回答时请结合上述数据，简洁、具体、可执行。如果用户的问题与工作数据无关，可以正常对话但避免编造数据。')
  return lines.join('\n')
}

function autoTitleOf(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').trim().slice(0, 22) || '新对话'
}

async function send(text?: string) {
  if (!currentSession.value) currentSession.value = newBlankSession()
  const sess = currentSession.value
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return
  if (apiKeyMissing.value) {
    toast.warning('请先在设置中配置 API Key')
    router.push('/settings')
    return
  }
  if (!isApiReady()) {
    // dev 模式：模拟回复
    sess.messages.push({ role: 'user', content })
    input.value = ''
    nextTick(autoResize)
    sess.messages.push({
      role: 'assistant',
      content: '当前为开发预览模式。运行 Electron 后可与真实 AI 对话。\n\n你的提问：' + content
    })
    sess.title = autoTitleOf(content)
    sess.updatedAt = new Date().toISOString()
    return
  }

  sess.messages.push({ role: 'user', content })
  if (sess.title === '新对话' || sess.title === '') {
    sess.title = autoTitleOf(content)
  }
  input.value = ''
  nextTick(autoResize)
  sending.value = true
  const placeholder: ChatMsg = { role: 'assistant', content: '', streaming: true }
  sess.messages.push(placeholder)
  sess.updatedAt = new Date().toISOString()
  await scrollToBottom()

  chatChunkUnsub?.()
  chatStatusUnsub?.()
  chatChunkUnsub = window.api.ai.onChatStreamChunk((data) => {
    if (data.sessionId !== sess.id) return
    placeholder.content += data.chunk
    scrollToBottom()
  })
  chatStatusUnsub = window.api.ai.onChatStatusChanged((data) => {
    if (data.sessionId !== sess.id) return
    if (data.status === 'completed') {
      placeholder.streaming = false
      if (data.content) placeholder.content = data.content
      sending.value = false
      toast.success('回复完成')
    } else if (data.status === 'failed') {
      placeholder.streaming = false
      placeholder.content = '生成失败：' + (data.error ?? '未知错误')
      sending.value = false
      toast.error('对话生成失败')
    }
  })

  try {
    const systemCtx = await buildContextSystemMessage()
    const history = sess.messages
      .filter(m => m !== placeholder && !m.streaming)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))
    const payload = [
      { role: 'system' as const, content: systemCtx },
      ...history
    ]
    await window.api.ai.chat({ messages: payload, sessionId: sess.id })
  } catch (e: any) {
    placeholder.streaming = false
    placeholder.content = '发送失败：' + (e?.message ?? '未知错误')
    sending.value = false
    toast.error('发送失败：' + (e?.message ?? '未知错误'))
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
}

async function clearChat() {
  if (!hasContent.value) return
  if (!confirm('清空当前对话内容？')) return
  if (currentSession.value) {
    // 用 splice 强制触发响应式
    currentSession.value.messages.splice(0, currentSession.value.messages.length)
    currentSession.value.title = '新对话'
    currentSession.value.updatedAt = new Date().toISOString()
  }
  // 清空输入框
  input.value = ''
  nextTick(autoResize)
  toast.info('已清空对话')
}

// ============ 上下文 / 导出 / API 功能下拉 ============
const exportRange = ref<'today' | 'week' | 'month' | 'custom'>('week')
const customStart = ref(today())
const customEnd = ref(today())
const contextPreview = ref('')
const contextCopied = ref(false)
const buildingContext = ref(false)

const apiStatus = ref<{ running: boolean; port: number; token: string } | null>(null)
const apiToggling = ref(false)
const apiConfigCopied = ref(false)

function computeRange(r: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (r === 'week') {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
  } else if (r === 'month') {
    start.setDate(1)
  }
  return { start, end }
}

async function buildExportContext(): Promise<string> {
  let startISO: string, endISO: string
  if (exportRange.value === 'custom') {
    if (!customStart.value || !customEnd.value) return ''
    startISO = new Date(customStart.value).toISOString()
    endISO = new Date(customEnd.value).toISOString()
  } else {
    const { start, end } = computeRange(exportRange.value)
    startISO = start.toISOString()
    endISO = end.toISOString()
  }
  const [records, appUsage] = await Promise.all([
    safeCall(
      () => window.api.workRecords.list({ startDate: startISO, endDate: endISO, limit: 500 }),
      [] as any[]
    ),
    safeCall(
      () => window.api.appUsage.list({ startDate: startISO, endDate: endISO }),
      [] as any[]
    )
  ])
  const payload = {
    meta: {
      app: '牙牙乐日报助手',
      exportedAt: new Date().toISOString(),
      range: { start: startISO, end: endISO, type: exportRange.value },
      recordCount: records.length,
      appCount: appUsage.length
    },
    workRecords: records.map(r => ({
      startedAt: r.startedAt,
      summary: r.summary,
      category: r.category
    })),
    appUsage: appUsage.map(a => ({
      appName: a.appName,
      durationMinutes: Math.round((a.durationSec ?? a.durationMinutes * 60) / 60),
      share: a.share
    }))
  }
  return JSON.stringify(payload, null, 2)
}

async function previewContext() {
  buildingContext.value = true
  try {
    contextPreview.value = await buildExportContext()
  } catch (e: any) {
    contextPreview.value = '生成失败：' + (e?.message ?? '未知错误')
    toast.error('预览失败：' + (e?.message ?? '未知错误'))
  } finally {
    buildingContext.value = false
  }
}

async function copyContext() {
  if (!isApiReady()) {
    toast.warning('Electron 未启动，无法访问数据')
    return
  }
  let text = contextPreview.value
  if (!text) {
    buildingContext.value = true
    try {
      text = await buildExportContext()
      contextPreview.value = text
    } finally {
      buildingContext.value = false
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    contextCopied.value = true
    toast.success('上下文已复制到剪贴板')
    setTimeout(() => (contextCopied.value = false), 1500)
  } catch {
    toast.error('复制失败')
  }
}

function downloadContextFile() {
  if (!contextPreview.value) {
    previewContext()
    toast.info('正在生成上下文…')
    return
  }
  const blob = new Blob([contextPreview.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `context-${exportRange.value}-${today()}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('文件已下载')
}

// ============ 本地 HTTP API ============
async function refreshApiStatus() {
  apiStatus.value = await safeCall(
    () => window.api.localApi.getStatus(),
    { running: false, port: 8088, token: '' }
  )
}

async function toggleApi(v: boolean) {
  if (!isApiReady()) {
    toast.warning('Electron 未启动')
    return
  }
  apiToggling.value = true
  try {
    if (v) {
      const r = await window.api.localApi.start({})
      if (!r.ok) {
        toast.error('启动失败：' + (r.error ?? '未知错误'))
      } else {
        toast.success('本地 API 已启动')
      }
    } else {
      await window.api.localApi.stop()
      toast.info('本地 API 已停止')
    }
    await refreshApiStatus()
  } finally {
    apiToggling.value = false
  }
}

async function regenerateToken() {
  if (!isApiReady()) {
    toast.warning('Electron 未启动')
    return
  }
  if (!confirm('重置 Token 后，原 Token 将立即失效。确认重置？')) return
  await window.api.localApi.regenerateToken()
  await refreshApiStatus()
  toast.success('Token 已重置')
}

const apiConfigText = computed(() => {
  const port = apiStatus.value?.port ?? 8088
  const token = apiStatus.value?.token ?? ''
  return `Base URL: http://localhost:${port}
认证: Bearer Token
Token: ${token}

# 端点
GET  /                     API 文档
GET  /api/work-records     工作记录
GET  /api/reports          报告列表
GET  /api/app-usage        应用使用时长
GET  /api/heatmap          热力图
GET  /api/timeline         时间线
GET  /api/plans            今日计划
POST /api/work-records     创建工作记录
POST /api/reports/generate 生成报告

# 示例
curl -H "Authorization: Bearer ${token}" http://localhost:${port}/api/work-records`
})

async function copyApiConfig() {
  try {
    await navigator.clipboard.writeText(apiConfigText.value)
    apiConfigCopied.value = true
    toast.success('接入配置已复制')
    setTimeout(() => (apiConfigCopied.value = false), 1500)
  } catch {
    toast.error('复制失败')
  }
}

// 关闭所有下拉
function closeAllMenus() {
  showContextMenu.value = false
  showExportMenu.value = false
  showApiMenu.value = false
}

onMounted(async () => {
  // 初始化空白会话
  currentSession.value = newBlankSession()
  showHistory.value = false

  try {
    if (isApiReady()) {
      const s = await window.api.settings.get()
      apiKeyMissing.value = !s.apiKey
    }
  } catch {}
  refreshApiStatus()

  // 全局点击关闭下拉
  document.addEventListener('click', closeAllMenus)
})

onUnmounted(() => {
  chatChunkUnsub?.()
  chatStatusUnsub?.()
  document.removeEventListener('click', closeAllMenus)
})

// 历史分组（按日期）
const groupedSessions = computed(() => {
  const groups: Record<string, ChatSession[]> = {}
  for (const s of sessions.value) {
    const d = s.updatedAt.slice(0, 10)
    if (!groups[d]) groups[d] = []
    groups[d].push(s)
  }
  return groups
})

function groupLabel(d: string): string {
  if (d === today()) return '今天'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d === formatDate(yesterday)) return '昨天'
  return d
}
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- 对话历史侧栏（默认隐藏） -->
    <transition name="ya-fade">
      <aside
        v-if="showHistory"
        class="w-64 shrink-0 h-full bg-muted/30 border-r flex flex-col"
      >
        <div class="px-4 py-3 flex items-center justify-between border-b">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <History class="w-4 h-4 text-muted-foreground" />
            对话历史
            <span class="text-xs text-muted-foreground ml-1">({{ sessions.length }})</span>
          </div>
          <button class="btn-ghost btn-icon btn-sm" @click.stop="showHistory = false" title="收起">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="px-3 pt-3">
          <button class="w-full btn-primary btn-sm flex items-center justify-center gap-1.5" @click="newSession">
            <Plus class="w-3.5 h-3.5" /> 新建对话
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-2 py-3 space-y-3">
          <div v-for="(items, day) in groupedSessions" :key="day">
            <div class="px-2 py-1 text-[10.5px] uppercase tracking-wider font-mono text-muted-foreground">
              {{ groupLabel(day) }}
            </div>
            <div class="space-y-0.5">
              <div
                v-for="s in items"
                :key="s.id"
                class="ya-history-item group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs"
                :class="{ active: currentSession?.id === s.id }"
                @click="selectSession(s)"
              >
                <MessageCircle class="w-3 h-3 shrink-0 opacity-50" />
                <span class="flex-1 truncate">{{ s.title || '新对话' }}</span>
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  @click.stop="deleteSession(s.id)"
                  title="删除"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div v-if="sessions.length === 0" class="px-3 py-6 text-xs text-muted-foreground text-center">
            还没有对话
          </div>
        </div>
      </aside>
    </transition>

    <!-- 主对话区 -->
    <section class="flex-1 h-full flex flex-col overflow-hidden">
      <!-- 顶部条 -->
      <header class="px-6 py-3 flex items-center gap-3 border-b">
        <!-- 主题标识：与 Sidebar logo 完全一致（柑橘亮渐变 + "AI"字 + mint 小圆点） -->
        <div class="relative w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden"
             style="background: linear-gradient(135deg, hsl(27 92% 65%), hsl(27 92% 55%)); box-shadow: 0 4px 14px hsl(27 92% 63% / 0.32), inset 0 1px 0 rgba(255,255,255,0.4);">
          <span class="text-white font-bold text-sm font-display">AI</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-display text-[15px] font-semibold tracking-tight truncate">
            {{ currentSession?.title || 'AI 助手' }}
          </div>
          <div class="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <!-- 状态点改为主题色（柑橘亮） -->
            <span class="inline-block w-1.5 h-1.5 rounded-full" style="background: hsl(27 92% 50%); box-shadow: 0 0 0 3px hsl(27 92% 63% / 0.18);"></span>
            内置 AI · 基于你的最近 7 天工作数据
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button class="btn-ghost btn-icon btn-sm" @click.stop="showHistory = !showHistory" :title="showHistory ? '隐藏历史' : '显示历史'">
            <History class="w-4 h-4" />
          </button>

          <!-- 上下文下拉（DeepSeek 风格：上面输入框以外的功能选择） -->
          <div class="relative" @click.stop>
            <button class="btn-outline btn-sm flex items-center gap-1.5" @click="showContextMenu = !showContextMenu; showExportMenu = false; showApiMenu = false">
              <ClipboardList class="w-3.5 h-3.5" />
              上下文
              <ChevronDown class="w-3 h-3" />
            </button>
            <transition name="ya-menu">
              <div
                v-if="showContextMenu"
                class="absolute right-0 top-10 z-30 card p-3 w-80"
              >
                <div class="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">导出工作上下文</div>
                <div class="flex items-center gap-1 rounded-md border border-border p-0.5 mb-2">
                  <button v-for="r in (['today','week','month','custom'] as const)" :key="r"
                    @click="exportRange = r; contextPreview = ''"
                    :class="['flex-1 px-2 py-1 text-xs rounded transition-colors', exportRange===r ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground']">
                    {{ { today: '今日', week: '本周', month: '本月', custom: '自定义' }[r] }}
                  </button>
                </div>
                <div v-if="exportRange === 'custom'" class="flex items-center gap-1 mb-2">
                  <input type="date" v-model="customStart" class="input h-7 text-xs flex-1" />
                  <span class="text-xs text-muted-foreground">至</span>
                  <input type="date" v-model="customEnd" class="input h-7 text-xs flex-1" />
                </div>
                <div class="flex items-center gap-1.5">
                  <button class="btn-outline btn-sm flex-1 flex items-center justify-center gap-1" :disabled="buildingContext" @click="previewContext">
                    <Loader2 v-if="buildingContext" class="w-3 h-3 animate-spin" />
                    <Zap v-else class="w-3 h-3" /> 预览
                  </button>
                  <button class="btn-primary btn-sm flex-1 flex items-center justify-center gap-1" @click="copyContext">
                    <Check v-if="contextCopied" class="w-3 h-3" />
                    <Copy v-else class="w-3 h-3" /> 复制
                  </button>
                </div>
                <div v-if="contextPreview" class="mt-2 bg-muted/40 rounded-md p-2 max-h-32 overflow-auto">
                  <pre class="text-[10.5px] font-mono text-muted-foreground whitespace-pre-wrap">{{ contextPreview.slice(0, 800) }}{{ contextPreview.length > 800 ? '…' : '' }}</pre>
                </div>
                <p class="text-[10.5px] text-muted-foreground mt-2">导出 JSON 可粘贴到外部 AI 工具中分析</p>
              </div>
            </transition>
          </div>

          <!-- API 下拉 -->
          <div class="relative" @click.stop>
            <button class="btn-outline btn-sm flex items-center gap-1.5" @click="showApiMenu = !showApiMenu; showContextMenu = false; showExportMenu = false">
              <Power class="w-3.5 h-3.5" />
              本地 API
              <span v-if="apiStatus?.running" class="w-1.5 h-1.5 rounded-full" style="background: hsl(142 60% 45%)"></span>
              <ChevronDown v-else class="w-3 h-3" />
            </button>
            <transition name="ya-menu">
              <div v-if="showApiMenu" class="absolute right-0 top-10 z-30 card p-3 w-72">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-sm font-medium">本地 HTTP API</div>
                  <q-toggle
                    :model-value="apiStatus?.running ?? false"
                    :disable="apiToggling"
                    color="primary"
                    keep-color
                    @update:model-value="toggleApi"
                  />
                </div>
                <div class="text-[11px] text-muted-foreground mb-2">
                  <span v-if="apiStatus?.running">运行中 · 端口 {{ apiStatus.port }}</span>
                  <span v-else>已停止</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <button class="btn-outline btn-sm flex-1 flex items-center justify-center gap-1" @click="copyApiConfig">
                    <Check v-if="apiConfigCopied" class="w-3 h-3 text-green-500" />
                    <Copy v-else class="w-3 h-3" /> 复制配置
                  </button>
                  <button class="btn-ghost btn-icon btn-sm" @click="regenerateToken" title="重置 Token">
                    <RefreshCw class="w-3.5 h-3.5" />
                  </button>
                  <button class="btn-ghost btn-icon btn-sm" @click="router.push('/settings')" title="设置">
                    <SettingsIcon class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <!-- 对话流 · 暖色渐变背景 -->
      <div ref="chatBox" class="flex-1 overflow-y-auto ya-chat-stream">
        <div v-if="apiKeyMissing" class="px-6 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 flex items-center gap-2">
          <Sparkles class="w-4 h-4" />
          尚未配置 API Key，AI 对话无法使用。
          <button class="underline font-medium ml-1" @click="router.push('/settings')">前往设置</button>
        </div>

        <div v-if="!currentSession || currentSession.messages.length === 0" class="h-full flex flex-col items-center justify-center px-6 text-center">
          <div class="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
               style="background: linear-gradient(135deg, hsl(27 92% 95%), hsl(165 21% 92%));">
            <Sparkles class="w-7 h-7" style="color: hsl(27 92% 50%)" />
          </div>
          <h2 class="font-display text-xl font-semibold tracking-tight mb-1">牙牙乐 AI 工作助手</h2>
          <p class="text-sm text-muted-foreground max-w-md mb-5">基于你的真实工作数据回答问题。我会读取最近 7 天的工作记录和应用使用情况作为上下文。</p>
          <div class="flex flex-wrap gap-2 justify-center max-w-xl">
            <button
              v-for="q in quickPrompts"
              :key="q"
              class="px-3 py-1.5 text-xs rounded-full border bg-white hover:border-primary/50 hover:text-primary transition-colors"
              style="border-color: hsl(var(--border))"
              @click="send(q)"
            >{{ q }}</button>
          </div>
        </div>

        <div v-else class="max-w-3xl mx-auto px-6 py-6 space-y-5">
          <div
            v-for="(m, i) in currentSession.messages"
            :key="i"
            class="flex gap-3"
            :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <!-- AI 头像 -->
            <div v-if="m.role === 'assistant'" class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                 style="background: linear-gradient(135deg, hsl(27 92% 95%), hsl(165 21% 92%));">
              <Bot class="w-4 h-4" style="color: hsl(27 92% 50%)" />
            </div>
            <div
              class="px-4 py-2.5 text-sm leading-relaxed max-w-[78%]"
              :class="m.role === 'user' ? 'ya-chat-msg-user' : 'ya-chat-msg-assistant'"
            >
              <div v-if="m.role === 'assistant'" class="markdown-body-sm" v-html="marked.parse(m.content || (m.streaming ? '...' : ''))"></div>
              <template v-else>
                <div class="whitespace-pre-wrap">{{ m.content }}</div>
              </template>
              <span v-if="m.streaming" class="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle"></span>
            </div>
            <!-- 用户头像 -->
            <div v-if="m.role === 'user'" class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                 style="background: hsl(var(--primary) / 0.15); color: hsl(27 92% 35%)">
              <span class="text-xs font-semibold">我</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入区 · DeepSeek 风格圆角输入框 · 内容增长自动撑高 -->
      <div class="border-t bg-background px-6 py-4">
        <div class="max-w-3xl mx-auto">
          <div class="flex items-end gap-2 rounded-2xl border bg-muted/20 px-4 py-2 transition-all"
               :class="input ? 'border-primary/40 shadow-[0_0_0_3px_hsl(27_92%_63%_/_0.10)]' : 'border-border'">
            <textarea
              ref="inputRef"
              v-model="input"
              rows="1"
              class="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-relaxed block"
              style="user-select: text; min-height: 28px; max-height: 120px; height: 28px; overflow-y: auto; box-sizing: border-box;"
              placeholder="向 AI 提问关于你工作数据的问题…（Shift+Enter 换行，Enter 发送）"
              @input="onInputChange"
              @keydown.enter.exact.prevent="send()"
            ></textarea>
            <div class="flex items-center gap-1 pb-1">
              <transition name="ya-fade">
                <button
                  v-if="hasContent"
                  class="btn-ghost btn-icon btn-sm"
                  :disabled="sending"
                  @click="clearChat"
                  title="清空对话"
                >
                  <X class="w-4 h-4" />
                </button>
              </transition>
              <button
                class="btn-primary btn-icon btn-sm"
                :disabled="sending || !input.trim() || input.length > MAX_LEN"
                @click="send()"
                :title="sending ? '生成中…' : '发送'"
              >
                <Loader2 v-if="sending" class="w-4 h-4 animate-spin" />
                <Send v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
          <!-- 文字统计 + 提示 -->
          <div class="mt-1.5 px-1 text-[10.5px] text-muted-foreground flex items-center gap-3">
            <span>AI 生成内容仅供参考</span>
            <span class="ml-auto font-mono tabular-nums" :class="input.length > MAX_LEN * 0.9 ? (input.length >= MAX_LEN ? 'text-red-500 font-semibold' : 'text-amber-500') : ''">
              {{ input.length }} / {{ MAX_LEN }}
            </span>
            <span class="font-mono">·</span>
            <span class="font-mono">{{ currentSession?.messages.length || 0 }} 条消息</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ya-fade-enter-active, .ya-fade-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.ya-fade-enter-from, .ya-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
.ya-menu-enter-active, .ya-menu-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.ya-menu-enter-from, .ya-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.markdown-body-sm :deep(p) { margin: 0.4em 0; }
.markdown-body-sm :deep(p:first-child) { margin-top: 0; }
.markdown-body-sm :deep(p:last-child) { margin-bottom: 0; }
.markdown-body-sm :deep(code) {
  background: hsl(var(--muted));
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}
.markdown-body-sm :deep(pre) {
  background: hsl(0 0% 8%);
  color: hsl(0 0% 95%);
  padding: 10px 14px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  overflow-x: auto;
  margin: 6px 0;
}
.markdown-body-sm :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
}
.markdown-body-sm :deep(ul), .markdown-body-sm :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.4em;
}
.markdown-body-sm :deep(li) { margin: 0.2em 0; }
.markdown-body-sm :deep(h1), .markdown-body-sm :deep(h2), .markdown-body-sm :deep(h3) {
  font-weight: 600;
  margin: 0.6em 0 0.2em;
  line-height: 1.3;
}
.markdown-body-sm :deep(h1) { font-size: 1.1em; }
.markdown-body-sm :deep(h2) { font-size: 1.05em; }
.markdown-body-sm :deep(h3) { font-size: 1em; }
</style>
