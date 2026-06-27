<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Check, BarChart3, Clock, Monitor, Play, Square } from 'lucide-vue-next'
import { today, formatDate } from '@/lib/utils'
import type { WorkRecord } from '@/types'

// 轮播标语
const slogans = [
  { title: '你只管工作，日报交给我', subtitle: '静默记录工作轨迹，AI 帮你写好每一份日报、周报、月报。不再为写汇报发愁。' },
  { title: '专注工作本身，汇报交给 AI', subtitle: '自动捕捉屏幕内容，智能生成日报周报，让你告别加班写总结。' },
  { title: '每一刻努力，都被看见', subtitle: '无痕记录工作过程，AI 提炼关键成果，让付出不再被忽略。' },
  { title: '让记录自然发生', subtitle: '后台静默工作，不打扰你的专注，需要时一键生成报告。' },
  { title: '写报告，从不是难事', subtitle: 'AI 深度理解工作内容，结构化输出专业日报，省时省力。' },
  { title: '数据在手，心中有数', subtitle: '可视化工作时长与节奏，帮你更好地规划每一天。' },
  { title: '你的工作助手', subtitle: '从记录到生成，从分析到总结，全方位提升工作效率。' },
  { title: '汇报，一键搞定', subtitle: '选择模板，AI 即刻生成专业报告，再也不用为写日报发愁。' },
  { title: '时间看得见', subtitle: '自动追踪工作轨迹，让每一分钟的努力都有迹可循。' },
  { title: '更懂你的日报', subtitle: '基于历史记录学习，AI 生成的报告越来越贴合你的风格。' },
]
const sloganIndex = ref(0)
let sloganTimer: ReturnType<typeof setInterval> | null = null

// 数据
const loading = ref(true)
const records = ref<WorkRecord[]>([]) // 今日
const yesterdayRecords = ref<WorkRecord[]>([])
const dayBeforeRecords = ref<WorkRecord[]>([])
const displays = ref<Array<{ id: number; label: string; x: number; y: number; width: number; height: number; scaleFactor: number; isPrimary: boolean }>>([])
const screenshotRunning = ref(false)

const showPrevDays = ref(false)

const todayStr = today()
const yesterdayStr = formatDate(new Date(Date.now() - 86400000))
const dayBeforeStr = formatDate(new Date(Date.now() - 2 * 86400000))

// 专注时长（小时）
const focusHours = computed(() => {
  let ms = 0
  for (const r of records.value) {
    if (r.endedAt) {
      const dur = new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()
      if (dur > 0) ms += dur
    } else {
      ms += 5 * 60000 // 无结束时间默认 5 分钟
    }
  }
  return (ms / 3600000).toFixed(1)
})

// 主要工作分类
const topCategory = computed(() => {
  const counts = new Map<string, number>()
  for (const r of records.value) {
    if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }
  let best = '—'
  let max = 0
  for (const [cat, n] of counts) {
    if (n > max) { max = n; best = cat }
  }
  return best
})

// 24 小时计数
function hourCounts(list: WorkRecord[]): number[] {
  const arr = new Array(24).fill(0)
  for (const r of list) arr[new Date(r.startedAt).getHours()]++
  return arr
}
const todayCounts = computed(() => hourCounts(records.value))
const yesterdayCounts = computed(() => hourCounts(yesterdayRecords.value))
const dayBeforeCounts = computed(() => hourCounts(dayBeforeRecords.value))

const maxCount = computed(() => {
  let m = 0
  for (const c of todayCounts.value) if (c > m) m = c
  if (showPrevDays.value) {
    for (const c of yesterdayCounts.value) if (c > m) m = c
    for (const c of dayBeforeCounts.value) if (c > m) m = c
  }
  return m
})

function barHeight(count: number): number {
  if (count === 0) return 8
  if (maxCount.value === 0) return 8
  return Math.max(15, (count / maxCount.value) * 100)
}

function barColor(count: number): string {
  if (count === 0) return 'rgba(0,0,0,0.05)'
  const ratio = maxCount.value === 0 ? 0 : count / maxCount.value
  if (ratio < 0.2) return 'hsl(var(--primary) / 0.2)'
  if (ratio < 0.4) return 'hsl(var(--primary) / 0.4)'
  if (ratio < 0.6) return 'hsl(var(--primary) / 0.6)'
  if (ratio < 0.8) return 'hsl(var(--primary) / 0.8)'
  return 'hsl(var(--primary))'
}

async function load() {
  loading.value = true
  try {
    const start = new Date()
    start.setDate(start.getDate() - 2)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const [all, dps, status] = await Promise.all([
      window.api.workRecords.list({ startDate: start.toISOString(), endDate: end.toISOString() }),
      window.api.system.displays(),
      window.api.screenshots.status(),
    ])
    records.value = all.filter(r => formatDate(r.startedAt) === todayStr)
    yesterdayRecords.value = all.filter(r => formatDate(r.startedAt) === yesterdayStr)
    dayBeforeRecords.value = all.filter(r => formatDate(r.startedAt) === dayBeforeStr)
    displays.value = dps
    screenshotRunning.value = status.running
  } finally {
    loading.value = false
  }
}

async function toggleScreenshot() {
  if (screenshotRunning.value) await window.api.screenshots.stop()
  else await window.api.screenshots.start()
  const s = await window.api.screenshots.status()
  screenshotRunning.value = s.running
}

onMounted(() => {
  load()
  sloganTimer = setInterval(() => {
    sloganIndex.value = (sloganIndex.value + 1) % slogans.length
  }, 5000)
})

onUnmounted(() => {
  if (sloganTimer) clearInterval(sloganTimer)
})
</script>

<template>
  <div class="flex flex-col gap-5 p-6 px-7">
    <!-- 1. Hero 区 -->
    <div class="rounded-[10px] bg-gradient-to-br from-primary/5 to-transparent p-5 px-[18px] flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        <Check class="w-6 h-6" />
      </div>
      <div class="flex-1 min-w-0">
        <h2 class="text-xl font-bold">{{ slogans[sloganIndex].title }}</h2>
        <p class="text-xs text-[#999] mt-1">{{ slogans[sloganIndex].subtitle }}</p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 flex items-center gap-1">
            <Check class="w-3 h-3" /> 截图分析后即刻销毁
          </span>
          <span class="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 flex items-center gap-1">
            <Check class="w-3 h-3" /> 数据仅存本地，不上传云端
          </span>
          <span class="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 flex items-center gap-1">
            <Check class="w-3 h-3" /> 你的工作内容只属于你
          </span>
        </div>
      </div>
      <button
        class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
        :class="screenshotRunning ? 'bg-primary/10 text-primary' : 'bg-black/5 text-[#999]'"
        @click="toggleScreenshot"
      >
        <Square v-if="screenshotRunning" class="w-3 h-3" />
        <Play v-else class="w-3 h-3" />
        {{ screenshotRunning ? '记录中' : '已暂停' }}
      </button>
    </div>

    <!-- 2. 工作概览 -->
    <section class="rounded-[10px] bg-black/[0.02] p-5 px-[18px]">
      <div class="flex items-center gap-2 mb-4">
        <BarChart3 :size="14" :stroke-width="1.5" class="text-[#999]" />
        <h2 class="text-xs font-semibold text-foreground">工作概览</h2>
      </div>
      <div v-if="loading" class="py-4 text-center text-xs text-[#999]">正在读取今日工作记录...</div>
      <div v-else-if="records.length === 0" class="py-4">
        <p class="text-sm text-[#555]">今天还没有工作记录</p>
        <p class="text-xs text-[#999] mt-1">软件已在后台自动截图记录，开始工作后稍等片刻即可看到记录</p>
      </div>
      <div v-else>
        <div class="flex gap-7 mb-4">
          <div class="flex flex-col gap-[3px]">
            <span class="text-lg font-semibold leading-tight">{{ records.length }}</span>
            <span class="text-xs text-[#999] leading-none">记录条数</span>
          </div>
          <div class="flex flex-col gap-[3px]">
            <span class="text-lg font-semibold leading-tight">{{ focusHours }}h</span>
            <span class="text-xs text-[#999] leading-none">专注时长</span>
          </div>
          <div class="flex flex-col gap-[3px]">
            <span class="text-lg font-semibold leading-tight">{{ topCategory }}</span>
            <span class="text-xs text-[#999] leading-none">主要工作</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. 时段记录 -->
    <section class="rounded-[10px] bg-black/[0.02] p-5 px-[18px]">
      <div class="flex items-center gap-2 mb-4">
        <Clock :size="14" :stroke-width="1.5" class="text-[#999]" />
        <h2 class="text-xs font-semibold text-foreground">时段记录</h2>
        <label class="ml-auto flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" v-model="showPrevDays" class="size-3.5" />
          <span class="text-xs text-[#999] leading-none">展示前两日时段热力</span>
        </label>
      </div>
      <!-- 24 格条带 -->
      <div class="flex items-end gap-0.5 h-14 mb-2">
        <div v-for="h in 24" :key="h" class="relative flex-1 h-full">
          <div
            v-if="showPrevDays"
            class="absolute inset-x-0 bottom-0 rounded-sm transition-all"
            :style="{ height: barHeight(dayBeforeCounts[h - 1]) + '%', background: barColor(dayBeforeCounts[h - 1]), opacity: 0.35 }"
            :title="`前天 ${h - 1}:00 — ${dayBeforeCounts[h - 1]} 条`"
          ></div>
          <div
            v-if="showPrevDays"
            class="absolute inset-x-0 bottom-0 rounded-sm transition-all"
            :style="{ height: barHeight(yesterdayCounts[h - 1]) + '%', background: barColor(yesterdayCounts[h - 1]), opacity: 0.6 }"
            :title="`昨天 ${h - 1}:00 — ${yesterdayCounts[h - 1]} 条`"
          ></div>
          <div
            class="absolute inset-x-0 bottom-0 rounded-sm transition-all"
            :style="{ height: barHeight(todayCounts[h - 1]) + '%', background: barColor(todayCounts[h - 1]) }"
            :title="`${h - 1}:00 — ${todayCounts[h - 1]} 条记录`"
          ></div>
        </div>
      </div>
      <div class="flex justify-between text-xs text-[#bbb] mb-2">
        <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
      </div>
      <div class="flex items-center gap-1 text-xs text-[#999]">
        <span>少</span>
        <div class="w-3 h-3 rounded-sm bg-primary/20"></div>
        <div class="w-3 h-3 rounded-sm bg-primary/40"></div>
        <div class="w-3 h-3 rounded-sm bg-primary/60"></div>
        <div class="w-3 h-3 rounded-sm bg-primary/80"></div>
        <div class="w-3 h-3 rounded-sm bg-primary"></div>
        <span>多</span>
      </div>
    </section>

    <!-- 4. 已连接显示器 -->
    <section class="rounded-[10px] bg-black/[0.02] p-5 px-[18px]">
      <div class="flex items-center gap-2 mb-4">
        <Monitor :size="14" :stroke-width="1.5" class="text-[#999]" />
        <h2 class="text-xs font-semibold text-foreground">已连接显示器</h2>
        <span class="text-xs text-[#999] ml-1">{{ displays.length }} 台</span>
      </div>
      <div class="space-y-2">
        <div v-for="d in displays" :key="d.id" class="flex items-center gap-3 p-3 rounded-md bg-black/[0.02]">
          <div class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Monitor class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium flex items-center gap-2">
              {{ d.label }}
              <span v-if="d.isPrimary" class="text-[10px] px-1.5 py-px rounded bg-primary/10 text-primary">主显示器</span>
            </div>
            <div class="text-xs text-[#999] mt-0.5">{{ d.width }}×{{ d.height }} · {{ d.scaleFactor }}x · 坐标 {{ d.x }}, {{ d.y }}</div>
          </div>
        </div>
        <div v-if="displays.length === 0" class="text-sm text-[#999] text-center py-4">
          暂无显示器信息
        </div>
      </div>
    </section>
  </div>
</template>
