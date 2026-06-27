<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate, safeCall } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Loader2, Activity, Sparkles, RefreshCw, Flame, Clock, BarChart3 } from 'lucide-vue-next'

interface HeatCell {
  date: string
  hour: number
  count: number
}

const router = useRouter()

const loading = ref(true)
const cells = ref<HeatCell[]>([])
const startDate = ref('')
const endDate = ref('')
const showRecentOnly = ref(false)

// AI 洞察
const insightText = ref('')
const insightLoading = ref(false)
const insightCache = new Map<string, string>()
let insightUnsub: (() => void) | null = null
let insightStatusUnsub: (() => void) | null = null

// hover 状态
const hoverCell = ref<{ date: string; hour: number; count: number; x: number; y: number } | null>(null)

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
    s.setDate(s.getDate() - 1)
  } else {
    s = new Date(startDate.value)
    e = new Date(endDate.value)
  }
  s.setHours(0, 0, 0, 0)
  e.setHours(23, 59, 59, 999)
  cells.value = await safeCall(
    () => window.api.heatmap.list({ startDate: s.toISOString(), endDate: e.toISOString() }),
    [] as HeatCell[]
  )
  loading.value = false
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
        toast.success('AI 洞察完成')
      }
    } else if (data.status === 'failed') {
      insightLoading.value = false
      insightText.value = '生成失败：' + (data.error ?? '未知错误')
      toast.error('洞察生成失败')
    }
  })
  try {
    await safeCall(() => window.api.ai.generateInsight({ type: 'heatmap', data: cells.value }), null)
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
  toast.info('正在重新生成洞察…')
}

watch(showRecentOnly, () => load())

// ============ 数据结构：按小时 × 日期 分组 ============
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// 找出所有出现过的日期（按升序）
const dates = computed(() => {
  const set = new Set<string>()
  for (const c of cells.value) set.add(c.date)
  return Array.from(set).sort()
})

// 24h × date 矩阵
const matrix = computed(() => {
  const m: Record<string, number[]> = {}
  for (const d of dates.value) m[d] = new Array(24).fill(0)
  for (const c of cells.value) {
    if (m[c.date]) m[c.date][c.hour] = c.count
  }
  return m
})

// 单格计数最大值（用于归一化色阶）
const maxCount = computed(() => {
  let m = 0
  for (const c of cells.value) if (c.count > m) m = c.count
  return m
})

// 总记录 / 活跃时段 / 峰值
const totalRecords = computed(() => cells.value.reduce((s, c) => s + c.count, 0))
const activeHours = computed(() => new Set(cells.value.filter(c => c.count > 0).map(c => c.hour)).size)

// 按小时汇总（用于最热时段）
const hourTotals = computed(() => {
  const arr = new Array(24).fill(0)
  for (const c of cells.value) arr[c.hour] += c.count
  return arr
})

// Top 5 最热时段
const topHours = computed(() => {
  return hourTotals.value
    .map((v, h) => ({ hour: h, count: v }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

// 按日汇总（用于底部柱图）
const dailyTotals = computed(() => {
  return dates.value.map(d => ({
    date: d,
    count: (matrix.value[d] || []).reduce((s, v) => s + v, 0)
  }))
})

const weekLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function weekOf(dateStr: string): string {
  return weekLabels[new Date(dateStr).getDay()]
}
function shortDate(dateStr: string): string {
  return dateStr.slice(5) // MM-DD
}

// ============ GitHub 风格 5 级色阶 ============
// 0=空, 1=极浅, 2=浅, 3=中, 4=深, 5=极深（柑橘亮为主色）
const HEAT_LEVELS = [0, 1, 2, 3, 4, 5]

function level(count: number): number {
  if (count === 0 || maxCount.value === 0) return 0
  const r = count / maxCount.value
  if (r < 0.16) return 1
  if (r < 0.33) return 2
  if (r < 0.55) return 3
  if (r < 0.78) return 4
  return 5
}

const levelColors: Record<number, string> = {
  0: 'hsl(36 22% 92%)',      // 空：极浅灰
  1: 'hsl(27 92% 90%)',      // 极浅：浅柑橘
  2: 'hsl(27 92% 75%)',      // 浅
  3: 'hsl(27 92% 60%)',      // 中
  4: 'hsl(27 92% 50%)',      // 深
  5: 'hsl(27 80% 38%)'       // 极深
}
function cellColor(count: number): string {
  return levelColors[level(count)]
}

// ============ hover 详情卡 ============
function onCellEnter(e: MouseEvent, date: string, hour: number, count: number) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  hoverCell.value = {
    date,
    hour,
    count,
    x: rect.left + rect.width / 2,
    y: rect.top
  }
}
function onCellLeave() {
  hoverCell.value = null
}

// ============ 工具函数 ============
function fmtHour(h: number): string {
  return h.toString().padStart(2, '0') + ':00'
}
function dayNameOf(dateStr: string): string {
  return weekOf(dateStr)
}

onMounted(() => {
  initRange()
  load()
})

onUnmounted(() => {
  insightUnsub?.()
  insightStatusUnsub?.()
})
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto w-full h-full overflow-y-auto min-h-0">
    <!-- 标题行 -->
    <div class="mb-4">
      <h1 class="font-display text-[26px] font-bold tracking-tight flex items-center gap-2">
        <Flame class="w-6 h-6" style="color: hsl(27 92% 50%)" />
        时段热力图
      </h1>
      <p class="text-xs text-muted-foreground mt-1.5">每个方格代表某日某小时的工作记录数，颜色越深 = 越活跃</p>
    </div>

    <!-- 时间范围选择卡片（与其他页面保持统一） -->
    <div class="card p-4 mb-5">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-[11.5px] font-mono uppercase tracking-wider text-muted-foreground">日期范围</span>
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" v-model="showRecentOnly" class="rounded accent-primary" />
          仅显示前两日
        </label>
        <q-input
          v-model="startDate"
          outlined
          dense
          mask="####-##-##"
          class="date-input"
          :disable="showRecentOnly"
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="startDate" mask="YYYY-MM-DD" minimal @update:model-value="load" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <span class="text-xs text-muted-foreground">至</span>
        <q-input
          v-model="endDate"
          outlined
          dense
          mask="####-##-##"
          class="date-input"
          :disable="showRecentOnly"
        >
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="endDate" mask="YYYY-MM-DD" minimal @update:model-value="load" />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <button
          v-if="!showRecentOnly"
          class="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors"
          @click="initRange(); load()"
        >重置</button>
      </div>
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground py-16 justify-center">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <!-- 空数据 -->
    <div v-else-if="dates.length === 0" class="card p-12 text-center text-muted-foreground">
      <Activity class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>所选范围内没有数据</p>
    </div>

    <!-- 主体：左大图 + 右统计 -->
    <div v-else class="grid grid-cols-12 gap-5">
      <!-- 左：主热力图 -->
      <div class="col-span-12 xl:col-span-9 space-y-4">
        <div class="card p-5 relative">
          <!-- 头部统计 mini -->
          <div class="flex items-center gap-5 mb-4 pb-4 border-b">
            <div>
              <div class="text-[10.5px] text-muted-foreground font-mono uppercase tracking-wider">总记录</div>
              <div class="font-display text-2xl font-bold leading-tight mt-0.5">{{ totalRecords }}</div>
            </div>
            <div class="w-px h-8 bg-border"></div>
            <div>
              <div class="text-[10.5px] text-muted-foreground font-mono uppercase tracking-wider">活跃小时</div>
              <div class="font-display text-2xl font-bold leading-tight mt-0.5">
                {{ activeHours }} <span class="text-sm font-normal text-muted-foreground">/ 24</span>
              </div>
            </div>
            <div class="w-px h-8 bg-border"></div>
            <div>
              <div class="text-[10.5px] text-muted-foreground font-mono uppercase tracking-wider">单格峰值</div>
              <div class="font-display text-2xl font-bold leading-tight mt-0.5">
                {{ maxCount }} <span class="text-sm font-normal text-muted-foreground">条</span>
              </div>
            </div>
            <div class="ml-auto flex items-center gap-2 text-[10.5px] text-muted-foreground">
              <span>少</span>
              <div v-for="lv in HEAT_LEVELS" :key="lv" class="w-3 h-3 rounded-[3px] transition-transform hover:scale-125" :style="{ backgroundColor: levelColors[lv] }"></div>
              <span>多</span>
            </div>
          </div>

          <!-- GitHub 风格矩阵：列=日期(7列足够) 行=小时(24行) -->
          <div class="overflow-x-auto -mx-2 px-2">
            <div class="min-w-[640px]">
              <!-- 顶部日期头 -->
              <div class="flex items-end mb-1.5 pl-12 gap-0.5">
                <div
                  v-for="d in dates"
                  :key="d"
                  class="flex-1 text-center"
                >
                  <div class="text-[10px] font-mono text-muted-foreground">{{ shortDate(d) }}</div>
                  <div class="text-[10.5px] font-medium" :class="dayNameOf(d) === '周六' || dayNameOf(d) === '周日' ? 'text-foreground/70' : 'text-foreground'">
                    {{ dayNameOf(d) }}
                  </div>
                </div>
              </div>

              <!-- 24 行 × 7+ 列 矩阵 -->
              <div
                v-for="h in HOURS"
                :key="h"
                class="flex items-center gap-0.5 mb-[3px] group"
              >
                <!-- 小时标签 -->
                <div class="w-12 flex-shrink-0 text-[10px] font-mono text-muted-foreground text-right pr-2 tabular-nums">
                  {{ fmtHour(h) }}
                </div>
                <!-- 每天一格 -->
                <div
                  v-for="d in dates"
                  :key="d"
                  class="flex-1 aspect-square max-h-[26px] rounded-[4px] cursor-pointer relative ya-heat-cell"
                  :style="{ backgroundColor: cellColor(matrix[d][h]) }"
                  :class="matrix[d][h] > 0 ? 'ya-heat-active' : ''"
                  @mouseenter="onCellEnter($event, d, h, matrix[d][h])"
                  @mouseleave="onCellLeave"
                ></div>
              </div>
            </div>
          </div>

          <!-- hover 浮动详情 -->
          <transition name="ya-tip">
            <div
              v-if="hoverCell"
              class="ya-heat-tip"
              :style="{ left: hoverCell.x + 'px', top: hoverCell.y + 'px' }"
            >
              <div class="font-medium text-foreground">{{ hoverCell.count }} 条记录</div>
              <div class="text-[10.5px] text-muted-foreground mt-0.5">
                {{ hoverCell.date }} · {{ fmtHour(hoverCell.hour) }}
              </div>
            </div>
          </transition>
        </div>

        <!-- 日总量柱图（横向条形） -->
        <div class="card p-4">
          <div class="flex items-center gap-2 text-sm font-medium mb-3">
            <BarChart3 class="w-4 h-4 text-primary" />
            每日工作总量
            <span class="text-[10.5px] text-muted-foreground font-mono ml-1">条/日</span>
          </div>
          <div class="space-y-2">
            <div
              v-for="d in dailyTotals"
              :key="d.date"
              class="flex items-center gap-3"
            >
              <div class="w-16 text-[11px] text-muted-foreground font-mono shrink-0">
                {{ shortDate(d.date) }} · <span class="text-foreground/70">{{ dayNameOf(d.date) }}</span>
              </div>
              <div class="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden relative">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :style="{
                    width: maxCount === 0 ? '0%' : Math.max(8, (d.count / maxCount) * 100) + '%',
                    background: 'linear-gradient(90deg, hsl(27 92% 75%), hsl(27 92% 50%))'
                  }"
                ></div>
                <div class="absolute inset-0 flex items-center pl-2 text-[10.5px] font-mono font-semibold" style="color: hsl(27 80% 28%)">
                  {{ d.count }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI 洞察 -->
        <div class="card p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles class="w-4 h-4 text-primary" />
              AI 洞察
            </div>
            <button
              class="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 disabled:opacity-50 transition-colors"
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
      </div>

      <!-- 右：侧栏统计 -->
      <div class="col-span-12 xl:col-span-3 space-y-4">
        <!-- Top 5 最热时段 -->
        <div class="card p-4">
          <div class="flex items-center gap-1.5 text-sm font-medium mb-3">
            <Flame class="w-4 h-4" style="color: hsl(16 70% 50%)" />
            最热时段 Top 5
          </div>
          <div v-if="topHours.length === 0" class="text-xs text-muted-foreground text-center py-6">
            暂无数据
          </div>
          <div v-else class="space-y-2.5">
            <div
              v-for="(h, idx) in topHours"
              :key="h.hour"
              class="flex items-center gap-2.5"
            >
              <div
                class="w-6 h-6 rounded-md flex items-center justify-center text-[10.5px] font-bold font-mono shrink-0"
                :style="idx === 0
                  ? { background: 'linear-gradient(135deg, hsl(27 92% 65%), hsl(16 70% 55%))', color: 'white' }
                  : { background: 'hsl(36 24% 92%)', color: 'hsl(30 11% 30%)' }"
              >{{ idx + 1 }}</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1.5">
                  <Clock class="w-3 h-3 text-muted-foreground" />
                  <span class="text-sm font-mono font-semibold">{{ fmtHour(h.hour) }}</span>
                  <span class="text-[10.5px] text-muted-foreground ml-auto">{{ h.count }} 条</span>
                </div>
                <div class="h-1 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :style="{
                      width: (h.count / topHours[0].count) * 100 + '%',
                      background: idx === 0
                        ? 'linear-gradient(90deg, hsl(27 92% 65%), hsl(16 70% 55%))'
                        : 'hsl(27 92% 60%)'
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 时段分布圆环 -->
        <div class="card p-4">
          <div class="text-sm font-medium mb-3">时段分布</div>
          <div class="space-y-2 text-xs">
            <div v-for="(seg, idx) in [
              { label: '清晨 05-09', range: [5, 6, 7, 8] },
              { label: '上午 09-12', range: [9, 10, 11] },
              { label: '午间 12-14', range: [12, 13] },
              { label: '下午 14-18', range: [14, 15, 16, 17] },
              { label: '晚上 18-23', range: [18, 19, 20, 21, 22] },
              { label: '深夜 23-05', range: [23, 0, 1, 2, 3, 4] }
            ]" :key="idx" class="flex items-center gap-2">
              <div
                class="w-2.5 h-2.5 rounded-sm shrink-0"
                :style="{ backgroundColor: ['hsl(165 21% 60%)', 'hsl(27 92% 65%)', 'hsl(38 92% 60%)', 'hsl(27 80% 50%)', 'hsl(16 70% 55%)', 'hsl(204 30% 50%)'][idx] }"
              ></div>
              <span class="flex-1 text-muted-foreground">{{ seg.label }}</span>
              <span class="font-mono font-semibold text-foreground tabular-nums">
                {{ seg.range.reduce((s, h) => s + hourTotals[h], 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 摘要 -->
        <div class="card p-4 text-xs text-muted-foreground leading-relaxed">
          <div class="font-medium text-foreground mb-1.5">📊 数据说明</div>
          颜色深度 = 该小时记录数 / 最大记录数。<br />
          浅色 = 低活跃，柑橘亮 = 高活跃。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* GitHub 风格 cell 微动效 */
.ya-heat-cell {
  transition: transform .15s var(--ease-spring), box-shadow .2s ease, outline-color .2s ease;
  outline: 1px solid transparent;
  outline-offset: 1px;
}
.ya-heat-cell.ya-heat-active:hover {
  transform: scale(1.35);
  box-shadow: 0 2px 8px hsl(27 92% 50% / 0.35);
  outline-color: hsl(27 92% 50% / 0.6);
  z-index: 5;
  position: relative;
}

/* hover 详情卡 */
.ya-heat-tip {
  position: fixed;
  transform: translate(-50%, calc(-100% - 10px));
  background: hsl(30 11% 12%);
  color: hsl(36 38% 96%);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 8px 20px hsl(0 0% 0% / 0.25);
  white-space: nowrap;
}
.ya-heat-tip::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -4px;
  transform: translateX(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: hsl(30 11% 12%);
}

.ya-tip-enter-active, .ya-tip-leave-active {
  transition: opacity .15s ease, transform .15s var(--ease-spring);
}
.ya-tip-enter-from, .ya-tip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 4px));
}
</style>
