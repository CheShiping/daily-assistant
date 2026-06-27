<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Sparkles, RefreshCw } from 'lucide-vue-next'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart,
  registerables,
  type ChartData,
  type ChartOptions,
  type Plugin
} from 'chart.js'
import { safeCall } from '@/lib/utils'
import { toast } from '@/lib/toast'

Chart.register(...registerables)

interface AppRow {
  appName: string
  durationSec: number
  share: number
  firstUsedAt: string | null
  lastUsedAt: string | null
}

const router = useRouter()

const range = ref<'today' | 'week' | 'month' | 'custom'>('today')
const customStart = ref('')
const customEnd = ref('')
const chartMode = ref<'bar' | 'pie'>('bar')
const loading = ref(false)
const items = ref<AppRow[]>([])

// AI 洞察
const insightText = ref('')
const insightLoading = ref(false)
const insightCache = new Map<string, string>()
let insightUnsub: (() => void) | null = null
let insightStatusUnsub: (() => void) | null = null

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}秒`
  if (sec < 3600) return `${(sec / 60).toFixed(1)}分钟`
  return `${(sec / 3600).toFixed(1)}小时`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  if (isToday) return `${h}:${min}`
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

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

async function load() {
  loading.value = true
  try {
    let startISO: string
    let endISO: string
    if (range.value === 'custom') {
      if (!customStart.value || !customEnd.value) {
        loading.value = false
        return
      }
      startISO = new Date(customStart.value).toISOString()
      endISO = new Date(customEnd.value).toISOString()
    } else {
      const { start, end } = computeRange(range.value)
      startISO = start.toISOString()
      endISO = end.toISOString()
    }
    const raw = await safeCall(
      () => window.api.appUsage.list({ startDate: startISO, endDate: endISO }),
      [] as any[]
    )
    items.value = raw
      .map(r => ({
        appName: r.appName,
        durationSec: r.durationSec ?? Math.round(r.durationMinutes * 60),
        share: r.share,
        firstUsedAt: r.firstAt,
        lastUsedAt: r.lastAt
      }))
      .sort((a, b) => b.durationSec - a.durationSec)
  } finally {
    loading.value = false
  }
  loadInsight()
}

// AI 洞察
function insightCacheKey(): string {
  return `${range.value}_${customStart.value}_${customEnd.value}`
}

async function loadInsight() {
  if (items.value.length === 0) {
    insightText.value = ''
    return
  }
  const key = insightCacheKey()
  if (insightCache.has(key)) {
    insightText.value = insightCache.get(key)!
    return
  }
  insightLoading.value = true
  insightText.value = ''
  insightUnsub?.()
  insightStatusUnsub?.()
  insightUnsub = window.api.ai.onInsightStreamChunk((data) => {
    if (data.type === 'appUsage') insightText.value += data.chunk
  })
  insightStatusUnsub = window.api.ai.onInsightStatusChanged((data) => {
    if (data.type !== 'appUsage') return
    if (data.status === 'completed') {
      insightLoading.value = false
      if (data.content) {
        insightText.value = data.content
        insightCache.set(key, data.content)
        toast.success('AI 洞察完成')
      }
    } else if (data.status === 'failed') {
      insightLoading.value = false
      insightText.value = '生成失败：' + (data.error ?? '未知错误')
      toast.error('洞察生成失败')
    }
  })
  try {
    // 只传 Top 10 应用，避免 prompt 过长
    const payload = items.value.slice(0, 10).map(a => ({
      appName: a.appName,
      durationMinutes: Math.round(a.durationSec / 60)
    }))
    await safeCall(() => window.api.ai.generateInsight({ type: 'appUsage', data: payload }), null)
    toast.info('AI 洞察生成中…')
  } catch (e: any) {
    insightLoading.value = false
    insightText.value = '生成失败：' + (e.message ?? '未知错误')
    toast.error('洞察生成失败：' + (e?.message ?? '未知错误'))
  }
}

function refreshInsight() {
  insightCache.delete(insightCacheKey())
  insightText.value = ''
  loadInsight()
}

// 自定义日期范围重置为今天
function resetCustomRange() {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00`
  const now = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 23:59`
  customStart.value = today
  customEnd.value = now
  load()
}

watch(range, (r) => {
  if (r !== 'custom') load()
})

onMounted(() => {
  load()
})

onUnmounted(() => {
  insightUnsub?.()
  insightStatusUnsub?.()
})

const topApps = computed(() => items.value.slice(0, 20))
const totalApps = computed(() => items.value.length)
const totalSec = computed(() => items.value.reduce((s, i) => s + i.durationSec, 0))
const avgSec = computed(() => {
  const div = range.value === 'week' ? 7 : range.value === 'month' ? 30 : 1
  return Math.round(totalSec.value / div)
})

const chartHeight = computed(() => Math.max(200, topApps.value.length * 26 + 16))

const barData = computed<ChartData<'bar'>>(() => ({
  labels: topApps.value.map(a => a.appName),
  datasets: [{
    label: '使用时长',
    data: topApps.value.map(a => a.durationSec),
    backgroundColor: 'rgba(16, 185, 129, 0.75)',
    borderWidth: 0,
    borderRadius: 4,
    barThickness: 16
  }]
}))

const barOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { right: 60 } },
  scales: {
    x: { display: false },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 13 }, color: '#333', padding: 8 }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => formatDuration(Number(ctx.raw))
      }
    }
  }
}

const durationLabelsPlugin: Plugin<'bar'> = {
  id: 'durationLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    const dataset = chart.data.datasets[0]
    ctx.save()
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    meta.data.forEach((bar, i) => {
      const value = dataset.data[i]
      const text = formatDuration(Number(value))
      ctx.fillText(text, bar.x + 8, bar.y)
    })
    ctx.restore()
  }
}

const pieColors = [
  'rgba(59,130,246,0.7)',
  'rgba(16,185,129,0.7)',
  'rgba(245,158,11,0.7)',
  'rgba(239,68,68,0.7)',
  'rgba(139,92,246,0.7)',
  'rgba(236,72,153,0.7)',
  'rgba(14,165,233,0.7)',
  'rgba(99,102,241,0.7)',
  'rgba(20,184,166,0.7)',
  'rgba(249,115,22,0.7)'
]

const pieData = computed<ChartData<'doughnut'>>(() => ({
  labels: topApps.value.map(a => a.appName),
  datasets: [{
    data: topApps.value.map(a => a.durationSec),
    backgroundColor: pieColors,
    borderWidth: 0
  }]
}))

const pieOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { boxWidth: 12, padding: 12, font: { size: 12 } }
    }
  }
}
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto pb-12 w-full h-full overflow-y-auto min-h-0">
    <!-- 顶栏：描述 + 日期切换按钮 -->
    <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <p class="text-sm text-muted-foreground">查看各应用使用时长分布，了解时间花费结构</p>
      <q-btn-toggle
        v-model="range"
        spread
        no-caps
        unelevated
        toggle-color="primary"
        color="white"
        text-color="foreground"
        class="ya-qbtn-toggle ya-qbtn-toggle--wide"
        :options="[
          { label: '今日', value: 'today' },
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' },
          { label: '自定义', value: 'custom' }
        ]"
      />
    </div>

    <!-- 自定义日期范围（与 Heatmap/Timeline 卡片风格统一） -->
    <div v-if="range==='custom'" class="card p-4 mb-5">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-[11.5px] font-mono uppercase tracking-wider text-muted-foreground">日期范围</span>
        <q-input
          v-model="customStart"
          outlined
          dense
          mask="####-##-## ##:##"
          class="date-input"
          placeholder="开始时间"
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="customStart" mask="YYYY-MM-DD HH:mm" minimal />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <span class="text-xs text-muted-foreground">至</span>
        <q-input
          v-model="customEnd"
          outlined
          dense
          mask="####-##-## ##:##"
          class="date-input"
          placeholder="结束时间"
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="customEnd" mask="YYYY-MM-DD HH:mm" minimal />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <button
          class="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          @click="resetCustomRange"
        >重置</button>
        <button class="btn-primary btn-sm" @click="load">查询</button>
      </div>
    </div>

    <!-- 三卡片：总应用数 / 总时长 / 日均时长 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card p-4">
        <div class="text-xs text-muted-foreground mb-1">总应用数</div>
        <div class="text-lg font-semibold font-display">{{ totalApps }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted-foreground mb-1">总时长</div>
        <div class="text-lg font-semibold font-display">{{ formatDuration(totalSec) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted-foreground mb-1">日均时长</div>
        <div class="text-lg font-semibold font-display">{{ formatDuration(avgSec) }}</div>
      </div>
    </div>

    <!-- Top 20 图表卡片 -->
    <div class="card p-4 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-medium">应用时长分布（Top 20）</div>
        <q-btn-toggle
          v-model="chartMode"
          spread
          no-caps
          unelevated
          toggle-color="primary"
          color="white"
          text-color="foreground"
          class="ya-qbtn-toggle ya-qbtn-toggle--wide"
          :options="[
            { label: '柱状图', value: 'bar' },
            { label: '饼图', value: 'pie' }
          ]"
        />
      </div>
      <!-- 加载 -->
      <div v-if="loading" class="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
      </div>
      <!-- 空 -->
      <div v-else-if="topApps.length === 0" class="flex items-center justify-center h-64 text-muted-foreground text-sm">暂无应用使用数据</div>
      <!-- 柱状图：Chart.js Bar 横向 -->
      <div v-else-if="chartMode==='bar'" :style="{ height: chartHeight + 'px' }">
        <Bar :data="barData" :options="barOptions" :plugins="[durationLabelsPlugin]" />
      </div>
      <!-- 饼图：Chart.js Doughnut -->
      <div v-else class="h-80">
        <Doughnut :data="pieData" :options="pieOptions" />
      </div>
    </div>

    <!-- 详细列表 -->
    <div class="card overflow-hidden">
      <div class="px-4 py-3 border-b text-sm font-medium">详细列表</div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-muted-foreground text-xs">
            <th class="text-left px-4 py-2 font-medium">应用名称</th>
            <th class="text-right px-4 py-2 font-medium">使用时长</th>
            <th class="text-right px-4 py-2 font-medium">占比</th>
            <th class="text-right px-4 py-2 font-medium">首次使用</th>
            <th class="text-right px-4 py-2 font-medium">最后使用</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in topApps" :key="app.appName" class="border-b hover:bg-muted/30 transition-colors">
            <td class="px-4 py-2.5">{{ app.appName }}</td>
            <td class="px-4 py-2.5 text-right font-mono">{{ formatDuration(app.durationSec) }}</td>
            <td class="px-4 py-2.5 text-right text-muted-foreground font-mono">{{ app.share }}%</td>
            <td class="px-4 py-2.5 text-right text-muted-foreground font-mono text-xs">{{ formatDateTime(app.firstUsedAt) }}</td>
            <td class="px-4 py-2.5 text-right text-muted-foreground font-mono text-xs">{{ formatDateTime(app.lastUsedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- AI 洞察 -->
    <div v-if="!loading && items.length > 0" class="card p-4 mt-6">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles class="w-4 h-4 text-primary" />
          AI 洞察
        </div>
        <button
          class="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 disabled:opacity-50"
          :disabled="insightLoading"
          @click="refreshInsight"
        >
          <RefreshCw class="w-3 h-3" :class="insightLoading ? 'animate-spin' : ''" />
          刷新
        </button>
      </div>
      <div v-if="insightLoading && !insightText" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="w-3.5 h-3.5 animate-spin" /> 正在分析你的时间分配...
      </div>
      <p v-else class="text-sm text-foreground/80 leading-relaxed">{{ insightText || '点击刷新生成洞察' }}</p>
      <button
        class="text-xs text-primary hover:underline mt-3"
        @click="router.push('/agent')"
      >展开详细分析 →</button>
    </div>
  </div>
</template>
