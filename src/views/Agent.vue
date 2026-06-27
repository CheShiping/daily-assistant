<script setup lang="ts">
<<<<<<< HEAD
import { ref, computed, onMounted, onUnmounted, nextTick, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bot, Sparkles, Send, Loader2, Copy, Check, Power, RefreshCw,
  Calendar, ClipboardList, MessageSquare, Zap
} from 'lucide-vue-next'

const router = useRouter()

// 内联 Switch 组件
const SwitchInline = defineComponent({
  name: 'SwitchInline',
  props: { modelValue: { type: Boolean, default: false }, disabled: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('button', {
      type: 'button',
      disabled: props.disabled,
      onClick: () => !props.disabled && emit('update:modelValue', !props.modelValue),
      class: [
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors',
        props.modelValue ? 'bg-primary' : 'bg-muted-foreground/30',
        props.disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]
    }, [
      h('span', {
        class: [
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          props.modelValue ? 'translate-x-4' : 'translate-x-0.5'
        ]
      })
    ])
  }
})

// ============ AI 对话 ============
interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const messages = ref<ChatMsg[]>([])
const input = ref('')
const sending = ref(false)
const chatBox = ref<HTMLDivElement | null>(null)
const sessionId = ref('')
let chatChunkUnsub: (() => void) | null = null
let chatStatusUnsub: (() => void) | null = null

const quickPrompts = [
  '总结我本周的工作重心',
  '哪些应用占用了我最多时间？',
  '对比今天和昨天的效率',
  '帮我梳理下周工作计划'
]

const apiKeyMissing = ref(false)

async function buildContextSystemMessage(): Promise<string> {
  const now = new Date()
  const start = new Date()
  start.setDate(now.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  const startISO = start.toISOString()
  const endISO = now.toISOString()

  const [records, appUsage] = await Promise.all([
    window.api.workRecords.list({ startDate: startISO, endDate: endISO, limit: 200 }).catch(() => []),
    window.api.appUsage.list({ startDate: startISO, endDate: endISO }).catch(() => [])
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

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return
  if (apiKeyMissing.value) {
    router.push('/settings')
    return
  }

  messages.value.push({ role: 'user', content })
  input.value = ''
  sending.value = true
  const placeholder: ChatMsg = { role: 'assistant', content: '', streaming: true }
  messages.value.push(placeholder)
  await scrollToBottom()

  // 订阅流
  chatChunkUnsub?.()
  chatStatusUnsub?.()
  chatChunkUnsub = window.api.ai.onChatStreamChunk((data) => {
    if (data.sessionId !== sessionId.value) return
    placeholder.content += data.chunk
    scrollToBottom()
  })
  chatStatusUnsub = window.api.ai.onChatStatusChanged((data) => {
    if (data.sessionId !== sessionId.value) return
    if (data.status === 'completed') {
      placeholder.streaming = false
      if (data.content) placeholder.content = data.content
      sending.value = false
    } else if (data.status === 'failed') {
      placeholder.streaming = false
      placeholder.content = '生成失败：' + (data.error ?? '未知错误')
      sending.value = false
    }
  })

  try {
    const systemCtx = await buildContextSystemMessage()
    const history = messages.value
      .filter(m => m !== placeholder && !m.streaming)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))
    const payload = [
      { role: 'system' as const, content: systemCtx },
      ...history
    ]
    await window.api.ai.chat({ messages: payload, sessionId: sessionId.value })
  } catch (e: any) {
    placeholder.streaming = false
    placeholder.content = '发送失败：' + (e?.message ?? '未知错误')
    sending.value = false
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
}

function clearChat() {
  messages.value = []
  sessionId.value = genSessionId()
}

function genSessionId(): string {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

// ============ 一键复制上下文 ============
const exportRange = ref<'today' | 'week' | 'month' | 'custom'>('week')
const customStart = ref('')
const customEnd = ref('')
const contextPreview = ref('')
const contextCopied = ref(false)
const buildingContext = ref(false)

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
    window.api.workRecords.list({ startDate: startISO, endDate: endISO, limit: 500 }),
    window.api.appUsage.list({ startDate: startISO, endDate: endISO })
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
  } finally {
    buildingContext.value = false
  }
}

async function copyContext() {
  let text = contextPreview.value
  if (!text) {
    buildingContext.value = true
    text = await buildExportContext()
    contextPreview.value = text
    buildingContext.value = false
  }
  try {
    await navigator.clipboard.writeText(text)
    contextCopied.value = true
    setTimeout(() => (contextCopied.value = false), 1500)
  } catch {
    alert('复制失败，请手动选择预览内容复制')
  }
}

const recommendedQuestions = computed(() => [
  '把上述工作数据整理成日报',
  '分析我这段时间的时间分配是否合理',
  '找出我效率最高的时段',
  '基于这些数据，下周我应该重点关注什么'
])

// ============ 本地 HTTP API ============
const apiStatus = ref<{ running: boolean; port: number; token: string } | null>(null)
const apiToggling = ref(false)
const apiConfigCopied = ref(false)

async function refreshApiStatus() {
  try {
    apiStatus.value = await window.api.localApi.getStatus()
  } catch {}
}

async function toggleApi(v: boolean) {
  apiToggling.value = true
  try {
    if (v) {
      const r = await window.api.localApi.start({})
      if (!r.ok) alert('启动失败：' + (r.error ?? '未知错误'))
    } else {
      await window.api.localApi.stop()
    }
    await refreshApiStatus()
  } finally {
    apiToggling.value = false
  }
}

async function regenerateToken() {
  if (!confirm('重置 Token 后，原 Token 将立即失效。确认重置？')) return
  await window.api.localApi.regenerateToken()
  await refreshApiStatus()
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
    setTimeout(() => (apiConfigCopied.value = false), 1500)
  } catch {
    alert('复制失败')
  }
}

onMounted(async () => {
  sessionId.value = genSessionId()
  try {
    const s = await window.api.settings.get()
    apiKeyMissing.value = !s.apiKey
  } catch {}
  refreshApiStatus()
})

onUnmounted(() => {
  chatChunkUnsub?.()
  chatStatusUnsub?.()
})
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto pb-12 space-y-6">
    <!-- 标题 -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Bot class="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Agent</h1>
        <p class="text-sm text-muted-foreground">内置 AI 对话 · 一键复制上下文 · 本地 HTTP API</p>
      </div>
    </div>

    <!-- API Key 缺失提示 -->
    <div v-if="apiKeyMissing" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
      尚未配置 API Key，AI 对话无法使用。请前往
      <button class="underline font-medium" @click="router.push('/settings')">设置</button>
      配置。
    </div>

    <!-- 第一层：内置 AI 对话 -->
    <section class="card overflow-hidden">
      <div class="px-5 py-3 border-b flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare class="w-4 h-4 text-muted-foreground" /> 内置 AI 对话
        </div>
        <button class="text-xs text-muted-foreground hover:text-foreground" @click="clearChat">清空对话</button>
      </div>
      <div class="px-5 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
        对话时自动注入最近 7 天工作记录和应用使用数据作为上下文
      </div>

      <!-- 对话区 -->
      <div ref="chatBox" class="px-5 py-4 h-80 overflow-y-auto space-y-3">
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
          <Sparkles class="w-8 h-8 mb-2 opacity-40" />
          <p class="text-sm">向 AI 提问关于你工作数据的问题</p>
          <div class="flex flex-wrap gap-2 justify-center mt-3 max-w-md">
            <button
              v-for="q in quickPrompts"
              :key="q"
              class="px-3 py-1.5 text-xs rounded-full border border-border hover:border-primary/50 hover:text-primary transition-colors"
              @click="send(q)"
            >{{ q }}</button>
          </div>
        </div>
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="flex"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap"
            :class="m.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'"
          >
            {{ m.content || (m.streaming ? '...' : '') }}
            <span v-if="m.streaming" class="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle"></span>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="px-5 py-3 border-t flex items-center gap-2">
        <input
          v-model="input"
          class="input flex-1 h-10"
          placeholder="输入问题，回车发送…"
          @keyup.enter="send()"
          :disabled="sending"
        />
        <button class="btn-primary btn-icon h-10 w-10 flex items-center justify-center" :disabled="sending || !input.trim()" @click="send()">
          <Loader2 v-if="sending" class="w-4 h-4 animate-spin" />
          <Send v-else class="w-4 h-4" />
        </button>
      </div>
    </section>

    <!-- 第二层：一键复制上下文 -->
    <section class="card overflow-hidden">
      <div class="px-5 py-3 border-b flex items-center gap-2 text-sm font-semibold">
        <ClipboardList class="w-4 h-4 text-muted-foreground" /> 一键复制上下文
      </div>
      <div class="px-5 py-4 space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <Calendar class="w-4 h-4 text-muted-foreground" />
          <div class="flex items-center gap-1 rounded-md border border-border p-0.5">
            <button
              v-for="r in (['today','week','month','custom'] as const)"
              :key="r"
              @click="exportRange = r; contextPreview = ''"
              :class="['px-2.5 py-1 text-xs rounded transition-colors', exportRange===r ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground']"
            >{{ { today: '今日', week: '本周', month: '本月', custom: '自定义' }[r] }}</button>
          </div>
          <template v-if="exportRange === 'custom'">
            <input type="date" v-model="customStart" class="input h-8 text-xs w-36" @change="contextPreview = ''" />
            <span class="text-xs text-muted-foreground">至</span>
            <input type="date" v-model="customEnd" class="input h-8 text-xs w-36" @change="contextPreview = ''" />
          </template>
          <button class="btn-outline btn-sm ml-auto flex items-center gap-1" :disabled="buildingContext" @click="previewContext">
            <Loader2 v-if="buildingContext" class="w-3 h-3 animate-spin" />
            <Zap v-else class="w-3 h-3" /> 预览
          </button>
          <button class="btn-primary btn-sm flex items-center gap-1" @click="copyContext">
            <Check v-if="contextCopied" class="w-3 h-3" />
            <Copy v-else class="w-3 h-3" />
            {{ contextCopied ? '已复制' : '复制上下文' }}
          </button>
        </div>

        <div v-if="contextPreview" class="bg-muted/30 rounded-lg p-3 max-h-48 overflow-auto">
          <pre class="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground">{{ contextPreview.slice(0, 2000) }}{{ contextPreview.length > 2000 ? '\n…（已截断，复制可获取完整内容）' : '' }}</pre>
        </div>

        <div>
          <div class="text-xs text-muted-foreground mb-1.5">复制后推荐提问：</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="q in recommendedQuestions"
              :key="q"
              class="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground"
            >{{ q }}</span>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground">导出结构化 JSON，含元数据说明，可直接粘贴给任意外部 AI 工具</p>
      </div>
    </section>

    <!-- 第三层：本地 HTTP API -->
    <section class="card overflow-hidden">
      <div class="px-5 py-3 border-b flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <Power class="w-4 h-4 text-muted-foreground" /> 本地 HTTP API
        </div>
        <SwitchInline :model-value="apiStatus?.running ?? false" :disabled="apiToggling" @update:model-value="toggleApi" />
      </div>
      <div class="px-5 py-4 space-y-3">
        <div class="text-xs text-muted-foreground">
          暴露本地 HTTP API，供外部 Agent / 脚本 / 自动化工具调用。
          <span v-if="apiStatus?.running" class="text-green-600">当前运行中，端口 {{ apiStatus.port }}</span>
          <span v-else class="text-muted-foreground">当前已停止</span>
        </div>

        <div v-if="apiStatus?.running" class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-muted-foreground mb-1">端口</div>
            <div class="text-sm font-mono">{{ apiStatus.port }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground mb-1 flex items-center justify-between">
              <span>Token</span>
              <button class="hover:text-primary" @click="regenerateToken">
                <RefreshCw class="w-3 h-3" />
              </button>
            </div>
            <div class="text-sm font-mono truncate">{{ apiStatus.token || '—' }}</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-outline btn-sm flex items-center gap-1" @click="copyApiConfig">
            <Check v-if="apiConfigCopied" class="w-3 h-3 text-green-500" />
            <Copy v-else class="w-3 h-3" />
            {{ apiConfigCopied ? '已复制' : '复制接入配置' }}
          </button>
          <button class="btn-ghost btn-sm" @click="router.push('/settings')">详细配置</button>
        </div>
      </div>
    </section>
=======
import { Bot, Sparkles } from 'lucide-vue-next'
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto pb-12">
    <div class="card p-10 text-center">
      <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Bot class="w-8 h-8 text-primary" />
      </div>
      <h1 class="text-2xl font-bold mb-2">接入 Agent</h1>
      <p class="text-sm text-muted-foreground mb-6">
        通过 MCP 协议接入外部 Agent，让牙牙乐日报助手成为你工作流中的一环。
      </p>
      <div class="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
        <Sparkles class="w-3 h-3" /> 即将上线
      </div>
      <div class="mt-8 text-left bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
        <p class="font-medium text-foreground mb-2">规划中的能力：</p>
        <ul class="space-y-1 list-disc pl-5">
          <li>支持 MCP 协议，可接入任意兼容 Agent</li>
          <li>把日报生成能力暴露为工具，供其他 Agent 调用</li>
          <li>接入任务管理 Agent，自动从待办生成日报</li>
          <li>支持自定义 Hook，扩展分析能力</li>
        </ul>
      </div>
    </div>
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
  </div>
</template>
