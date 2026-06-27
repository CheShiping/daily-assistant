<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { WorkRecord } from '@/types'
import { today } from '@/lib/utils'
import {
  Bot, Download, Plus, Search, BarChart3, Clock,
  Upload, Camera, Edit3, Trash2
} from 'lucide-vue-next'
import { Doughnut } from 'vue-chartjs'
import { Chart, registerables } from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'

Chart.register(...registerables)

const router = useRouter()

const records = ref<WorkRecord[]>([])
const startDate = ref('')
const endDate = ref('')
const searchQuery = ref('')
const showCategoryChart = ref(true)
const chartMode = ref<'bar' | 'pie'>('bar')
const timeFilter = ref<'30m' | '1h' | '2h' | 'today'>('today')

const timeFilters = [
  { k: '30m' as const, l: '近30分' },
  { k: '1h' as const, l: '近1小时' },
  { k: '2h' as const, l: '近2小时' },
  { k: 'today' as const, l: '今天' }
]

const categoryColors: Record<string, { dot: string; label: string; chart: string }> = {
  '开发': { dot: 'bg-emerald-500', label: 'text-emerald-600 bg-emerald-500/10', chart: '#10b981' },
  '会议': { dot: 'bg-blue-500', label: 'text-blue-600 bg-blue-500/10', chart: '#3b82f6' },
  '沟通': { dot: 'bg-amber-500', label: 'text-amber-600 bg-amber-500/10', chart: '#f59e0b' },
  '文档': { dot: 'bg-purple-500', label: 'text-purple-600 bg-purple-500/10', chart: '#a855f7' },
  '测试': { dot: 'bg-rose-500', label: 'text-rose-600 bg-rose-500/10', chart: '#f43f5e' },
  '设计': { dot: 'bg-cyan-500', label: 'text-cyan-600 bg-cyan-500/10', chart: '#06b6d4' },
  '运维': { dot: 'bg-red-500', label: 'text-red-600 bg-red-500/10', chart: '#ef4444' },
  '数据分析': { dot: 'bg-teal-500', label: 'text-teal-600 bg-teal-500/10', chart: '#14b8a6' },
  '学习': { dot: 'bg-indigo-500', label: 'text-indigo-600 bg-indigo-500/10', chart: '#6366f1' },
  '管理': { dot: 'bg-pink-500', label: 'text-pink-600 bg-pink-500/10', chart: '#ec4899' },
  '产品': { dot: 'bg-violet-500', label: 'text-violet-600 bg-violet-500/10', chart: '#8b5cf6' },
  '生活': { dot: 'bg-orange-500', label: 'text-orange-600 bg-orange-500/10', chart: '#f97316' },
  '其他': { dot: 'bg-zinc-500', label: 'text-zinc-600 bg-zinc-500/10', chart: '#71717a' }
}
function catColor(cat: string | null | undefined) {
  if (cat && categoryColors[cat]) return categoryColors[cat]
  return categoryColors['其他']
}

function initRange() {
  startDate.value = today()
  endDate.value = today()
}

async function load() {
  const s = new Date(startDate.value)
  s.setHours(0, 0, 0, 0)
  const e = new Date(endDate.value)
  e.setHours(23, 59, 59, 999)
  const list = await window.api.workRecords.list({
    startDate: s.toISOString(),
    endDate: e.toISOString()
  })
  records.value = list.sort((a, b) => {
    const ae = a.endedAt ? new Date(a.endedAt).getTime() : new Date(a.startedAt).getTime()
    const be = b.endedAt ? new Date(b.endedAt).getTime() : new Date(b.startedAt).getTime()
    return be - ae
  })
}

function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '--:--'
  const d = typeof date === 'string' ? new Date(date) : date
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function recordMinutes(r: WorkRecord): number {
  if (r.endedAt) {
    return Math.max(1, Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 60000))
  }
  return 5
}

const filteredRecords = computed(() => {
  const now = Date.now()
  let list = records.value
  if (timeFilter.value === 'today') {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const t0 = startOfToday.getTime()
    list = list.filter(r => {
      const t = r.endedAt ? new Date(r.endedAt).getTime() : new Date(r.startedAt).getTime()
      return t >= t0
    })
  } else {
    const ms = timeFilter.value === '30m' ? 30 * 60 * 1000
      : timeFilter.value === '1h' ? 60 * 60 * 1000
      : 2 * 60 * 60 * 1000
    list = list.filter(r => {
      const t = r.endedAt ? new Date(r.endedAt).getTime() : new Date(r.startedAt).getTime()
      return now - t <= ms
    })
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.summary.toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q))
  }
  return list
})

const totalCount = computed(() => filteredRecords.value.length)

const focusMinutes = computed(() => {
  let m = 0
  for (const r of filteredRecords.value) m += recordMinutes(r)
  return m
})

const focusHours = computed(() => Math.round((focusMinutes.value / 60) * 10) / 10)

const activePeriod = computed(() => {
  if (filteredRecords.value.length === 0) return '—'
  let minStart = Infinity
  let maxEnd = -Infinity
  for (const r of filteredRecords.value) {
    const s = new Date(r.startedAt).getTime()
    const e = r.endedAt ? new Date(r.endedAt).getTime() : s
    if (s < minStart) minStart = s
    if (e > maxEnd) maxEnd = e
  }
  return `${formatTime(new Date(minStart))} - ${formatTime(new Date(maxEnd))}`
})

const categoryStats = computed(() => {
  const map = new Map<string, number>()
  for (const r of filteredRecords.value) {
    const cat = r.category ?? '其他'
    map.set(cat, (map.get(cat) ?? 0) + recordMinutes(r))
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0)
  return Array.from(map.entries())
    .map(([name, minutes]) => ({
      name,
      minutes,
      percent: total === 0 ? 0 : Math.round((minutes / total) * 100)
    }))
    .sort((a, b) => b.minutes - a.minutes)
})

const pieData = computed<ChartData<'doughnut'>>(() => ({
  labels: categoryStats.value.map(i => i.name),
  datasets: [{
    data: categoryStats.value.map(i => i.minutes),
    backgroundColor: categoryStats.value.map(i => catColor(i.name).chart),
    borderWidth: 0
  }]
}))

const pieOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '0%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.label ?? ''}: ${ctx.parsed} 分`
      }
    }
  }
}

function isIdle(r: WorkRecord, idx: number): boolean {
  if (idx >= filteredRecords.value.length - 1) return false
  const next = filteredRecords.value[idx + 1]
  const nextEnd = next.endedAt ? new Date(next.endedAt).getTime() : new Date(next.startedAt).getTime()
  const thisStart = new Date(r.startedAt).getTime()
  return thisStart - nextEnd > 10 * 60 * 1000
}

async function deleteRecord(r: WorkRecord) {
  await window.api.workRecords.delete(r.id)
  await load()
}

function displaySummary(summary: string): string {
  if (!summary) return ''
  const raw = summary.trim()
  // 如果不像 JSON（不以 { 或 [ 或 ``` 开头），直接返回
  if (!raw.startsWith('{') && !raw.startsWith('[') && !raw.startsWith('```')) {
    return summary
  }
  // 策略1：标准 JSON 解析（去除 markdown 代码块标记）
  try {
    let s = raw
    if (s.startsWith('```json')) s = s.slice(7)
    else if (s.startsWith('```')) s = s.slice(3)
    if (s.endsWith('```')) s = s.slice(0, -3)
    s = s.trim()
    const parsed = JSON.parse(s)
    if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) return parsed.summary
  } catch {}
  // 策略2：正则提取 summary 字段（兼容被截断的 JSON、带前缀文本的 JSON）
  const m = raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m && m[1]) {
    const extracted = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()
    if (extracted) return extracted
  }
  // 策略3：summary 值可能没有闭合引号（被截断），提取到行尾或字符串尾
  const m2 = raw.match(/"summary"\s*:\s*"(.*)$/s)
  if (m2 && m2[1]) {
    const extracted = m2[1].replace(/["}\s\\]+$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
    if (extracted) return extracted
  }
  return summary
}

function copyAllLogs() {
  const text = filteredRecords.value
    .map(r => `${formatTime(r.startedAt)} - ${formatTime(r.endedAt)} | ${r.category ?? '其他'} | ${r.summary}`)
    .join('\n')
  navigator.clipboard.writeText(text)
}

function exportData() {
  const blob = new Blob([JSON.stringify(filteredRecords.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `timeline-${startDate.value}-${endDate.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  initRange()
  load()
})
</script>

<template>
  <div class="flex flex-col gap-5 p-6 px-7">
    <!-- 1. 描述行 -->
    <div class="pt-4 pb-0.5">
      <p class="text-xs text-[#999]">查看全天工作活动轨迹，了解时间都花在了哪里</p>
    </div>

    <!-- 2. 顶栏：日期 + 4 按钮 + 搜索 -->
    <section class="rounded-[10px] bg-black/[0.02] p-4 px-[18px]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <input type="date" v-model="startDate" @change="load" class="h-7 w-[130px] text-xs border border-black/10 rounded-md bg-transparent px-2" />
          <span class="text-xs text-[#999]">至</span>
          <input type="date" v-model="endDate" @change="load" class="h-7 w-[130px] text-xs border border-black/10 rounded-md bg-transparent px-2" />
        </div>
        <div class="flex items-center gap-3">
          <button class="h-7 px-3 gap-1.5 text-xs border border-black/10 rounded-md flex items-center hover:bg-black/[0.03]" @click="router.push('/agent')"><Bot :size="13" /> 与AI对话</button>
          <button class="h-7 px-3 gap-1.5 text-xs border border-black/10 rounded-md flex items-center hover:bg-black/[0.03]" @click="exportData"><Download :size="13" /> 导出数据</button>
          <button class="h-7 px-3 gap-1.5 text-xs border border-black/10 rounded-md flex items-center hover:bg-black/[0.03]" @click="router.push('/records')"><Plus :size="13" /> 添加记录</button>
          <div class="relative">
            <Search :size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbb]" />
            <input v-model="searchQuery" class="h-7 w-[160px] pl-8 text-xs border border-black/10 rounded-md bg-transparent" placeholder="搜索活动..." />
          </div>
        </div>
      </div>
    </section>

    <!-- 3. 统计条 -->
    <section class="rounded-[10px] bg-black/[0.02] p-4 px-[18px]">
      <div class="flex items-center justify-between">
        <div class="flex gap-7">
          <div class="flex flex-col gap-[3px]">
            <span class="text-lg font-semibold leading-tight">{{ totalCount }}</span>
            <span class="text-xs text-[#999] leading-none">记录条数</span>
          </div>
          <div class="flex flex-col gap-[3px]">
            <span class="text-lg font-semibold leading-tight">{{ focusHours }}h</span>
            <span class="text-xs text-[#999] leading-none">专注时长</span>
          </div>
          <div class="flex flex-col gap-[3px]">
            <span class="text-lg font-semibold leading-tight">{{ activePeriod }}</span>
            <span class="text-xs text-[#999] leading-none">活跃时段</span>
          </div>
        </div>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" v-model="showCategoryChart" class="size-3.5" />
          <span class="text-xs text-[#999] leading-none">显示分类时长分布</span>
        </label>
      </div>
    </section>

    <!-- 4. 分类时长分布 -->
    <section v-if="showCategoryChart" class="rounded-[10px] bg-black/[0.02] p-5 px-[18px]">
      <div class="flex items-center gap-2 mb-4">
        <BarChart3 :size="14" stroke-width="1.5" class="text-[#999]" />
        <h2 class="text-xs font-semibold text-foreground">分类时长分布</h2>
        <div class="ml-auto flex items-center gap-1 rounded-md border border-black/5 p-0.5">
          <button @click="chartMode='bar'" :class="['px-2.5 py-1 text-xs rounded transition-colors', chartMode==='bar' ? 'bg-black/[0.06] text-foreground' : 'text-[#999] hover:bg-black/[0.03]']">柱状图</button>
          <button @click="chartMode='pie'" :class="['px-2.5 py-1 text-xs rounded transition-colors', chartMode==='pie' ? 'bg-black/[0.06] text-foreground' : 'text-[#999] hover:bg-black/[0.03]']">饼图</button>
        </div>
      </div>
      <!-- 柱状图模式：横向条形列表 -->
      <div v-if="chartMode==='bar'" class="flex flex-col gap-3">
        <div v-for="item in categoryStats" :key="item.name" class="flex items-center gap-3">
          <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="catColor(item.name).dot"></div>
          <span class="text-xs text-foreground">{{ item.name }}</span>
          <div class="flex-1 h-2 rounded-full bg-black/5">
            <div class="h-2 rounded-full transition-all" :class="catColor(item.name).dot" :style="{ width: item.percent + '%' }"></div>
          </div>
          <span class="text-xs text-[#999] w-14 text-right shrink-0">{{ item.minutes }}分</span>
        </div>
      </div>
      <!-- 饼图模式：用 Chart.js Doughnut -->
      <div v-else class="flex items-center py-2">
        <div class="flex-1 flex justify-center">
          <div class="w-[260px] h-[260px]">
            <Doughnut v-if="categoryStats.length > 0" :data="pieData" :options="pieOptions" />
          </div>
        </div>
        <div class="grid gap-x-8 gap-y-2.5 pr-1" style="grid-auto-flow: column; grid-template-rows: repeat(7, auto);">
          <div v-for="item in categoryStats" :key="item.name" class="flex items-center gap-2 cursor-pointer select-none">
            <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="catColor(item.name).dot"></div>
            <span class="text-xs text-[#555] whitespace-nowrap">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. 活动时间线 -->
    <section class="rounded-[10px] bg-black/[0.02] p-5 px-[18px]">
      <div class="flex items-center gap-2 mb-4">
        <Clock :size="14" stroke-width="1.5" class="text-[#999]" />
        <h2 class="text-xs font-semibold text-foreground">活动时间线</h2>
        <!-- 时间筛选 ButtonGroup（靠右） -->
        <div class="ml-auto flex items-center gap-0.5">
          <button v-for="f in timeFilters" :key="f.k" @click="timeFilter=f.k"
            :class="['h-7 px-3 text-xs transition-colors border',
              timeFilter===f.k ? 'bg-foreground text-background border-foreground' : 'border-black/10 text-[#999] hover:bg-black/[0.03]',
              f.k==='30m' ? 'rounded-l-md' : '', f.k==='today' ? 'rounded-r-md' : 'border-l-0']">
            {{ f.l }}
          </button>
        </div>
        <span class="text-xs text-[#999] whitespace-nowrap cursor-pointer hover:text-foreground ml-3" @click="copyAllLogs">复制日志到剪切板</span>
      </div>
      <!-- 3列flex时间线 -->
      <div class="flex flex-col">
        <div v-for="(r, idx) in filteredRecords" :key="r.id" class="flex gap-4">
          <!-- 时间列 -->
          <div class="w-14 shrink-0 pt-[7px]">
            <span class="text-xs text-[#999] leading-none">{{ formatTime(r.endedAt) }}</span>
          </div>
          <!-- 圆点连线列 -->
          <div class="w-4 shrink-0 flex flex-col items-center">
            <div class="w-2.5 h-2.5 rounded-full shrink-0 mt-[5px]" :class="isIdle(r, idx) ? 'bg-[#ddd] border border-[#ccc]' : 'bg-primary'"></div>
            <div v-if="idx < filteredRecords.length - 1" class="flex-1 w-px my-1"
                 :class="isIdle(r, idx) ? 'border-l border-dashed border-black/10' : 'bg-primary/30'"></div>
          </div>
          <!-- 卡片列 -->
          <div class="flex-1 pb-4">
            <div class="rounded-lg bg-white border border-black/[0.06] p-3 group">
              <p class="text-sm text-[#555] leading-relaxed mb-2 whitespace-pre-wrap">{{ displaySummary(r.summary) }}</p>
              <div class="flex items-center gap-2">
                <span v-if="r.category" class="text-xs font-medium px-1.5 py-px rounded" :class="catColor(r.category).label">{{ r.category }}</span>
                <span v-if="r.source === 'screenshot'" class="text-xs text-[#bbb] flex items-center gap-0.5"><Upload :size="10" /> 主动上传</span>
                <span class="text-xs text-[#bbb]">{{ formatTime(r.startedAt) }} — {{ formatTime(r.endedAt) }}</span>
                <div class="ml-auto flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button class="h-3 w-3 text-[#bbb] hover:text-primary"><Camera :size="6" /></button>
                  <button class="h-3 w-3 text-[#bbb] hover:text-foreground"><Edit3 :size="6" /></button>
                  <button class="h-3 w-3 text-[#bbb] hover:text-destructive" @click="deleteRecord(r)"><Trash2 :size="6" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 空状态 -->
        <div v-if="filteredRecords.length === 0" class="flex flex-col items-center gap-3 py-10">
          <div class="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center"><Clock class="w-5 h-5 text-[#bbb]" /></div>
          <span class="text-sm text-[#999]">当天暂无工作记录</span>
        </div>
      </div>
    </section>
  </div>
</template>
