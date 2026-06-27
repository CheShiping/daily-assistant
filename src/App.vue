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
<<<<<<< HEAD
  Crown,
  Shield,
  Gift
} from 'lucide-vue-next'

function handleKeydown(e: KeyboardEvent) {
  // 只处理 Enter 键
  if (e.key !== 'Enter') return
  
  // 排除输入框、文本区域、可编辑元素
  const target = e.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('[contenteditable]') ||
    target.closest('input') ||
    target.closest('textarea')
  ) return
  
  // 触发快速记录
  e.preventDefault()
  window.api.screenshots.captureNow()
}

=======
  Shield
} from 'lucide-vue-next'

>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
const route = useRoute()
const screenshotRunning = ref(false)
const collapsed = ref(false)

// 主导航
const mainNav = [
  { name: 'today', label: '今日工作', icon: CalendarDays, path: '/today' },
  { name: 'generate', label: '生成报告', icon: Sparkles, path: '/generate' },
  { name: 'timeline', label: '工作时间线', icon: Clock, path: '/timeline' },
  { name: 'heatmap', label: '时段热力图', icon: Activity, path: '/heatmap' },
  { name: 'app-usage', label: '应用记录', icon: BarChart3, path: '/app-usage' },
  { name: 'history', label: '历史报告', icon: History, path: '/history' },
  { name: 'agent', label: '接入 Agent', icon: Bot, path: '/agent' }
]

// 更多分组
const moreNav = [
<<<<<<< HEAD
  { name: 'subscription', label: '订阅', icon: Crown, path: '/subscription' },
  { name: 'invite', label: '邀请有礼', icon: Gift, path: '/invite' },
  { name: 'privacy', label: '隐私保护', icon: Shield, path: '/privacy' },
  { name: 'settings', label: '设置', icon: SettingsIcon, path: '/settings' },
  { name: 'help', label: '帮助', icon: HelpCircle, path: '/help' }
=======
  { name: 'privacy', label: '隐私保护', icon: Shield, path: '#' },
  { name: 'settings', label: '设置', icon: SettingsIcon, path: '/settings' },
  { name: 'help', label: '帮助', icon: HelpCircle, path: '#' }
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
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
<<<<<<< HEAD
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
  document.removeEventListener('keydown', handleKeydown)
=======
})
onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
})

function toggleCollapse() { collapsed.value = !collapsed.value }

<<<<<<< HEAD
const version = ref('2.0.0')
=======
const version = ref('0.1.0')
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
onMounted(async () => {
  try { version.value = await window.api.getVersion() } catch {}
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-background">
    <!-- 侧边栏 -->
    <aside
      class="flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200"
      :class="collapsed ? 'w-16' : 'w-56'"
    >
      <!-- Logo 区 -->
      <div class="h-12 flex items-center border-b border-sidebar-border px-4 flex-shrink-0">
        <div class="w-6 h-6 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
          <span class="text-background text-xs font-bold">日</span>
        </div>
        <span v-if="!collapsed" class="ml-2 font-semibold text-sm tracking-wide">牙牙乐日报助手</span>
        <button
          class="ml-auto btn-ghost btn-icon btn-sm"
          @click="toggleCollapse"
          :title="collapsed ? '展开' : '收起'"
        >
          <PanelLeft v-if="collapsed" class="w-4 h-4" />
          <PanelLeftClose v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- 主导航 -->
      <nav class="flex-1 p-2 overflow-y-auto">
        <div class="space-y-0.5">
          <router-link
            v-for="item in mainNav"
            :key="item.name"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
            :class="[
              route.path === item.path
                ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'justify-center' : ''
            ]"
            :title="collapsed ? item.label : ''"
          >
            <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </router-link>
        </div>

        <!-- 更多分组 -->
        <div v-if="!collapsed" class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1.5">
          更多
        </div>
        <div v-else class="h-px bg-border mx-2 my-2"></div>
        <div class="space-y-0.5">
          <router-link
            v-for="item in moreNav"
            :key="item.name"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
            :class="[
              route.path === item.path
                ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'justify-center' : ''
            ]"
            :title="collapsed ? item.label : ''"
          >
            <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <!-- 底部区：版本 -->
      <div class="border-t border-sidebar-border flex-shrink-0">
        <div
          v-if="!collapsed"
          class="flex items-center px-4 py-2 text-xs text-muted-foreground"
        >
          <span>{{ version }}</span>
          <span class="text-muted-foreground/60 ml-2">开源免费</span>
        </div>
      </div>
    </aside>

    <!-- 主区域 -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- 内容区 -->
      <div class="flex-1 overflow-auto">
        <router-view />
      </div>
    </main>
  </div>
</template>
