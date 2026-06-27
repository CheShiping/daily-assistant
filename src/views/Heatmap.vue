<script setup lang="ts">
<<<<<<< HEAD
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/lib/utils'
import { Loader2, Calendar, Activity, Sparkles, RefreshCw } from 'lucide-vue-next'
=======
import { ref, computed, onMounted, watch } from 'vue'
import { formatDate } from '@/lib/utils'
import { Loader2, Calendar, Activity } from 'lucide-vue-next'
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869

interface HeatCell {
  date: string
  hour: number
  count: number
}

<<<<<<< HEAD
const router = useRouter()

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
const loading = ref(true)
const cells = ref<HeatCell[]>([])
const startDate = ref('')
const endDate = ref('')
const showRecentOnly = ref(false) // 显示前两日开关

<<<<<<< HEAD
// AI 洞察
const insightText = ref('')
const insightLoading = ref(false)
const insightCache = new Map<string, string>()
let insightUnsub: (() => void) | null = null
let insightStatusUnsub: (() => void) | null = null

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
function initRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  startDate.value = formatDate(start)
  endDate.value = formatDate(end)
}

async function load() {
  loading.value = true
  let s: Date, e: Date
  if (showRecentOnly.value) {
    e = new Date()
    s = new Date()
    s.setDate(s.getDate() - 1) // 前两日 = 今天 + 昨天
  } else {
    s = new Date(startDate.value)
    e = new Date(endDate.value)
  }
  s.setHours(0, 0, 0, 0)
  e.setHours(23, 59, 59, 999)
  cells.value = await window.api.heatmap.list({
    startDate: s.toISOString(),
    endDate: e.toISOString()
  })
  loading.value = false
<<<<<<< HEAD
  loadInsight()
}

// AI 洞察
function insightCacheKey(): string {
  return `${startDate.value}_${endDate.value}_${showRecentOnly.value ? '1' : '0'}`
}

async function loadInsight() {
  if (cells.value.length === 0) {
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
    if (data.type === 'heatmap') insightText.value += data.chunk
  })
  insightStatusUnsub = window.api.ai.onInsightStatusChanged((data) => {
    if (data.type !== 'heatmap') return
    if (data.status === 'completed') {
      insightLoading.value = false
      if (data.content) {
        insightText.value = data.content
        insightCache.set(key, data.content)
      }
    } else if (data.status === 'failed') {
      insightLoading.value = false
      insightText.value = '生成失败：' + (data.error ?? '未知错误')
    }
  })
  try {
    await window.api.ai.generateInsight({ type: 'heatmap', data: cells.value })
  } catch (e: any) {
    insightLoading.value = false
    insightText.value = '生成失败：' + (e.message ?? '未知错误')
  }
}

function refreshInsight() {
  insightCache.delete(insightCacheKey())
  insightText.value = ''
  loadInsight()
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
}

// 监听开关变化重新加载
watch(showRecentOnly, () => load())

// 按日期分组：[date, counts[24]]
const grid = computed(() => {
  const map = new Map<string, number[]>()
  for (const c of cells.value) {
    if (!map.has(c.date)) map.set(c.date, new Array(24).fill(0))
    map.get(c.date)![c.hour] = c.count
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const maxCount = computed(() => {
  let m = 0
  for (const c of cells.value) if (c.count > m) m = c.count
  return m
})

const totalRecords = computed(() => cells.value.reduce((s, c) => s + c.count, 0))
const activeHours = computed(() => new Set(cells.value.filter(c => c.count > 0).map(c => c.hour)).size)

const weekLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function weekOf(dateStr: string): string {
  return weekLabels[new Date(dateStr).getDay()]
}

// 热力图颜色：基于 count 与 maxCount 的比值，使用 chart 绿色系
function cellColor(count: number): string {
  if (count === 0) return 'hsl(var(--muted))'
  const ratio = maxCount.value === 0 ? 0 : count / maxCount.value
<<<<<<< HEAD
  if (ratio < 0.2) return 'hsl(142 40% 85%)'
  if (ratio < 0.4) return 'hsl(142 55% 70%)'
  if (ratio < 0.6) return 'hsl(142 65% 55%)'
  if (ratio < 0.8) return 'hsl(142 71% 45%)'
  return 'hsl(142 71% 35%)'
=======
  if (ratio < 0.25) return 'hsl(142 60% 75%)'
  if (ratio < 0.5) return 'hsl(142 65% 60%)'
  if (ratio < 0.75) return 'hsl(142 71% 48%)'
  return 'hsl(142 71% 38%)'
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
}

onMounted(() => {
  initRange()
  load()
})
<<<<<<< HEAD

onUnmounted(() => {
  insightUnsub?.()
  insightStatusUnsub?.()
})
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">时段热力图</h1>
        <p class="text-sm text-muted-foreground mt-1">查看你在不同时段的工作密度</p>
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" v-model="showRecentOnly" class="rounded" />
          仅显示前两日
        </label>
        <div class="flex items-center gap-2 text-sm">
          <Calendar class="w-4 h-4 text-muted-foreground" />
          <input type="date" v-model="startDate" class="input h-8 w-36" @change="load" :disabled="showRecentOnly" />
          <span class="text-muted-foreground">至</span>
          <input type="date" v-model="endDate" class="input h-8 w-36" @change="load" :disabled="showRecentOnly" />
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card p-4">
        <div class="text-xs text-muted-foreground">总记录数</div>
        <div class="text-2xl font-bold mt-1">{{ totalRecords }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted-foreground">活跃时段</div>
        <div class="text-2xl font-bold mt-1">{{ activeHours }} <span class="text-sm font-normal text-muted-foreground">/ 24</span></div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted-foreground">单小时峰值</div>
        <div class="text-2xl font-bold mt-1">{{ maxCount }} <span class="text-sm font-normal text-muted-foreground">条</span></div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground py-12 justify-center">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <div v-else-if="grid.length === 0" class="card p-12 text-center text-muted-foreground">
      <Activity class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>所选范围内没有数据</p>
    </div>

    <div v-else class="card p-5 overflow-x-auto">
      <div class="min-w-[700px]">
        <!-- 小时表头 -->
        <div class="flex items-center gap-1 mb-2 pl-16">
          <div v-for="h in 24" :key="h - 1" class="flex-1 text-center text-[10px] text-muted-foreground font-mono">
            {{ (h - 1) % 6 === 0 ? (h - 1).toString().padStart(2, '0') : '' }}
          </div>
        </div>

        <!-- 每天一行 -->
        <div v-for="[date, counts] in grid" :key="date" class="flex items-center gap-1 mb-1">
          <div class="w-16 flex-shrink-0 text-xs text-muted-foreground">
            <div>{{ date.slice(5) }}</div>
            <div class="text-[10px]">{{ weekOf(date) }}</div>
          </div>
          <div
            v-for="(c, h) in counts"
            :key="h"
<<<<<<< HEAD
            class="flex-1 h-7 rounded-[3px] transition-all duration-150 hover:scale-125 hover:ring-2 hover:ring-primary/50 cursor-pointer"
=======
            class="flex-1 h-6 rounded-sm transition-transform hover:scale-110 hover:ring-1 hover:ring-primary cursor-pointer"
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
            :style="{ backgroundColor: cellColor(c) }"
            :title="`${date} ${h.toString().padStart(2, '0')}:00 · ${c} 条记录`"
          ></div>
        </div>

        <!-- 图例 -->
        <div class="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>少</span>
          <div class="w-4 h-4 rounded-sm" style="background-color: hsl(var(--muted))"></div>
          <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 60% 75%)"></div>
          <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 65% 60%)"></div>
          <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 71% 48%)"></div>
          <div class="w-4 h-4 rounded-sm" style="background-color: hsl(142 71% 38%)"></div>
          <span>多</span>
        </div>
      </div>
    </div>
<<<<<<< HEAD

    <!-- AI 洞察 -->
    <div v-if="!loading && cells.length > 0" class="card p-4 mt-4">
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
        <Loader2 class="w-3.5 h-3.5 animate-spin" /> 正在分析你的工作节奏...
      </div>
      <p v-else class="text-sm text-foreground/80 leading-relaxed">{{ insightText || '点击刷新生成洞察' }}</p>
      <button
        class="text-xs text-primary hover:underline mt-3"
        @click="router.push('/agent')"
      >展开详细分析 →</button>
    </div>
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
  </div>
</template>
