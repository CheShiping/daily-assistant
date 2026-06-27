<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { today, formatDate, relativeTime } from '@/lib/utils'
import type { Report, WorkRecord } from '@/types'
import { FileText, ListChecks, Sparkles, Play, Square, Settings, Clock, Activity, BarChart3, ArrowRight } from 'lucide-vue-next'

const router = useRouter()
const todayRecords = ref<WorkRecord[]>([])
const recentReports = ref<Report[]>([])
const screenshotRunning = ref(false)
const settingsReady = ref(false)
const heatCells = ref<Array<{ date: string; hour: number; count: number }>>([])
const appUsageItems = ref<Array<{ appName: string; durationMinutes: number; count: number }>>([])

const weekLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 热力图网格：按日期分组
const heatGrid = computed(() => {
  const map = new Map<string, number[]>()
  for (const c of heatCells.value) {
    if (!map.has(c.date)) map.set(c.date, new Array(24).fill(0))
    map.get(c.date)![c.hour] = c.count
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const heatMax = computed(() => {
  let m = 0
  for (const c of heatCells.value) if (c.count > m) m = c.count
  return m
})

function heatColor(count: number): string {
  if (count === 0) return 'hsl(var(--muted))'
  const ratio = heatMax.value === 0 ? 0 : count / heatMax.value
  if (ratio < 0.25) return 'hsl(142 60% 75%)'
  if (ratio < 0.5) return 'hsl(142 65% 60%)'
  if (ratio < 0.75) return 'hsl(142 71% 48%)'
  return 'hsl(142 71% 38%)'
}

const usageMax = computed(() => appUsageItems.value.length > 0 ? appUsageItems.value[0].durationMinutes : 0)

function usageWidth(min: number): string {
  if (usageMax.value === 0) return '0%'
  return Math.max(2, (min / usageMax.value) * 100) + '%'
}

const usageColors = ['hsl(142 71% 45%)', 'hsl(142 60% 55%)', 'hsl(142 50% 38%)', 'hsl(142 65% 65%)', 'hsl(142 40% 30%)']
function usageColor(i: number) { return usageColors[i % usageColors.length] }

function formatDuration(min: number): string {
  if (min < 60) return `${min} 分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} 小时` : `${h}h${m}m`
}

async function load() {
  // 最近 7 天热力图
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  const [records, reports, status, settings, heat, usage] = await Promise.all([
    window.api.workRecords.list({ date: today(), limit: 500 }),
    window.api.reports.list({ limit: 5 }),
    window.api.screenshots.status(),
    window.api.settings.get(),
    window.api.heatmap.list({ startDate: start.toISOString(), endDate: end.toISOString() }),
    window.api.appUsage.list({ startDate: start.toISOString(), endDate: end.toISOString() })
  ])
  todayRecords.value = records
  recentReports.value = reports
  screenshotRunning.value = status.running
  settingsReady.value = !!settings.apiKey
  heatCells.value = heat
  appUsageItems.value = usage.slice(0, 5)  // 取前 5 个分类
}

async function toggleScreenshot() {
  if (screenshotRunning.value) await window.api.screenshots.stop()
  else await window.api.screenshots.start()
  const s = await window.api.screenshots.status()
  screenshotRunning.value = s.running
}

onMounted(load)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-1">概览</h1>
    <p class="text-sm text-muted-foreground mb-6">{{ formatDate(new Date()) }} · 牙牙乐日报助手</p>

    <div v-if="!settingsReady" class="card p-5 mb-6 border-amber-300 bg-amber-50">
      <div class="flex items-start gap-3">
        <Settings class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-medium text-amber-900">尚未配置 API Key</div>
          <p class="text-sm text-amber-700 mt-1">请先前往设置页配置你的 OpenAI 兼容 API Key 和模型，才能使用 AI 功能。</p>
          <button class="btn-primary btn-sm mt-3" @click="router.push('/settings')">前往设置</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">今日记录</div>
            <div class="text-3xl font-bold mt-1">{{ todayRecords.length }}</div>
          </div>
          <div class="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center">
            <ListChecks class="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">最近报告</div>
            <div class="text-3xl font-bold mt-1">{{ recentReports.length }}</div>
          </div>
          <div class="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
            <FileText class="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-muted-foreground">自动记录</div>
            <div class="text-3xl font-bold mt-1 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" :class="screenshotRunning ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'"></span>
              {{ screenshotRunning ? '运行中' : '已停止' }}
            </div>
          </div>
          <button class="btn-ghost btn-icon" @click="toggleScreenshot">
            <Square v-if="screenshotRunning" class="w-5 h-5 text-destructive" />
            <Play v-else class="w-5 h-5 text-green-600" />
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <button class="card p-5 text-left hover:shadow-md transition-shadow" @click="router.push('/reports')">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles class="w-5 h-5 text-primary" />
          </div>
          <div>
            <div class="font-medium">生成日报</div>
            <div class="text-sm text-muted-foreground">基于今日工作记录 AI 生成日报</div>
          </div>
        </div>
      </button>

      <button class="card p-5 text-left hover:shadow-md transition-shadow" @click="router.push('/records')">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Clock class="w-5 h-5 text-primary" />
          </div>
          <div>
            <div class="font-medium">查看今日记录</div>
            <div class="text-sm text-muted-foreground">{{ todayRecords.length }} 条工作记录</div>
          </div>
        </div>
      </button>
    </div>

    <!-- 最近 7 天热力图 + 分类时长 -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold flex items-center gap-2">
            <Activity class="w-4 h-4 text-primary" />
            近 7 天热力图
          </h2>
          <button class="btn-ghost btn-sm" @click="router.push('/heatmap')">
            详情 <ArrowRight class="w-3 h-3" />
          </button>
        </div>
        <div v-if="heatGrid.length === 0" class="text-sm text-muted-foreground py-6 text-center">
          暂无数据
        </div>
        <div v-else class="space-y-1">
          <div v-for="[date, counts] in heatGrid" :key="date" class="flex items-center gap-0.5">
            <div class="w-10 flex-shrink-0 text-[10px] text-muted-foreground font-mono">
              {{ date.slice(5) }} {{ weekLabels[new Date(date).getDay()] }}
            </div>
            <div class="flex-1 flex items-center gap-0.5">
              <div
                v-for="(c, h) in counts"
                :key="h"
                class="flex-1 h-4 rounded-sm"
                :style="{ backgroundColor: heatColor(c) }"
                :title="`${date} ${h.toString().padStart(2, '0')}:00 - ${c} 条`"
              ></div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
            <span>少</span>
            <div class="w-3 h-3 rounded-sm" style="background-color: hsl(var(--muted))"></div>
            <div class="w-3 h-3 rounded-sm" style="background-color: hsl(142 60% 75%)"></div>
            <div class="w-3 h-3 rounded-sm" style="background-color: hsl(142 65% 60%)"></div>
            <div class="w-3 h-3 rounded-sm" style="background-color: hsl(142 71% 48%)"></div>
            <div class="w-3 h-3 rounded-sm" style="background-color: hsl(142 71% 38%)"></div>
            <span>多</span>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-primary" />
            分类时长
          </h2>
          <button class="btn-ghost btn-sm" @click="router.push('/app-usage')">
            详情 <ArrowRight class="w-3 h-3" />
          </button>
        </div>
        <div v-if="appUsageItems.length === 0" class="text-sm text-muted-foreground py-6 text-center">
          暂无数据
        </div>
        <div v-else class="space-y-3">
          <div v-for="(item, idx) in appUsageItems" :key="item.appName">
            <div class="flex items-center justify-between mb-1 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-sm" :style="{ backgroundColor: usageColor(idx) }"></span>
                <span class="font-medium">{{ item.appName }}</span>
              </div>
              <span class="text-muted-foreground font-mono">{{ formatDuration(item.durationMinutes) }}</span>
            </div>
            <div class="h-2 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :style="{ width: usageWidth(item.durationMinutes), backgroundColor: usageColor(idx) }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold">今日记录</h2>
        <button class="btn-ghost btn-sm" @click="router.push('/records')">查看全部</button>
      </div>
      <div v-if="todayRecords.length === 0" class="text-sm text-muted-foreground py-6 text-center">
        今天还没有工作记录
      </div>
      <div v-else class="space-y-1.5">
        <div v-for="r in todayRecords.slice(-5).reverse()" :key="r.id" class="flex items-start gap-3 text-sm">
          <span class="text-xs text-muted-foreground font-mono w-12 flex-shrink-0">
            {{ new Date(r.startedAt).toTimeString().slice(0, 5) }}
          </span>
          <span class="flex-1">{{ r.summary }}</span>
          <span v-if="r.category" class="text-xs px-1.5 py-0.5 rounded bg-muted">{{ r.category }}</span>
        </div>
      </div>
    </div>

    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold">最近报告</h2>
        <button class="btn-ghost btn-sm" @click="router.push('/reports')">查看全部</button>
      </div>
      <div v-if="recentReports.length === 0" class="text-sm text-muted-foreground py-6 text-center">
        还没有生成过报告
      </div>
      <div v-else class="space-y-1.5">
        <div
          v-for="r in recentReports"
          :key="r.id"
          class="flex items-center gap-3 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1.5 -mx-2"
          @click="router.push('/reports')"
        >
          <FileText class="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span class="flex-1 truncate">{{ r.title }}</span>
          <span class="text-xs text-muted-foreground">{{ relativeTime(r.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
