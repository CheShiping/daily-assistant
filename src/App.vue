<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  CalendarDays,
  Sparkles,
  Clock,
  Activity,
  BarChart3,
  History,
  Bot,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
  Crown,
  Shield,
  Gift,
  Command
} from 'lucide-vue-next'

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  const target = e.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('[contenteditable]') ||
    target.closest('input') ||
    target.closest('textarea')
  ) return
  e.preventDefault()
  window.api.screenshots.captureNow()
}

const route = useRoute()
const screenshotRunning = ref(false)
const collapsed = ref(false)

const mainNav = [
  { name: 'today', label: '今日工作', icon: CalendarDays, path: '/today' },
  { name: 'generate', label: '生成报告', icon: Sparkles, path: '/generate' },
  { name: 'timeline', label: '工作时间线', icon: Clock, path: '/timeline' },
  { name: 'heatmap', label: '时段热力图', icon: Activity, path: '/heatmap' },
  { name: 'app-usage', label: '应用记录', icon: BarChart3, path: '/app-usage' },
  { name: 'history', label: '历史报告', icon: History, path: '/history' },
  { name: 'agent', label: '接入 Agent', icon: Bot, path: '/agent' }
]

const moreNav = [
  { name: 'subscription', label: '订阅', icon: Crown, path: '/subscription' },
  { name: 'invite', label: '邀请有礼', icon: Gift, path: '/invite' },
  { name: 'privacy', label: '隐私保护', icon: Shield, path: '/privacy' },
  { name: 'settings', label: '设置', icon: SettingsIcon, path: '/settings' },
  { name: 'help', label: '帮助', icon: HelpCircle, path: '/help' }
]

async function checkScreenshotStatus() {
  try {
    const r = await window.api.screenshots.status()
    screenshotRunning.value = r.running
  } catch {}
}

let statusTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  checkScreenshotStatus()
  statusTimer = setInterval(checkScreenshotStatus, 3000)
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
  document.removeEventListener('keydown', handleKeydown)
})

function toggleCollapse() { collapsed.value = !collapsed.value }

const version = ref('2.1.1')
onMounted(async () => {
  try { version.value = await window.api.getVersion() } catch {}
})
</script>

<template>
  <div class="flex h-screen w-screen bg-background">
    <!-- 侧边栏 · 暖白 + 柑橘亮 active -->
    <aside
      class="relative flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden"
      :class="collapsed ? 'w-[68px]' : 'w-[232px]'"
      :style="{
        transitionProperty: 'width',
        transitionDuration: '320ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }"
    >
      <!-- Logo 区 -->
      <div class="h-14 flex items-center gap-2.5 px-3.5 flex-shrink-0">
        <div class="relative w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden"
             style="background: linear-gradient(135deg, hsl(27 92% 65%), hsl(27 92% 55%)); box-shadow: 0 4px 14px hsl(27 92% 63% / 0.32), inset 0 1px 0 rgba(255,255,255,0.4);">
          <span class="text-white font-bold text-sm font-display">日</span>
          <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-mint-200 border-2 border-sidebar"></span>
        </div>
        <div v-if="!collapsed" class="flex-1 min-w-0 leading-tight overflow-hidden whitespace-nowrap">
          <div class="font-display font-semibold text-[14.5px] tracking-tight text-foreground">牙牙乐</div>
          <div class="text-[10.5px] text-muted-foreground font-mono mt-0.5">日报助手 · v{{ version }}</div>
        </div>
      </div>

      <!-- ⌘K 快捷搜索 -->
      <div v-if="!collapsed" class="px-3 mb-2 flex-shrink-0">
        <button class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-muted-foreground transition-all duration-200 hover:border-muted-foreground/40 hover:text-foreground"
                style="transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);">
          <Command class="w-3.5 h-3.5" />
          <span>快速搜索</span>
          <kbd class="ml-auto font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      <!-- 主导航 -->
      <nav class="flex-1 px-2 overflow-y-auto min-h-0">
        <div class="space-y-0.5">
          <router-link
            v-for="item in mainNav"
            :key="item.name"
            :to="item.path"
            class="group flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] text-[13px] font-medium relative overflow-hidden whitespace-nowrap"
            :class="[
              route.path === item.path
                ? 'font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed ? 'justify-center' : ''
            ]"
            :title="collapsed ? item.label : ''"
            :style="route.path === item.path
              ? { background: 'hsl(27 92% 63% / 0.12)', color: 'hsl(27 92% 50%)' }
              : { transitionProperty: 'background-color, color', transitionDuration: '200ms' }"
          >
            <span
              v-if="route.path === item.path"
              class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
            ></span>
            <component :is="item.icon" class="w-[15px] h-[15px] flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                       :style="{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }" />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
            <span v-if="!collapsed && item.name === 'today'" class="chip !py-0 !px-1.5 !text-[10px]">今日</span>
          </router-link>
        </div>

        <!-- 更多分组 -->
        <div v-if="!collapsed" class="flex items-center gap-1.5 px-2.5 pt-5 pb-1.5">
          <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">更多</span>
          <span class="flex-1 h-px bg-border"></span>
        </div>
        <div v-else class="h-px bg-border mx-2 my-2"></div>
        <div class="space-y-0.5">
          <router-link
            v-for="item in moreNav"
            :key="item.name"
            :to="item.path"
            class="group flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] text-[13px] font-medium relative overflow-hidden whitespace-nowrap"
            :class="[
              route.path === item.path
                ? 'font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed ? 'justify-center' : ''
            ]"
            :title="collapsed ? item.label : ''"
            :style="route.path === item.path
              ? { background: 'hsl(27 92% 63% / 0.12)', color: 'hsl(27 92% 50%)' }
              : { transitionProperty: 'background-color, color', transitionDuration: '200ms' }"
          >
            <span
              v-if="route.path === item.path"
              class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
            ></span>
            <component :is="item.icon" class="w-[15px] h-[15px] flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                       :style="{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }" />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <!-- 底部区：录制状态 + 版本 -->
      <div class="border-t border-sidebar-border flex-shrink-0 px-2 py-2 space-y-1.5">
        <div
          v-if="!collapsed"
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          :style="screenshotRunning ? { background: 'hsl(27 92% 63% / 0.08)' } : {}"
        >
          <span class="dot-rec" :class="{ live: screenshotRunning }"></span>
          <span class="text-[11.5px] font-medium"
                :style="screenshotRunning ? { color: 'hsl(27 92% 50%)' } : {}">
            {{ screenshotRunning ? '正在记录' : '已暂停' }}
          </span>
          <span v-if="screenshotRunning" class="ml-auto font-mono text-[10.5px]" style="color: hsl(27 92% 50% / 0.8)">REC</span>
        </div>
        <div
          v-if="!collapsed"
          class="flex items-center px-2 py-1 text-[10.5px] text-muted-foreground font-mono"
        >
          <span>v{{ version }}</span>
          <span class="ml-2 text-mint-300">开源免费</span>
        </div>
      </div>

      <!-- 折叠/展开按钮 · 浮动在 sidebar 右边缘中部 -->
      <button
        class="absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border border-border text-muted-foreground flex items-center justify-center transition-all duration-200 hover:text-foreground hover:scale-110 hover:shadow-md"
        :style="{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }"
        @click="toggleCollapse"
        :title="collapsed ? '展开' : '收起'"
      >
        <PanelLeft v-if="collapsed" class="w-3 h-3" :stroke-width="2.5" />
        <PanelLeftClose v-else class="w-3 h-3" :stroke-width="2.5" />
      </button>
    </aside>

    <!-- 主区域 · h-full + min-h-0 让子 view 的 h-full 生效 · router-view fade transition -->
    <main class="flex-1 h-full flex flex-col min-h-0 overflow-y-auto bg-background">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
</style>
