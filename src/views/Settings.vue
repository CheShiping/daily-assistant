<script setup lang="ts">
<<<<<<< HEAD
import { ref, onMounted, defineComponent, h, computed } from 'vue'
=======
import { ref, onMounted, defineComponent, h } from 'vue'
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
import { useRouter } from 'vue-router'
const router = useRouter()
import type { AppSettings } from '@/types'
import {
  Loader2, CheckCircle2, XCircle, Eye, EyeOff,
  Settings as SettingsIcon, Camera, Brain, Database, Sparkles,
<<<<<<< HEAD
  Trash2, Download, Upload, ChevronDown, Wand2, Languages, Clock,
  Shield, Bell, Keyboard, FlaskConical, Copy, Check, RefreshCw, Crown, Power
=======
  Trash2, Download, Upload, ChevronDown, Wand2, Languages, Clock
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
} from 'lucide-vue-next'

// Switch 自定义控件
const Switch = defineComponent({
  name: 'Switch',
  props: { modelValue: { type: Boolean, default: false }, disabled: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('button', {
      type: 'button',
      disabled: props.disabled,
      onClick: () => !props.disabled && emit('update:modelValue', !props.modelValue),
      class: [
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors',
        props.modelValue ? 'bg-primary' : 'bg-muted-foreground/30',
        props.disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]
    }, [
      h('span', {
        class: [
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          props.modelValue ? 'translate-x-4' : 'translate-x-0.5'
        ]
      })
    ])
  }
})

const settings = ref<AppSettings | null>(null)
const loading = ref(true)
const saving = ref(false)
const showKey = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)
const excludedAppsText = ref('')

<<<<<<< HEAD
const privacyLevels = [
  { label: '宽松', value: 'loose', desc: '记录所有内容' },
  { label: '标准', value: 'standard', desc: '跳过敏感场景' },
  { label: '严格', value: 'strict', desc: '仅记录工作应用' }
]

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
const intervalOpen = ref(false)
const screenshotIntervals = [
  { label: '1 分钟', value: 60 },
  { label: '2 分钟', value: 120 },
  { label: '3 分钟', value: 180 },
  { label: '5 分钟', value: 300 },
  { label: '20 分钟', value: 1200 }
]

<<<<<<< HEAD
// 截图运行状态（自动记录开关）
const screenshotRunning = ref(false)

// 数据清除内联确认
const clearConfirming = ref(false)
const clearing = ref(false)

// 本地 API
const apiStatus = ref<{ running: boolean; port: number; token: string } | null>(null)
const apiPortDraft = ref(8088)
const apiToggling = ref(false)
const apiTokenCopied = ref(false)
const apiConfigCopied = ref(false)

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
async function load() {
  loading.value = true
  settings.value = await window.api.settings.get()
  excludedAppsText.value = (settings.value.excludedApps ?? []).join('\n')
<<<<<<< HEAD
  apiPortDraft.value = settings.value.localApiPort || 8088
  loading.value = false
  refreshScreenshotStatus()
  refreshApiStatus()
=======
  loading.value = false
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
}

async function save() {
  if (!settings.value) return
  saving.value = true
  const excludedApps = excludedAppsText.value.split('\n').map(s => s.trim()).filter(Boolean)
  await window.api.settings.update({ ...settings.value, excludedApps })
  saving.value = false
}

async function saveField(field: keyof AppSettings, value: any) {
  if (!settings.value) return
  ;(settings.value as any)[field] = value
  await window.api.settings.update({ [field]: value } as any)
}

async function testConnection() {
  if (!settings.value) return
  await save()
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await window.api.ai.testConnection()
  } catch (e) {
    testResult.value = { ok: false, message: (e as Error).message }
  }
  testing.value = false
}

const capturing = ref(false)
const captureStatus = ref('截图识别当前屏幕内容，生成一条工作记录')
async function captureNow() {
  capturing.value = true
  captureStatus.value = '正在截图并识别...'
  try {
    const r = await window.api.screenshots.captureNow()
    if (r.ok) {
      captureStatus.value = `识别成功：${r.category} - ${r.summary?.slice(0, 30)}...`
      router.push('/timeline')
    } else {
      captureStatus.value = `识别失败：${r.error}`
    }
  } catch (e: any) {
    captureStatus.value = `识别失败：${e?.message ?? '未知错误'}`
  } finally {
    capturing.value = false
  }
}

function setIntervalSec(val: number) {
  if (settings.value) settings.value.screenshotIntervalSec = val
  intervalOpen.value = false
  saveField('screenshotIntervalSec', val)
}

function currentIntervalLabel() {
  const s = settings.value?.screenshotIntervalSec ?? 300
  const m = Math.round(s / 60)
  return m < 1 ? `${s} 秒` : `${m} 分钟`
}

<<<<<<< HEAD
// 自动记录开关
async function refreshScreenshotStatus() {
  try {
    const r = await window.api.screenshots.status()
    screenshotRunning.value = r.running
  } catch {}
}

async function toggleAutoRecord(v: boolean) {
  try {
    if (v) await window.api.screenshots.start()
    else await window.api.screenshots.stop()
    screenshotRunning.value = v
  } catch {
    refreshScreenshotStatus()
  }
}

// 数据清除
async function clearData() {
  clearing.value = true
  try {
    await window.api.dataManagement.clear()
    clearConfirming.value = false
    alert('已清空所有本地数据')
  } finally {
    clearing.value = false
  }
}

=======
async function clearData() {
  if (!confirm('确认清空所有本地数据？此操作不可恢复')) return
  await window.api.dataManagement.clear()
  alert('已清空')
}
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
async function exportData() { await window.api.dataManagement.export() }
async function importData() {
  const r = await window.api.dataManagement.import()
  if (r.ok) alert('导入成功')
}

<<<<<<< HEAD
// 本地 API
async function refreshApiStatus() {
  try {
    apiStatus.value = await window.api.localApi.getStatus()
    apiPortDraft.value = apiStatus.value.port || settings.value?.localApiPort || 8088
  } catch {}
}

async function toggleLocalApi(v: boolean) {
  apiToggling.value = true
  try {
    if (v) {
      await window.api.settings.update({ localApiPort: apiPortDraft.value })
      const r = await window.api.localApi.start({ port: apiPortDraft.value })
      if (!r.ok) alert('启动失败：' + (r.error ?? '未知错误'))
    } else {
      await window.api.localApi.stop()
    }
    await refreshApiStatus()
  } finally {
    apiToggling.value = false
  }
}

async function applyApiPort() {
  await window.api.settings.update({ localApiPort: apiPortDraft.value })
  if (apiStatus.value?.running) {
    // 重启以应用新端口
    await window.api.localApi.stop()
    await window.api.localApi.start({ port: apiPortDraft.value })
    await refreshApiStatus()
  }
}

async function regenerateToken() {
  if (!confirm('重置 Token 后，原 Token 将立即失效，已有接入需重新配置。确认重置？')) return
  const r = await window.api.localApi.regenerateToken()
  if (r.ok) await refreshApiStatus()
}

const apiConfigText = computed(() => {
  const port = apiStatus.value?.port || apiPortDraft.value
  const token = apiStatus.value?.token || settings.value?.localApiToken || ''
  return `# 牙牙乐日报助手 - 本地 API 接入配置
Base URL: http://localhost:${port}
认证方式: Bearer Token
Token: ${token}

# 常用端点
GET  /                     # API 文档（Markdown）
GET  /api/work-records     # 工作记录
GET  /api/reports          # 报告列表
GET  /api/app-usage        # 应用使用时长
GET  /api/heatmap          # 热力图数据
GET  /api/timeline         # 时间线
GET  /api/plans            # 今日计划
POST /api/work-records     # 创建工作记录
POST /api/reports/generate # 生成报告

# 调用示例
curl -H "Authorization: Bearer ${token}" http://localhost:${port}/api/work-records`
})

async function copyText(text: string, flag: 'token' | 'config') {
  try {
    await navigator.clipboard.writeText(text)
    if (flag === 'token') {
      apiTokenCopied.value = true
      setTimeout(() => (apiTokenCopied.value = false), 1500)
    } else {
      apiConfigCopied.value = true
      setTimeout(() => (apiConfigCopied.value = false), 1500)
    }
  } catch {
    alert('复制失败，请手动选择复制')
  }
}

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
onMounted(load)
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto pb-12">
    <h1 class="text-2xl font-bold mb-6">设置</h1>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <div v-else-if="settings" class="space-y-4">

<<<<<<< HEAD
      <!-- 卡片 1：通用 -->
=======
      <!-- 通用 -->
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      <section class="card overflow-hidden">
        <div class="px-5 pt-4 pb-2 text-sm font-semibold flex items-center gap-2">
          <SettingsIcon class="w-4 h-4 text-muted-foreground" /> 通用
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">语言</div>
            <div class="text-xs text-muted-foreground mt-0.5">切换应用显示语言</div>
          </div>
          <div class="flex items-center gap-1 text-sm">
            <Languages class="w-3.5 h-3.5 text-muted-foreground" /> 简体中文
          </div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
<<<<<<< HEAD
            <div class="text-sm font-medium">自动记录工作</div>
            <div class="text-xs text-muted-foreground mt-0.5">开启后定时截图并识别当前工作状态</div>
          </div>
          <Switch :model-value="screenshotRunning" @update:model-value="toggleAutoRecord" />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">全局快捷键</div>
            <div class="text-xs text-muted-foreground mt-0.5">快速记录当前工作状态</div>
          </div>
          <div class="flex items-center gap-2">
            <Keyboard class="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              v-model="settings.globalShortcut"
              class="input w-32 text-center"
              placeholder="Ctrl+Shift+J"
              @blur="save"
            />
          </div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">系统通知</div>
            <div class="text-xs text-muted-foreground mt-0.5">记录成功或跳过时显示通知</div>
          </div>
          <Switch v-model="settings.showNotifications" @update:model-value="save" />
        </div>
      </section>

      <!-- 卡片 2：截图与记录 -->
=======
            <div class="text-sm font-medium">开机自启动</div>
            <div class="text-xs text-muted-foreground mt-0.5">登录系统后自动运行</div>
          </div>
          <Switch :model-value="false" disabled />
        </div>
      </section>

      <!-- 截图与记录 -->
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      <section class="card overflow-hidden">
        <div class="px-5 pt-4 pb-2 text-sm font-semibold flex items-center gap-2">
          <Camera class="w-4 h-4 text-muted-foreground" /> 截图与记录
        </div>
        <div class="px-5 py-2 text-xs text-primary bg-primary/5 border-y border-primary/20">
          开源免费，所有截图识别功能均可自由使用
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">截图间隔</div>
            <div class="text-xs text-muted-foreground mt-0.5">每多久抓取一次屏幕</div>
          </div>
          <div class="relative">
            <button class="btn-outline btn-sm flex items-center gap-1" @click="intervalOpen = !intervalOpen">
              <Clock class="w-3 h-3" /> {{ currentIntervalLabel() }} <ChevronDown class="w-3 h-3" />
            </button>
            <div v-if="intervalOpen" class="absolute right-0 top-9 z-10 card py-1 w-28">
              <button v-for="i in screenshotIntervals" :key="i.value"
                class="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                @click="setIntervalSec(i.value)">{{ i.label }}</button>
            </div>
          </div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
<<<<<<< HEAD
            <div class="text-sm font-medium">视觉识别</div>
            <div class="text-xs text-muted-foreground mt-0.5">使用 AI 视觉模型分析截图内容</div>
          </div>
          <Switch v-model="settings.visionEnabled" @update:model-value="save" />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-1">隐私级别</div>
          <div class="text-xs text-muted-foreground mb-3">控制截图记录的隐私策略</div>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="level in privacyLevels"
              :key="level.value"
              class="flex flex-col items-center p-3 rounded-lg border transition-colors"
              :class="settings.privacyLevel === level.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'"
              @click="settings.privacyLevel = level.value as any; save()"
            >
              <span class="text-sm font-medium">{{ level.label }}</span>
              <span class="text-xs mt-1 opacity-80">{{ level.desc }}</span>
            </button>
          </div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">截图分析后自动删除</div>
            <div class="text-xs text-muted-foreground mt-0.5">AI 分析完成后立即删除本地截图文件</div>
          </div>
          <Switch v-model="settings.autoDeleteScreenshots" @update:model-value="save" />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">敏感场景自动跳过</div>
            <div class="text-xs text-muted-foreground mt-0.5">自动识别并跳过私人沟通、社交媒体等场景</div>
          </div>
          <Switch v-model="settings.sensitiveSceneSkip" @update:model-value="save" />
=======
            <div class="text-sm font-medium">截图保留</div>
            <div class="text-xs text-muted-foreground mt-0.5">仅保留近 1 天未处理的历史</div>
          </div>
          <Switch :model-value="true" disabled />
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">识别当前屏幕</div>
            <div class="text-xs text-muted-foreground mt-0.5">{{ captureStatus }}</div>
          </div>
          <button class="btn-primary btn-sm flex items-center gap-1" @click="captureNow" :disabled="capturing">
            <Camera class="w-3 h-3" /> {{ capturing ? '识别中...' : '识别' }}
          </button>
        </div>
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-1">排除应用</div>
          <div class="text-xs text-muted-foreground mb-2">每行一个应用名，匹配时跳过截图</div>
          <textarea
            v-model="excludedAppsText"
            class="input w-full h-20 font-mono text-xs"
            placeholder="例如&#10;WeChat&#10;QQ"
            @change="save"
          ></textarea>
        </div>
<<<<<<< HEAD
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">完成通知</div>
            <div class="text-xs text-muted-foreground mt-0.5">报告生成、识别完成时弹出系统通知</div>
          </div>
          <Switch v-model="settings.showNotifications" @update:model-value="save" />
        </div>
      </section>

      <!-- 卡片 3：AI 分析 -->
=======
      </section>

      <!-- AI 分析 -->
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      <section class="card overflow-hidden">
        <div class="px-5 pt-4 pb-2 text-sm font-semibold flex items-center gap-2">
          <Brain class="w-4 h-4 text-muted-foreground" /> AI 分析
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">分析方式</div>
            <div class="text-xs text-muted-foreground mt-0.5">OpenAI 兼容 API</div>
          </div>
          <div class="text-sm text-primary">自定义任意模型</div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">连接测试</div>
            <div class="text-xs text-muted-foreground mt-0.5">验证当前 AI 配置是否可用</div>
          </div>
          <button class="btn-outline btn-sm flex items-center gap-1" :disabled="testing" @click="testConnection">
            <Loader2 v-if="testing" class="w-3 h-3 animate-spin" />
            <Wand2 v-else class="w-3 h-3" /> 测试
          </button>
        </div>
        <div v-if="testResult" class="px-5 py-2 border-t flex items-center gap-1.5 text-sm">
          <CheckCircle2 v-if="testResult.ok" class="w-4 h-4 text-green-500" />
          <XCircle v-else class="w-4 h-4 text-destructive" />
          <span :class="testResult.ok ? 'text-green-600' : 'text-destructive'">{{ testResult.message }}</span>
        </div>

        <div class="px-5 py-3 border-t">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium">API Base URL</div>
          </div>
          <input v-model="settings.baseUrl" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium">API Key</div>
            <button class="btn-ghost btn-icon btn-sm" @click="showKey = !showKey">
              <Eye v-if="!showKey" class="w-3.5 h-3.5" />
              <EyeOff v-else class="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            :type="showKey ? 'text' : 'password'"
            v-model="settings.apiKey"
            class="input w-full h-8 font-mono text-xs"
            @change="save"
            placeholder="sk-..."
          />
        </div>
        <div class="px-5 py-3 border-t">
<<<<<<< HEAD
          <div class="text-sm font-medium mb-2">报告生成模型</div>
          <input v-model="settings.model" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="如 gpt-4o、doubao-pro-32k" />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-2">截图分析模型</div>
          <input v-model="settings.visionModel" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="如 gpt-4o、doubao-vision-pro" />
        </div>
=======
            <div class="text-sm font-medium mb-2">报告生成模型</div>
            <input v-model="settings.model" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="如 gpt-4o、doubao-pro-32k" />
          </div>
          <div class="px-5 py-3 border-t">
            <div class="text-sm font-medium mb-2">截图分析模型</div>
            <input v-model="settings.visionModel" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="如 gpt-4o、doubao-vision-pro" />
          </div>
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-2">自定义指令</div>
          <div class="text-xs text-muted-foreground mb-2">追加到报告生成系统提示词末尾</div>
          <textarea
            v-model="settings.customInstruction"
            class="input w-full h-24 text-xs"
            placeholder="例如：用简洁正式的语气，按项目分组..."
            @change="save"
          ></textarea>
        </div>
<<<<<<< HEAD
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-2">AI 记忆内容</div>
          <div class="text-xs text-muted-foreground mb-2">长期记住的工作背景（项目名、技术栈、协作方式等），生成报告时自动注入</div>
          <textarea
            v-model="settings.memoryContent"
            class="input w-full h-24 text-xs"
            placeholder="例如：当前负责订单中台后端，技术栈 Java + Spring Cloud，团队使用钉钉协作..."
            @change="save"
          ></textarea>
        </div>
      </section>

      <!-- 卡片 4：数据管理 -->
=======
      </section>

      <!-- 数据管理 -->
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      <section class="card overflow-hidden">
        <div class="px-5 pt-4 pb-2 text-sm font-semibold flex items-center gap-2">
          <Database class="w-4 h-4 text-muted-foreground" /> 数据管理
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">导出数据</div>
            <div class="text-xs text-muted-foreground mt-0.5">导出为 JSON 备份</div>
          </div>
          <button class="btn-outline btn-sm flex items-center gap-1" @click="exportData">
            <Download class="w-3 h-3" /> 导出
          </button>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">导入数据</div>
            <div class="text-xs text-muted-foreground mt-0.5">从 JSON 备份恢复</div>
          </div>
          <button class="btn-outline btn-sm flex items-center gap-1" @click="importData">
            <Upload class="w-3 h-3" /> 导入
          </button>
        </div>
<<<<<<< HEAD
        <div class="px-5 py-3 border-t">
          <div v-if="!clearConfirming" class="flex items-center gap-4">
            <div class="flex-1">
              <div class="text-sm font-medium">清除历史数据</div>
              <div class="text-xs text-destructive/70 mt-0.5">不可恢复，请谨慎操作</div>
            </div>
            <button class="btn-outline btn-sm text-destructive border-destructive/30 hover:bg-destructive/10 flex items-center gap-1" @click="clearConfirming = true">
              <Trash2 class="w-3 h-3" /> 删除
            </button>
          </div>
          <div v-else class="flex items-center gap-2 bg-destructive/5 rounded-md p-3">
            <Shield class="w-4 h-4 text-destructive flex-shrink-0" />
            <span class="text-sm text-destructive flex-1">确认清空所有本地数据？此操作不可恢复</span>
            <button class="btn-ghost btn-sm" :disabled="clearing" @click="clearConfirming = false">取消</button>
            <button class="btn-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1" :disabled="clearing" @click="clearData">
              <Loader2 v-if="clearing" class="w-3 h-3 animate-spin" />
              <Trash2 v-else class="w-3 h-3" /> 确认删除
            </button>
          </div>
        </div>
      </section>

      <!-- 卡片 5：实验 -->
      <section class="card overflow-hidden">
        <div class="px-5 pt-4 pb-2 text-sm font-semibold flex items-center gap-2">
          <FlaskConical class="w-4 h-4 text-muted-foreground" /> 实验
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">实验性</span>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">开机自启动</div>
            <div class="text-xs text-muted-foreground mt-0.5">登录系统后自动运行（仅 Windows）</div>
          </div>
          <Switch :model-value="false" disabled />
=======
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">清除历史数据</div>
            <div class="text-xs text-destructive/70 mt-0.5">不可恢复，请谨慎操作</div>
          </div>
          <button class="btn-outline btn-sm text-destructive border-destructive/30 hover:bg-destructive/10 flex items-center gap-1" @click="clearData">
            <Trash2 class="w-3 h-3" /> 删除
          </button>
        </div>
      </section>

      <!-- 定时日报 -->
      <section class="card overflow-hidden">
        <div class="px-5 pt-4 pb-2 text-sm font-semibold flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-muted-foreground" /> 定时日报
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">每日定时生成日报</div>
            <div class="text-xs text-muted-foreground mt-0.5">指定时间自动基于当日工作记录生成日报</div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="time"
              v-model="settings.scheduledReportTime"
              class="input h-8 text-sm w-24"
              :disabled="!settings.scheduledReportEnabled"
              @change="saveField('scheduledReportTime', settings.scheduledReportTime)"
            />
            <Switch
              :model-value="settings.scheduledReportEnabled"
              @update:model-value="(v) => saveField('scheduledReportEnabled', v)"
            />
          </div>
        </div>
<<<<<<< HEAD
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">截图保留路径</div>
            <div class="text-xs text-muted-foreground mt-0.5">未开启"截图即销毁"时，截图保存到此目录（留空使用默认）</div>
          </div>
          <input
            v-model="settings.preservePath"
            class="input h-8 text-xs w-48 font-mono"
            placeholder="默认路径"
            @change="saveField('preservePath', settings.preservePath)"
          />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">订阅状态</div>
            <div class="text-xs text-muted-foreground mt-0.5">
              {{ settings.subscription === 'pro' ? `Pro 版 · 到期 ${settings.subscriptionExpiry ?? '—'}` : '免费版' }}
            </div>
          </div>
          <button class="btn-outline btn-sm flex items-center gap-1" @click="router.push('/subscription')">
            <Crown class="w-3 h-3" /> {{ settings.subscription === 'pro' ? '管理' : '升级' }}
          </button>
        </div>

        <!-- 本地 API 服务 -->
        <div class="px-5 py-3 border-t">
          <div class="flex items-center gap-4">
            <div class="flex-1">
              <div class="text-sm font-medium flex items-center gap-1.5">
                <Power class="w-3.5 h-3.5 text-muted-foreground" /> 本地 API 服务
              </div>
              <div class="text-xs text-muted-foreground mt-0.5">
                暴露本地 HTTP API，供外部 Agent / 脚本调用
                <span v-if="apiStatus?.running" class="text-green-600 ml-1">· 运行中（端口 {{ apiStatus.port }}）</span>
                <span v-else class="text-muted-foreground ml-1">· 已停止</span>
              </div>
            </div>
            <Switch :model-value="apiStatus?.running ?? false" :disabled="apiToggling" @update:model-value="toggleLocalApi" />
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted-foreground mb-1 block">端口</label>
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  v-model="apiPortDraft"
                  class="input h-8 text-xs w-24 font-mono"
                  min="1024"
                  max="65535"
                  @change="applyApiPort"
                />
                <button class="btn-ghost btn-sm" @click="applyApiPort">应用</button>
              </div>
            </div>
            <div>
              <label class="text-xs text-muted-foreground mb-1 block">Token</label>
              <div class="flex items-center gap-1">
                <input
                  type="text"
                  readonly
                  :value="apiStatus?.token || ''"
                  class="input h-8 text-xs w-32 font-mono"
                  placeholder="未生成"
                />
                <button class="btn-ghost btn-icon btn-sm" @click="copyText(apiStatus?.token || '', 'token')" title="复制 Token">
                  <Check v-if="apiTokenCopied" class="w-3.5 h-3.5 text-green-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
                <button class="btn-ghost btn-icon btn-sm" @click="regenerateToken" title="重置 Token">
                  <RefreshCw class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div class="mt-3">
            <button class="btn-outline btn-sm flex items-center gap-1" @click="copyText(apiConfigText, 'config')">
              <Check v-if="apiConfigCopied" class="w-3 h-3 text-green-500" />
              <Copy v-else class="w-3 h-3" />
              {{ apiConfigCopied ? '已复制' : '一键复制接入配置' }}
            </button>
            <p class="text-[11px] text-muted-foreground mt-1.5">复制后可粘贴给外部 Agent 或脚本，包含 Base URL、Token 和端点说明</p>
          </div>
        </div>
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
      </section>

      <div class="text-xs text-muted-foreground text-center pb-4 pt-2">
        牙牙乐日报助手 · 开源免费 · 自有 API Key
      </div>
    </div>
  </div>
</template>
