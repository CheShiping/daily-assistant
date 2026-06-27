<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Loader2, Sparkles, Bot, Plus, Edit3, Trash2, Check, X,
  Pencil, MessageSquare, Calendar, Layers, Filter
} from 'lucide-vue-next'
import { today, formatDate, formatTime, safeCall, isApiReady } from '@/lib/utils'
import type { WorkRecord } from '@/types'
import { toast } from '@/lib/toast'

const router = useRouter()

const startDate = ref(today())
const endDate = ref(today())
const records = ref<WorkRecord[]>([])
const loading = ref(false)
const query = ref('')
const showCategoryFilter = ref(false)   // 分类多选面板

// ============ 分类多选 ============
const allCategories = ['开发', '会议', '文档', '沟通', '设计', '学习', '其他']
const selectedCats = ref<string[]>([...allCategories])

const categoryStats = computed(() => {
  const m = new Map<string, number>()
  for (const r of records.value) {
    const c = r.category ?? '其他'
    m.set(c, (m.get(c) ?? 0) + 1)
  }
  return m
})

const totalSelectedMinutes = computed(() => {
  let total = 0
  for (const r of records.value) {
    if (!selectedCats.value.includes(r.category ?? '其他')) continue
    const start = new Date(r.startedAt).getTime()
    const end = r.endedAt ? new Date(r.endedAt).getTime() : start
    total += Math.max(0, (end - start) / 60000)
  }
  return Math.round(total)
})

function toggleCategory(cat: string) {
  const i = selectedCats.value.indexOf(cat)
  if (i >= 0) selectedCats.value.splice(i, 1)
  else selectedCats.value.push(cat)
}

function selectAll() { selectedCats.value = [...allCategories] }
function selectNone() { selectedCats.value = [] }

// ============ 过滤 & 分组 ============
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return records.value.filter(r => {
    if (!selectedCats.value.includes(r.category ?? '其他')) return false
    if (q && !(r.summary ?? '').toLowerCase().includes(q)) return false
    return true
  })
})

// 按日 + 上下午 分组
const groupedByDate = computed(() => {
  const out: { date: string; items: WorkRecord[] }[] = []
  const map = new Map<string, WorkRecord[]>()
  for (const r of filtered.value) {
    const d = formatDate(r.startedAt)
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(r)
  }
  for (const [d, items] of [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    out.push({ date: d, items: items.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()) })
  }
  return out
})

// ============ 摘要 ============
const summary = computed(() => {
  const total = filtered.value.length
  let minutes = 0
  const byApp = new Map<string, number>()
  for (const r of filtered.value) {
    const start = new Date(r.startedAt).getTime()
    const end = r.endedAt ? new Date(r.endedAt).getTime() : start
    minutes += Math.max(0, (end - start) / 60000)
    const app = r.appName ?? '未知'
    byApp.set(app, (byApp.get(app) ?? 0) + Math.max(0, (end - start) / 60000))
  }
  const apps = [...byApp.entries()].sort((a, b) => b[1] - a[1])
  return {
    total,
    minutes: Math.round(minutes),
    hours: (minutes / 60).toFixed(1),
    topApps: apps.slice(0, 3).map(([n, m]) => ({ name: n, min: Math.round(m) }))
  }
})

// ============ 数据加载 ============
async function load() {
  loading.value = true
  try {
    const s = new Date(startDate.value)
    s.setHours(0, 0, 0, 0)
    const e = new Date(endDate.value)
    e.setHours(23, 59, 59, 999)
    const list = await safeCall(
      () => window.api.workRecords.list({ startDate: s.toISOString(), endDate: e.toISOString() }),
      [] as WorkRecord[]
    )
    records.value = list
  } finally {
    loading.value = false
  }
}

watch([startDate, endDate], load)

// 重置日期范围为今天
function resetRange() {
  startDate.value = today()
  endDate.value = today()
}

// ============ 编辑 & 删除 ============
const editingId = ref<string | null>(null)
const editText = ref('')

function startEdit(r: WorkRecord) {
  editingId.value = r.id
  editText.value = r.summary
}

async function saveEdit() {
  if (!editingId.value) return
  if (!isApiReady()) {
    const r = records.value.find(x => x.id === editingId.value)
    if (r) r.summary = editText.value
    editingId.value = null
    toast.info('已本地更新（dev 模式）')
    return
  }
  try {
    await window.api.workRecords.update({ id: editingId.value, summary: editText.value })
    editingId.value = null
    await load()
    toast.success('记录已更新')
  } catch (e: any) {
    toast.error('更新失败：' + (e?.message ?? '未知错误'))
  }
}

async function removeRecord(r: WorkRecord) {
  if (!confirm('删除这条工作记录？')) return
  if (!isApiReady()) {
    records.value = records.value.filter(x => x.id !== r.id)
    toast.info('已本地删除（dev 模式）')
    return
  }
  try {
    await window.api.workRecords.delete(r.id)
    await load()
    toast.success('记录已删除')
  } catch (e: any) {
    toast.error('删除失败：' + (e?.message ?? '未知错误'))
  }
}

function askAI(r: WorkRecord) {
  router.push({ path: '/agent', query: { q: `这条工作内容能告诉我什么？ ${r.summary}` } })
}

function gotoAdd() {
  router.push('/today')
}

function exportCsv() {
  if (filtered.value.length === 0) {
    toast.warning('没有可导出的记录')
    return
  }
  const lines = ['时间,分类,应用,内容,持续(分钟)']
  for (const r of filtered.value) {
    const start = new Date(r.startedAt)
    const end = r.endedAt ? new Date(r.endedAt) : start
    const min = Math.round((end.getTime() - start.getTime()) / 60000)
    const text = (r.summary ?? '').replace(/"/g, '""')
    lines.push(`${start.toISOString()},${r.category ?? ''},${r.appName ?? ''},"${text}",${min}`)
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `timeline-${startDate.value}_to_${endDate.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV 已导出')
}

function durationMin(r: WorkRecord): number {
  const start = new Date(r.startedAt).getTime()
  const end = r.endedAt ? new Date(r.endedAt).getTime() : start
  return Math.max(0, Math.round((end - start) / 60000))
}

function timeOf(r: WorkRecord) {
  return formatTime(r.startedAt)
}

function durationLabel(min: number) {
  if (min < 60) return `${min} 分`
  return `${Math.floor(min / 60)}时${min % 60}分`
}

function categoryColor(cat?: string) {
  const map: Record<string, string> = {
    '开发': 'hsl(204 70% 45%)',
    '会议': 'hsl(280 50% 50%)',
    '文档': 'hsl(165 21% 40%)',
    '沟通': 'hsl(27 92% 50%)',
    '设计': 'hsl(340 70% 50%)',
    '学习': 'hsl(170 50% 35%)',
    '其他': 'hsl(220 10% 50%)'
  }
  return map[cat ?? '其他'] ?? 'hsl(220 10% 50%)'
}

onMounted(load)
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto w-full h-full overflow-y-auto min-h-0">
    <!-- 标题区 -->
    <div class="flex items-end justify-between mb-5">
      <div>
        <h1 class="font-display text-[26px] font-bold tracking-tight">工作时间线</h1>
        <p class="text-xs text-muted-foreground mt-1">查看全天工作活动轨迹，了解时间都花在了哪里</p>
      </div>
    </div>

    <!-- 工具条 · 一行铺满 -->
    <div class="card p-3 mb-4 flex flex-wrap items-center gap-3">
      <!-- 日期范围（与 Heatmap 卡片风格统一：Quasar q-input + q-date） -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[11.5px] font-mono uppercase tracking-wider text-muted-foreground">日期范围</span>
        <q-input v-model="startDate" outlined dense mask="####-##-##" class="date-input">
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="startDate" mask="YYYY-MM-DD" minimal />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <span class="text-muted-foreground text-xs">至</span>
        <q-input v-model="endDate" outlined dense mask="####-##-##" class="date-input">
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="endDate" mask="YYYY-MM-DD" minimal />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <button
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
          @click="resetRange"
        >重置</button>
      </div>

      <span class="text-border">|</span>

      <!-- 分类多选触发器 -->
      <div class="relative">
        <button
          class="btn-outline btn-sm flex items-center gap-1.5"
          @click="showCategoryFilter = !showCategoryFilter"
        >
          <Filter class="w-3.5 h-3.5" />
          分类筛选
          <span class="text-[10.5px] font-mono text-muted-foreground">{{ selectedCats.length }}/{{ allCategories.length }}</span>
        </button>
        <transition name="ya-menu">
          <div
            v-if="showCategoryFilter"
            class="absolute left-0 top-10 z-20 card p-3 w-80"
            @click.stop
          >
            <div class="flex items-center justify-between mb-2">
              <div class="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">分类与时长</div>
              <div class="flex items-center gap-1">
                <button class="text-[11px] text-muted-foreground hover:text-foreground" @click="selectAll">全选</button>
                <span class="text-muted-foreground text-[10px]">·</span>
                <button class="text-[11px] text-muted-foreground hover:text-foreground" @click="selectNone">清空</button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <label
                v-for="c in allCategories"
                :key="c"
                class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 cursor-pointer"
              >
                <q-checkbox
                  class="ya-cb"
                  :model-value="selectedCats.includes(c)"
                  color="primary"
                  dense
                  @update:model-value="toggleCategory(c)"
                />
                <span class="w-2 h-2 rounded-full" :style="{ background: categoryColor(c) }"></span>
                <span class="flex-1">{{ c }}</span>
                <span class="text-[10.5px] text-muted-foreground font-mono">{{ categoryStats.get(c) ?? 0 }}</span>
              </label>
            </div>
            <div class="mt-2 pt-2 border-t text-[10.5px] text-muted-foreground flex items-center justify-between">
              <span>已选 {{ selectedCats.length }} 个分类</span>
              <span class="font-mono">共 {{ totalSelectedMinutes }} 分钟</span>
            </div>
          </div>
        </transition>
      </div>

      <div class="flex-1 min-w-[180px]">
        <input v-model="query" class="input h-9 text-sm" placeholder="搜索活动内容…" />
      </div>

      <button class="btn-outline btn-sm flex items-center gap-1.5" @click="exportCsv">
        <Layers class="w-3.5 h-3.5" /> 导出 CSV
      </button>
      <button class="btn-outline btn-sm flex items-center gap-1.5" @click="askAI(filtered[0] ?? { summary: '所有' } as any)">
        <Bot class="w-3.5 h-3.5" /> 与 AI 对话
      </button>
      <button class="btn-primary btn-sm flex items-center gap-1.5" @click="gotoAdd">
        <Plus class="w-3.5 h-3.5" /> 添加记录
      </button>
    </div>

    <!-- 摘要三联卡 · 模仿 Reports 风格 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div class="card p-4">
        <div class="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">记录条数</div>
        <div class="font-display text-3xl font-bold tracking-tight mt-1">{{ summary.total }}</div>
      </div>
      <div class="card p-4">
        <div class="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">专注时长</div>
        <div class="font-display text-3xl font-bold tracking-tight mt-1">
          {{ summary.hours }}<span class="text-base text-muted-foreground ml-1">h</span>
        </div>
      </div>
      <div class="card p-4">
        <div class="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">活跃时段</div>
        <div class="font-display text-3xl font-bold tracking-tight mt-1">
          {{ filtered.length > 0 ? Math.round(summary.minutes / Math.max(1, filtered.length)) : 0 }}<span class="text-base text-muted-foreground ml-1">分 / 条</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="card p-12 flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <!-- 空状态 -->
    <div v-else-if="filtered.length === 0" class="card p-12 text-center text-muted-foreground">
      <div class="w-14 h-14 rounded-[14px] mx-auto mb-3 flex items-center justify-center"
           style="background: linear-gradient(135deg, hsl(165 21% 92%), hsl(27 92% 95%));">
        <Calendar class="w-6 h-6 text-primary" />
      </div>
      <div class="font-display text-[15px] font-semibold mb-1 text-foreground">
        {{ records.length === 0 ? '当前日期范围内还没有工作记录' : '当前筛选条件下没有记录' }}
      </div>
      <p class="text-xs mb-3">{{ records.length === 0 ? '试试调整日期范围，或去"今日"页面添加记录' : '调整分类筛选或清除搜索关键字' }}</p>
      <button v-if="records.length === 0" class="btn-primary btn-sm" @click="gotoAdd">
        <Plus class="w-3.5 h-3.5" /> 添加第一条记录
      </button>
      <button v-else class="btn-outline btn-sm" @click="selectAll">清空筛选</button>
    </div>

    <!-- 时间线主体 -->
    <div v-else class="space-y-4">
      <div v-for="group in groupedByDate" :key="group.date" class="card overflow-hidden">
        <!-- 日期 header -->
        <div class="px-5 py-2.5 bg-muted/30 border-b flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <span class="font-mono">{{ group.date }}</span>
            <span class="text-muted-foreground text-xs font-normal">· {{ group.items.length }} 条</span>
          </div>
        </div>

        <!-- 记录列表 -->
        <div class="divide-y">
          <div
            v-for="r in group.items"
            :key="r.id"
            class="px-5 py-3.5 flex items-start gap-4 hover:bg-muted/20 transition-colors group"
          >
            <!-- 时间 -->
            <div class="w-14 shrink-0 text-center">
              <div class="font-mono text-sm font-semibold text-foreground">{{ timeOf(r) }}</div>
              <div class="text-[10.5px] text-muted-foreground mt-0.5">{{ durationLabel(durationMin(r)) }}</div>
            </div>

            <!-- 分类色条 -->
            <div class="w-1 self-stretch rounded-full" :style="{ background: categoryColor(r.category ?? undefined) }"></div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <div v-if="editingId === r.id" class="flex items-center gap-1.5">
                <input v-model="editText" class="input flex-1 h-8 text-sm" @keyup.enter="saveEdit" @keyup.esc="editingId = null" />
                <button class="btn-ghost btn-icon btn-sm" @click="saveEdit"><Check class="w-3.5 h-3.5" /></button>
                <button class="btn-ghost btn-icon btn-sm" @click="editingId = null"><X class="w-3.5 h-3.5" /></button>
              </div>
              <div v-else class="text-sm leading-relaxed text-foreground">{{ r.summary }}</div>
              <div class="flex items-center gap-2 mt-1.5 text-[10.5px] text-muted-foreground">
                <span class="px-1.5 py-0.5 rounded text-[10.5px] font-medium"
                      :style="{ background: (categoryColor(r.category ?? undefined) || '') + '20', color: categoryColor(r.category ?? undefined) }">
                  {{ r.category ?? '其他' }}
                </span>
                <span v-if="r.appName">· {{ r.appName }}</span>
                <span v-if="(r as any).windowTitle" class="truncate max-w-[300px]">· {{ (r as any).windowTitle }}</span>
              </div>
            </div>

            <!-- 操作 -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button class="btn-ghost btn-icon btn-sm" @click="startEdit(r)" title="编辑">
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button class="btn-ghost btn-icon btn-sm" @click="askAI(r)" title="AI 提问">
                <MessageSquare class="w-3.5 h-3.5" />
              </button>
              <button class="btn-ghost btn-icon btn-sm hover:!text-destructive" @click="removeRecord(r)" title="删除">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ya-menu-enter-active, .ya-menu-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.ya-menu-enter-from, .ya-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
