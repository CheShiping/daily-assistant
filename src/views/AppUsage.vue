<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart,
  registerables,
  type ChartData,
  type ChartOptions,
  type Plugin
} from 'chart.js'

Chart.register(...registerables)

interface AppRow {
  appName: string
  durationSec: number
  share: number
  firstUsedAt: string | null
  lastUsedAt: string | null
}

const ranges = [
  { k: 'today' as const, l: '今日' },
  { k: 'week' as const, l: '本周' },
  { k: 'month' as const, l: '本月' },
  { k: 'custom' as const, l: '自定义' }
]

const range = ref<'today' | 'week' | 'month' | 'custom'>('today')
const customStart = ref('')
const customEnd = ref('')
const chartMode = ref<'bar' | 'pie'>('bar')
const loading = ref(false)
const items = ref<AppRow[]>([])

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
    const raw = await window.api.appUsage.list({ startDate: startISO, endDate: endISO })
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
}

watch(range, (r) => {
  if (r !== 'custom') load()
})

onMounted(() => {
  load()
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
  <div class="p-6 pb-12">
    <!-- 顶栏：描述 + 日期切换按钮 -->
    <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-[#999]">查看各应用使用时长分布，了解时间花费结构</p>
      <div class="flex items-center gap-2">
        <button v-for="r in ranges" :key="r.k" @click="range=r.k"
          :class="['px-3 py-1.5 text-xs rounded-md border transition-colors',
            range===r.k ? 'bg-black/[0.06] border-black/10 text-foreground' : 'border-black/5 text-[#999] hover:bg-black/[0.03]']">
          {{ r.l }}
        </button>
      </div>
    </div>

    <!-- 自定义日期范围 -->
    <div v-if="range==='custom'" class="flex items-center gap-2 mb-4">
      <input type="datetime-local" v-model="customStart" class="px-3 py-1.5 text-xs border border-black/10 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-black/10" />
      <span class="text-xs text-[#999]">至</span>
      <input type="datetime-local" v-model="customEnd" class="px-3 py-1.5 text-xs border border-black/10 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-black/10" />
      <button @click="load" class="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">查询</button>
    </div>

    <!-- 三卡片：总应用数 / 总时长 / 日均时长 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="rounded-xl border border-black/5 p-4 bg-white">
        <div class="text-xs text-[#999] mb-1">总应用数</div>
        <div class="text-lg font-semibold">{{ totalApps }}</div>
      </div>
      <div class="rounded-xl border border-black/5 p-4 bg-white">
        <div class="text-xs text-[#999] mb-1">总时长</div>
        <div class="text-lg font-semibold">{{ formatDuration(totalSec) }}</div>
      </div>
      <div class="rounded-xl border border-black/5 p-4 bg-white">
        <div class="text-xs text-[#999] mb-1">日均时长</div>
        <div class="text-lg font-semibold">{{ formatDuration(avgSec) }}</div>
      </div>
    </div>

    <!-- Top 20 图表卡片 -->
    <div class="rounded-xl border border-black/5 p-4 bg-white mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-medium">应用时长分布（Top 20）</div>
        <div class="flex items-center gap-1 rounded-md border border-black/5 p-0.5">
          <button @click="chartMode='bar'" :class="['px-2.5 py-1 text-xs rounded transition-colors', chartMode==='bar' ? 'bg-black/[0.06] text-foreground' : 'text-[#999] hover:bg-black/[0.03]']">柱状图</button>
          <button @click="chartMode='pie'" :class="['px-2.5 py-1 text-xs rounded transition-colors', chartMode==='pie' ? 'bg-black/[0.06] text-foreground' : 'text-[#999] hover:bg-black/[0.03]']">饼图</button>
        </div>
      </div>
      <!-- 加载 -->
      <div v-if="loading" class="flex items-center justify-center h-64 gap-2 text-[#999]">
        <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
      </div>
      <!-- 空 -->
      <div v-else-if="topApps.length === 0" class="flex items-center justify-center h-64 text-[#999] text-sm">暂无应用使用数据</div>
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
    <div class="rounded-xl border border-black/5 bg-white overflow-hidden">
      <div class="px-4 py-3 border-b border-black/5 text-sm font-medium">详细列表</div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-black/5 text-[#999] text-xs">
            <th class="text-left px-4 py-2 font-medium">应用名称</th>
            <th class="text-right px-4 py-2 font-medium">使用时长</th>
            <th class="text-right px-4 py-2 font-medium">占比</th>
            <th class="text-right px-4 py-2 font-medium">首次使用</th>
            <th class="text-right px-4 py-2 font-medium">最后使用</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in topApps" :key="app.appName" class="border-b border-black/[0.03] hover:bg-black/[0.015] transition-colors">
            <td class="px-4 py-2.5">{{ app.appName }}</td>
            <td class="px-4 py-2.5 text-right">{{ formatDuration(app.durationSec) }}</td>
            <td class="px-4 py-2.5 text-right text-[#999]">{{ app.share }}%</td>
            <td class="px-4 py-2.5 text-right text-[#999]">{{ formatDateTime(app.firstUsedAt) }}</td>
            <td class="px-4 py-2.5 text-right text-[#999]">{{ formatDateTime(app.lastUsedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
