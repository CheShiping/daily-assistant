<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Check, BarChart3, Clock, Monitor, Play, Square,
  Plus, Trash2, GripVertical, Loader2, Sparkles, Shield
} from 'lucide-vue-next'
import { today, formatDate, isApiReady, safeCall } from '@/lib/utils'
import { toast } from '@/lib/toast'
import type { WorkRecord, PlanItem, AppSettings } from '@/types'

const router = useRouter()

// 数据
const loading = ref(true)
const records = ref<WorkRecord[]>([])
const yesterdayRecords = ref<WorkRecord[]>([])
const dayBeforeRecords = ref<WorkRecord[]>([])
const displays = ref<Array<{ id: number; label: string; x: number; y: number; width: number; height: number; scaleFactor: number; isPrimary: boolean }>>([])
const screenshotRunning = ref(false)
const settings = ref<AppSettings | null>(null)

// 计划
const plans = ref<PlanItem[]>([])
const newPlanText = ref('')
const editingPlanId = ref<string | null>(null)
const editingPlanText = ref('')
const deletingPlanId = ref<string | null>(null)

const showPrevDays = ref(false)

const todayStr = today()
const yesterdayStr = formatDate(new Date(Date.now() - 86400000))
const dayBeforeStr = formatDate(new Date(Date.now() - 2 * 86400000))

// 隐私状态 Pill
const privacyPills = computed(() => {
  if (!settings.value) return []
  const pills: Array<{ label: string; cool?: boolean }> = []
  pills.push({
    label: settings.value.autoDeleteScreenshots ? '截图分析后即销毁' : '截图保留中',
    cool: settings.value.autoDeleteScreenshots
  })
  pills.push({ label: '数据仅存本地' })
  if (settings.value.sensitiveSceneSkip) pills.push({ label: '内容脱敏处理', cool: true })
  return pills
})

// 专注时长（小时）
const focusHours = computed(() => {
  let ms = 0
  for (const r of records.value) {
    if (r.endedAt) {
      const dur = new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()
      if (dur > 0) ms += dur
    } else {
      ms += 5 * 60000
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

// 数字 count-up
function animateNumber(el: HTMLElement | null, target: number, decimals = 0, duration = 900) {
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) { el.textContent = target.toFixed(decimals); return }
  const start = performance.now()
  const node = el
  function step(now: number) {
    const p = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    node.textContent = (target * eased).toFixed(decimals)
    if (p < 1) requestAnimationFrame(step)
    else node.textContent = target.toFixed(decimals)
  }
  requestAnimationFrame(step)
}

const recordsCountEl = ref<HTMLElement | null>(null)
const focusHoursEl = ref<HTMLElement | null>(null)

// 触发数字 count-up（数据加载完）
watch([records], () => {
  setTimeout(() => {
    animateNumber(recordsCountEl.value, records.value.length, 0)
    animateNumber(focusHoursEl.value, parseFloat(focusHours.value), 1)
  }, 100)
})

const recentRecords = computed(() => records.value.slice(0, 5))

function formatRecordTime(iso: string): string {
  const d = new Date(iso)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

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
  if (count === 0) return 6
  if (maxCount.value === 0) return 6
  return Math.max(15, (count / maxCount.value) * 100)
}

// 柑橘色阶 0.2/0.4/0.6/0.8/1
function barColor(count: number): string {
  if (count === 0) return 'hsl(var(--border))'
  const ratio = maxCount.value === 0 ? 0 : count / maxCount.value
  if (ratio < 0.2) return 'hsl(27 92% 63% / 0.22)'
  if (ratio < 0.4) return 'hsl(27 92% 63% / 0.42)'
  if (ratio < 0.6) return 'hsl(27 92% 63% / 0.65)'
  if (ratio < 0.8) return 'hsl(27 92% 63% / 0.85)'
  return 'hsl(27 92% 55%)'
}

async function load() {
  loading.value = true
  try {
    const start = new Date()
    start.setDate(start.getDate() - 2)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const [all, dps, status, s, pl] = await Promise.all([
      safeCall(
        () => window.api.workRecords.list({ startDate: start.toISOString(), endDate: end.toISOString() }),
        [] as WorkRecord[]
      ),
      safeCall(() => window.api.system.displays(), [] as any[]),
      safeCall(() => window.api.screenshots.status(), { running: false }),
      safeCall(() => window.api.settings.get(), null as any),
      safeCall(() => window.api.plans.list({ date: todayStr }), [] as PlanItem[])
    ])
    records.value = (all as WorkRecord[]).filter(r => formatDate(r.startedAt) === todayStr)
    yesterdayRecords.value = (all as WorkRecord[]).filter(r => formatDate(r.startedAt) === yesterdayStr)
    dayBeforeRecords.value = (all as WorkRecord[]).filter(r => formatDate(r.startedAt) === dayBeforeStr)
    displays.value = dps
    screenshotRunning.value = status.running
    settings.value = s
    plans.value = pl
  } finally {
    loading.value = false
  }
}

async function reloadPlans() {
  if (!isApiReady()) return
  try {
    plans.value = await window.api.plans.list({ date: todayStr })
  } catch (e) {
    console.warn('reloadPlans failed:', e)
  }
}

async function toggleScreenshot() {
  if (!isApiReady()) {
    toast.warning('Electron 未启动')
    return
  }
  try {
    if (screenshotRunning.value) {
      await window.api.screenshots.stop()
      toast.info('已暂停自动记录')
    } else {
      await window.api.screenshots.start()
      toast.success('已开启自动记录')
    }
    const s = await window.api.screenshots.status()
    screenshotRunning.value = s.running
  } catch (e) {
    console.warn('toggleScreenshot failed:', e)
    toast.error('切换失败：' + (e as Error).message)
  }
}

// ============ 计划操作 ============
async function addPlan() {
  const text = newPlanText.value.trim()
  if (!text) return
  if (!isApiReady()) {
    // dev 模式：本地态也加，方便查看
    plans.value = [
      ...plans.value,
      {
        id: 'local-' + Date.now(),
        text,
        date: todayStr,
        completed: false,
        order: plans.value.length
      } as any as PlanItem
    ]
    newPlanText.value = ''
    toast.info('已本地添加（dev 模式）')
    return
  }
  try {
    await window.api.plans.create({ date: todayStr, text })
    newPlanText.value = ''
    await reloadPlans()
    toast.success('计划已添加')
  } catch (e) {
    console.warn('addPlan failed:', e)
    toast.error('添加失败：' + (e as Error).message)
  }
}

async function togglePlan(plan: PlanItem) {
  if (!isApiReady()) {
    // 本地态翻转
    plan.completed = !plan.completed
    return
  }
  try {
    await window.api.plans.update({ id: plan.id, completed: !plan.completed })
    await reloadPlans()
  } catch (e) {
    console.warn('togglePlan failed:', e)
  }
}

async function confirmDeletePlan(id: string) {
  if (!isApiReady()) {
    plans.value = plans.value.filter(p => p.id !== id)
    deletingPlanId.value = null
    return
  }
  try {
    await window.api.plans.delete(id)
    deletingPlanId.value = null
    await reloadPlans()
  } catch (e) {
    console.warn('confirmDeletePlan failed:', e)
  }
}

function startEditPlan(plan: PlanItem) {
  editingPlanId.value = plan.id
  editingPlanText.value = plan.text
}

async function saveEditPlan() {
  if (!editingPlanId.value || !editingPlanText.value.trim()) {
    editingPlanId.value = null
    return
  }
  if (!isApiReady()) {
    const p = plans.value.find(x => x.id === editingPlanId.value)
    if (p) p.text = editingPlanText.value.trim()
    editingPlanId.value = null
    editingPlanText.value = ''
    toast.info('已本地更新（dev 模式）')
    return
  }
  try {
    await window.api.plans.update({ id: editingPlanId.value, text: editingPlanText.value.trim() })
    editingPlanId.value = null
    editingPlanText.value = ''
    await reloadPlans()
    toast.success('计划已更新')
  } catch (e) {
    console.warn('saveEditPlan failed:', e)
    toast.error('更新失败：' + (e as Error).message)
  }
}

// ============ 拖拽排序 ============
let draggedId: string | null = null
function onDragStart(e: DragEvent, plan: PlanItem) {
  draggedId = plan.id
  e.dataTransfer?.setData('text/plain', plan.id)
}

async function onDrop(e: DragEvent, target: PlanItem) {
  e.preventDefault()
  const sourceId = e.dataTransfer?.getData('text/plain') || draggedId
  draggedId = null
  if (!sourceId || sourceId === target.id) return
  const sourceIdx = plans.value.findIndex(p => p.id === sourceId)
  const targetIdx = plans.value.findIndex(p => p.id === target.id)
  if (sourceIdx < 0 || targetIdx < 0) return
  if (!isApiReady()) {
    const sp = plans.value[sourceIdx]
    const tp = plans.value[targetIdx]
    if (sp && tp) {
      const tmp = sp.order
      sp.order = tp.order
      tp.order = tmp
    }
    return
  }
  const sourceOrder = plans.value[sourceIdx].order
  const targetOrder = plans.value[targetIdx].order
  try {
    await window.api.plans.update({ id: sourceId, order: targetOrder })
    await window.api.plans.update({ id: target.id, order: sourceOrder })
    await reloadPlans()
  } catch (e) {
    console.warn('onDrop failed:', e)
  }
}

const planProgress = computed(() => {
  if (plans.value.length === 0) return 0
  return Math.round((plans.value.filter(p => p.completed).length / plans.value.length) * 100)
})

onMounted(load)
onUnmounted(() => {})
</script>

<template>
  <div class="flex flex-col gap-5 p-6 px-7 max-w-[1280px] mx-auto w-full">

    <!-- 0. API Key 提示 -->
    <div v-if="settings && !settings.apiKey"
         class="rounded-[14px] border p-3.5 text-sm flex items-start gap-3 reveal"
         style="background: hsl(36 60% 95%); border-color: hsl(36 60% 85%); color: hsl(28 50% 28%);">
      <Sparkles class="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div class="flex-1">
        尚未配置 API Key，请前往
        <button class="underline font-semibold" @click="router.push('/settings')">设置</button>
        配置后才能使用截图识别和报告生成功能。
      </div>
    </div>

    <!-- 1. Hero · 暖渐变 + 大字 + 隐私 chip + REC 状态（无 reveal 动画确保稳定显示） -->
    <div
      class="relative rounded-[18px] overflow-hidden flex-shrink-0"
      style="background: linear-gradient(135deg, hsl(27 92% 95%) 0%, hsl(36 38% 96%) 45%, hsl(165 21% 92%) 100%); padding: 24px 28px;"
    >
      <!-- 装饰光斑 -->
      <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none"
           style="background: radial-gradient(circle, hsl(27 92% 63% / 0.18), transparent 60%);"></div>
      <div class="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full pointer-events-none"
           style="background: radial-gradient(circle, hsl(165 21% 57% / 0.15), transparent 60%);"></div>

      <div class="relative flex items-center gap-5">
        <!-- 品牌 mark -->
        <div class="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0"
             style="background: linear-gradient(135deg, hsl(27 92% 65%), hsl(27 92% 55%)); box-shadow: 0 8px 22px hsl(27 92% 63% / 0.32), inset 0 1px 0 rgba(255,255,255,0.4);">
          <Check class="w-7 h-7 text-white" :stroke-width="2.5" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="font-mono text-[11px] tracking-[0.1em] uppercase text-primary/80 font-semibold">
            牙牙乐日报 · {{ formatDate(new Date()) }}
          </div>
          <h1 class="font-display text-[28px] font-bold leading-[1.1] mt-1.5 text-foreground tracking-tight">
            你只管<span class="text-primary italic">工作</span>，日报交给我
          </h1>
          <p class="text-[13px] text-muted-foreground mt-2 max-w-[460px]">
            静默记录工作轨迹，AI 帮你写好每一份日报、周报、月报，不再为写汇报发愁。
          </p>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <span
              v-for="(p, i) in privacyPills"
              :key="i"
              :class="['chip', p.cool ? 'chip-cool' : '']"
            >
              <Check class="w-3 h-3" :stroke-width="2.5" /> {{ p.label }}
            </span>
          </div>
        </div>

        <!-- REC 状态切换 -->
        <button
          class="group relative flex items-center gap-2 text-xs px-3.5 py-2 rounded-full font-semibold flex-shrink-0 transition-all duration-300"
          :class="screenshotRunning ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'"
          :style="screenshotRunning
            ? { background: 'linear-gradient(135deg, hsl(16 65% 60%), hsl(16 65% 50%))', boxShadow: '0 6px 18px hsl(16 65% 56% / 0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }
            : { transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
          @click="toggleScreenshot"
        >
          <Square v-if="screenshotRunning" class="w-3 h-3" :stroke-width="2.5" />
          <Play v-else class="w-3 h-3" :stroke-width="2.5" />
          <span>{{ screenshotRunning ? '记录中' : '已暂停' }}</span>
          <span v-if="screenshotRunning" class="dot-rec live !ml-1" style="background: white; box-shadow: 0 0 6px rgba(255,255,255,0.6);"></span>
        </button>
      </div>
    </div>

    <!-- 2. 今日计划 · 进度条 + stagger 入场 -->
    <section class="card p-5 px-6 reveal reveal-1">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
             style="background: hsl(27 92% 63% / 0.12); color: hsl(27 92% 50%);">
          <Check :size="14" :stroke-width="2.5" />
        </div>
        <h2 class="font-display text-[15px] font-semibold tracking-tight text-foreground">今日计划</h2>
        <span class="chip chip-neutral !font-mono">{{ plans.filter(p => p.completed).length }} / {{ plans.length }}</span>
        <!-- 进度条 -->
        <div v-if="plans.length > 0" class="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[140px] ml-1">
          <div class="h-full rounded-full transition-all duration-500"
               :style="{
                 width: planProgress + '%',
                 background: 'linear-gradient(90deg, hsl(27 92% 63%), hsl(165 21% 57%))',
                 transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
               }"></div>
        </div>
      </div>

      <div v-if="plans.length === 0" class="text-xs text-muted-foreground py-6 text-center">
        <div class="font-display text-sm mb-1">还没有计划</div>
        <div>添加一条开始今天的工作 →</div>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="group flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-all duration-200 hover:bg-muted/60"
          :style="{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
          draggable="true"
          @dragstart="onDragStart($event, plan)"
          @dragover.prevent
          @drop="onDrop($event, plan)"
        >
          <GripVertical class="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
          <button
            class="w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
            :class="plan.completed
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-background group-hover:border-primary/60'"
            :style="{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
            @click="togglePlan(plan)"
          >
            <Check v-if="plan.completed" class="w-3 h-3" :stroke-width="3" />
          </button>
          <template v-if="editingPlanId === plan.id">
            <input
              v-model="editingPlanText"
              class="flex-1 input h-7 text-sm"
              @keyup.enter="saveEditPlan"
              @keyup.escape="editingPlanId = null"
              @blur="saveEditPlan"
              autofocus
            />
          </template>
          <template v-else>
            <span
              class="flex-1 text-[13.5px] cursor-pointer transition-colors duration-200"
              :class="plan.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'"
              @dblclick="startEditPlan(plan)"
            >
              {{ plan.text }}
            </span>
          </template>
          <button
            class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200"
            @click="deletingPlanId = plan.id"
            title="删除计划"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- 内联确认删除条 -->
      <div
        v-if="deletingPlanId"
        class="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs reveal"
        style="background: hsl(16 65% 95%); border: 1px solid hsl(16 65% 85%); color: hsl(16 65% 35%);"
      >
        <span class="font-semibold">确认删除该计划？</span>
        <button class="btn btn-sm btn-destructive ml-auto" @click="confirmDeletePlan(deletingPlanId)">确认</button>
        <button class="btn btn-sm btn-ghost" @click="deletingPlanId = null">取消</button>
      </div>

      <!-- 添加计划 -->
      <div class="flex items-center gap-2 mt-3 pt-3 border-t border-border cursor-text">
        <Plus class="w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          v-model="newPlanText"
          class="flex-1 bg-transparent border-0 outline-none text-[13.5px] placeholder:text-muted-foreground/60 focus:bg-muted/40 rounded-md px-2 py-1.5 transition-colors cursor-text"
          style="caret-color: hsl(27 92% 50%);"
          placeholder="添加计划…（Enter 提交）"
          @keyup.enter="addPlan"
        />
      </div>
    </section>

    <!-- 3. 工作概览 · Bento 3 卡 + count-up -->
    <section class="reveal reveal-2">
      <div class="flex items-center gap-2.5 mb-1">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
             style="background: hsl(27 92% 63% / 0.12); color: hsl(27 92% 50%);">
          <BarChart3 :size="14" :stroke-width="2.5" />
        </div>
        <h2 class="font-display text-[15px] font-semibold tracking-tight">工作概览</h2>
        <button
          v-if="records.length > 5"
          class="ml-auto text-xs text-primary hover:underline font-medium"
          @click="router.push('/timeline')"
        >查看全部 →</button>
      </div>
      <p class="text-xs text-muted-foreground mb-3.5 ml-9">今日工作活动的核心指标概览，包括记录条数、专注时长与主要工作分类</p>

      <div v-if="loading" class="grid grid-cols-3 gap-3">
        <div v-for="i in 3" :key="i" class="card p-4">
          <div class="skel h-3 w-1/2 mb-2.5"></div>
          <div class="skel h-7 w-3/4"></div>
        </div>
      </div>

      <div v-else-if="records.length === 0" class="card p-8 text-center">
        <div class="w-14 h-14 rounded-[14px] mx-auto mb-3 flex items-center justify-center animate-fly-in"
             style="background: linear-gradient(135deg, hsl(165 21% 92%), hsl(27 92% 95%));">
          <Sparkles class="w-6 h-6 text-primary" />
        </div>
        <div class="font-display text-[15px] font-semibold mb-1">今天还没有工作记录</div>
        <p class="text-xs text-muted-foreground max-w-[280px] mx-auto">
          软件已在后台自动截图记录，开始工作后稍等片刻即可看到记录
        </p>
      </div>

      <div v-else class="grid grid-cols-3 gap-3">
        <div class="card p-4 reveal">
          <div class="text-[11.5px] text-muted-foreground font-mono uppercase tracking-wider">记录条数</div>
          <div ref="recordsCountEl" class="font-display text-[34px] font-bold mt-1.5 text-foreground leading-none tabular-nums tracking-tight">0</div>
          <div class="text-[11px] text-mint-300 mt-1.5 font-medium">+{{ recentRecords.length }} 较昨日同时段</div>
        </div>
        <div class="card p-4 reveal reveal-1">
          <div class="text-[11.5px] text-muted-foreground font-mono uppercase tracking-wider">专注时长</div>
          <div class="flex items-baseline gap-1 mt-1.5">
            <span ref="focusHoursEl" class="font-display text-[34px] font-bold text-foreground leading-none tabular-nums tracking-tight">0.0</span>
            <span class="font-display text-[18px] font-semibold text-muted-foreground">h</span>
          </div>
          <div class="text-[11px] text-primary/80 mt-1.5 font-medium">连续工作中</div>
        </div>
        <div class="card p-4 reveal reveal-2">
          <div class="text-[11.5px] text-muted-foreground font-mono uppercase tracking-wider">主要工作</div>
          <div class="font-display text-[20px] font-semibold mt-1.5 text-foreground leading-tight tracking-tight truncate">{{ topCategory }}</div>
          <div class="text-[11px] text-muted-foreground mt-1.5">今日占比最高</div>
        </div>
      </div>

      <!-- 最近 5 条记录 -->
      <div v-if="records.length > 0" class="card mt-3 px-5 py-3">
        <div class="space-y-1.5">
          <div v-for="r in recentRecords" :key="r.id"
               class="flex items-center gap-3 text-[13px] py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors duration-200">
            <span class="text-muted-foreground font-mono text-[11px] w-12 tabular-nums">{{ formatRecordTime(r.startedAt) }}</span>
            <span class="chip chip-neutral !text-[10.5px]">{{ r.category ?? '其他' }}</span>
            <span class="flex-1 truncate text-foreground">{{ r.summary }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. 时段记录 · 24 格条带 + 柑橘色阶 -->
    <section class="card p-5 px-6 reveal reveal-3">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
             style="background: hsl(27 92% 63% / 0.12); color: hsl(27 92% 50%);">
          <Clock :size="14" :stroke-width="2.5" />
        </div>
        <h2 class="font-display text-[15px] font-semibold tracking-tight">时段记录</h2>
        <label class="ml-auto flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          <input type="checkbox" v-model="showPrevDays" class="size-3.5 accent-primary cursor-pointer" />
          <span>展示前两日时段热力</span>
        </label>
      </div>
      <!-- 24 格条带 -->
      <div class="flex items-end gap-[3px] h-16 mb-2">
        <div v-for="h in 24" :key="h" class="relative flex-1 h-full group">
          <div
            v-if="showPrevDays"
            class="absolute inset-x-0 bottom-0 rounded-sm transition-all duration-500"
            :style="{ height: barHeight(dayBeforeCounts[h - 1]) + '%', background: barColor(dayBeforeCounts[h - 1]), opacity: 0.32, transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
            :title="`前天 ${h - 1}:00 — ${dayBeforeCounts[h - 1]} 条`"
          ></div>
          <div
            v-if="showPrevDays"
            class="absolute inset-x-0 bottom-0 rounded-sm transition-all duration-500"
            :style="{ height: barHeight(yesterdayCounts[h - 1]) + '%', background: barColor(yesterdayCounts[h - 1]), opacity: 0.6, transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
            :title="`昨天 ${h - 1}:00 — ${yesterdayCounts[h - 1]} 条`"
          ></div>
          <div
            class="absolute inset-x-0 bottom-0 rounded-sm transition-all duration-500 group-hover:scale-y-110 origin-bottom"
            :style="{ height: barHeight(todayCounts[h - 1]) + '%', background: barColor(todayCounts[h - 1]), transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
            :title="`${h - 1}:00 — ${todayCounts[h - 1]} 条记录`"
          ></div>
        </div>
      </div>
      <div class="flex justify-between text-[10.5px] text-muted-foreground font-mono mb-3">
        <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
      </div>
      <div class="flex items-center gap-1 text-[10.5px] text-muted-foreground font-mono">
        <span>少</span>
        <div class="w-3 h-3 rounded-sm" style="background: hsl(27 92% 63% / 0.22)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: hsl(27 92% 63% / 0.42)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: hsl(27 92% 63% / 0.65)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: hsl(27 92% 63% / 0.85)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: hsl(27 92% 55%)"></div>
        <span>多</span>
      </div>
    </section>

    <!-- 5. 已连接显示器 · card hover -->
    <section class="card p-5 px-6 reveal reveal-4">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
             style="background: hsl(165 21% 57% / 0.16); color: hsl(165 30% 32%);">
          <Monitor :size="14" :stroke-width="2.5" />
        </div>
        <h2 class="font-display text-[15px] font-semibold tracking-tight">已连接显示器</h2>
        <span class="chip chip-cool">{{ displays.length }} 台</span>
      </div>
      <div v-if="displays.length === 0" class="text-sm text-muted-foreground text-center py-6">
        暂无显示器信息
      </div>
      <div v-else class="grid grid-cols-2 gap-2.5">
        <div v-for="d in displays" :key="d.id"
             class="card-hover card p-3.5 flex items-center gap-3 cursor-default">
          <div class="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-300"
               :style="{ background: d.isPrimary ? 'linear-gradient(135deg, hsl(27 92% 63%), hsl(27 92% 55%))' : 'hsl(var(--muted))', color: d.isPrimary ? 'white' : 'hsl(var(--muted-foreground))' }">
            <Monitor class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[13.5px] font-semibold flex items-center gap-2 text-foreground">
              <span class="truncate">{{ d.label }}</span>
              <span v-if="d.isPrimary" class="chip !text-[10px] !py-0 !px-1.5">主显示器</span>
            </div>
            <div class="text-[11.5px] text-muted-foreground mt-0.5 font-mono">{{ d.width }}×{{ d.height }} · {{ d.scaleFactor }}x · {{ d.x }},{{ d.y }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.animate-fly-in { animation: flyIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
</style>
