<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import type { AppSettings } from '@/types'
import { isApiReady, safeCall, FALLBACK_SETTINGS } from '@/lib/utils'
import {
  Loader2, CheckCircle2, XCircle, Eye, EyeOff,
  Settings as SettingsIcon, Camera, Brain, Database, Sparkles,
  Trash2, Download, Upload, Wand2, Languages, Clock,
  Shield, Bell, Keyboard, FlaskConical, Copy, Check, RefreshCw, Crown, Power
} from 'lucide-vue-next'

const settings = ref<AppSettings>({ ...FALLBACK_SETTINGS })
const loading = ref(true)
const saving = ref(false)
const showKey = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)
const excludedAppsText = ref('')

const privacyLevels = [
  { label: '宽松 · 记录所有内容', value: 'loose' },
  { label: '标准 · 跳过敏感场景', value: 'standard' },
  { label: '严格 · 仅记录工作应用', value: 'strict' }
]

const screenshotIntervals = [
  { label: '1 分钟', value: 60 },
  { label: '2 分钟', value: 120 },
  { label: '3 分钟', value: 180 },
  { label: '5 分钟', value: 300 },
  { label: '20 分钟', value: 1200 }
]

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

async function load() {
  loading.value = true
  try {
    const s = await safeCall(() => window.api.settings.get(), { ...FALLBACK_SETTINGS })
    settings.value = { ...FALLBACK_SETTINGS, ...s }
    excludedAppsText.value = (settings.value.excludedApps ?? []).join('\n')
    apiPortDraft.value = settings.value.localApiPort || 8088
  } finally {
    loading.value = false
  }
  refreshScreenshotStatus()
  refreshApiStatus()
}

async function save() {
  if (!settings.value || !isApiReady()) return
  saving.value = true
  try {
    const excludedApps = excludedAppsText.value.split('\n').map(s => s.trim()).filter(Boolean)
    await window.api.settings.update({ ...settings.value, excludedApps })
  } finally {
    saving.value = false
  }
}

async function saveField(field: keyof AppSettings, value: any) {
  if (!settings.value || !isApiReady()) return
  ;(settings.value as any)[field] = value
  try {
    await window.api.settings.update({ [field]: value } as any)
  } catch (e) {
    console.warn('saveField failed:', e)
  }
}

async function testConnection() {
  if (!settings.value || !isApiReady()) {
    testResult.value = { ok: false, message: 'Electron 未启动，无法测试连接' }
    return
  }
  await save()
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await window.api.ai.testConnection()
  } catch (e) {
    testResult.value = { ok: false, message: (e as Error).message }
  } finally {
    testing.value = false
  }
}

const capturing = ref(false)
const captureStatus = ref('截图识别当前屏幕内容，生成一条工作记录')
async function captureNow() {
  if (!isApiReady()) {
    captureStatus.value = 'Electron 未启动，无法截图'
    return
  }
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
  saveField('screenshotIntervalSec', val)
}

function currentIntervalLabel() {
  const s = settings.value?.screenshotIntervalSec ?? 300
  const m = Math.round(s / 60)
  return m < 1 ? `${s} 秒` : `${m} 分钟`
}

// 自动记录开关
async function refreshScreenshotStatus() {
  screenshotRunning.value = await safeCall(
    async () => (await window.api.screenshots.status()).running,
    false
  )
}

async function toggleAutoRecord(v: boolean) {
  if (!isApiReady()) return
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
  if (!isApiReady()) {
    alert('Electron 未启动')
    return
  }
  clearing.value = true
  try {
    await window.api.dataManagement.clear()
    clearConfirming.value = false
    alert('已清空所有本地数据')
  } finally {
    clearing.value = false
  }
}

async function exportData() {
  if (!isApiReady()) return alert('Electron 未启动')
  await window.api.dataManagement.export()
}
async function importData() {
  if (!isApiReady()) return alert('Electron 未启动')
  const r = await window.api.dataManagement.import()
  if (r.ok) alert('导入成功')
}

// 本地 API
async function refreshApiStatus() {
  apiStatus.value = await safeCall(
    () => window.api.localApi.getStatus(),
    { running: false, port: 8088, token: '' }
  )
  if (apiStatus.value) {
    apiPortDraft.value = apiStatus.value.port || settings.value?.localApiPort || 8088
  }
}

async function toggleLocalApi(v: boolean) {
  if (!isApiReady()) return alert('Electron 未启动')
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
  if (!isApiReady()) return
  await window.api.settings.update({ localApiPort: apiPortDraft.value })
  if (apiStatus.value?.running) {
    await window.api.localApi.stop()
    await window.api.localApi.start({ port: apiPortDraft.value })
    await refreshApiStatus()
  }
}

async function regenerateToken() {
  if (!isApiReady()) return
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

onMounted(load)
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto pb-12 w-full">
    <h1 class="font-display text-[26px] font-bold tracking-tight mb-1">设置</h1>
    <p class="text-xs text-muted-foreground mb-6">配置 API、隐私、截图节奏和本地接入</p>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground py-8">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <div v-else class="space-y-4">

      <!-- 卡片 1：通用 -->
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
            <div class="text-sm font-medium">自动记录工作</div>
            <div class="text-xs text-muted-foreground mt-0.5">开启后定时截图并识别当前工作状态</div>
          </div>
          <q-toggle :model-value="screenshotRunning" color="primary" keep-color @update:model-value="toggleAutoRecord" />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">全局快捷键</div>
            <div class="text-xs text-muted-foreground mt-0.5">快速记录当前工作状态</div>
          </div>
          <div class="flex items-center gap-2">
            <Keyboard class="w-4 h-4 text-muted-foreground" />
            <q-input v-model="settings.globalShortcut" dense outlined class="w-32" placeholder="Ctrl+Shift+J" @blur="save" />
          </div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">系统通知</div>
            <div class="text-xs text-muted-foreground mt-0.5">记录成功或跳过时显示通知</div>
          </div>
          <q-toggle v-model="settings.showNotifications" color="primary" keep-color @update:model-value="save" />
        </div>
      </section>

      <!-- 卡片 2：截图与记录 -->
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
          <q-select
            v-model="settings.screenshotIntervalSec"
            :options="screenshotIntervals"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            dense
            outlined
            class="w-36 interval-select"
            @update:model-value="(v) => saveField('screenshotIntervalSec', v)"
          >
            <template v-slot:prepend>
              <Clock class="w-3.5 h-3.5 text-muted-foreground" />
            </template>
          </q-select>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">视觉识别</div>
            <div class="text-xs text-muted-foreground mt-0.5">使用 AI 视觉模型分析截图内容</div>
          </div>
          <q-toggle v-model="settings.visionEnabled" color="primary" keep-color @update:model-value="save" />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-1">隐私级别</div>
          <div class="text-xs text-muted-foreground mb-3">控制截图记录的隐私策略</div>
          <q-select
            v-model="settings.privacyLevel"
            :options="privacyLevels"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            class="full-width privacy-select"
            @update:model-value="(v) => saveField('privacyLevel', v)"
          />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">截图分析后自动删除</div>
            <div class="text-xs text-muted-foreground mt-0.5">AI 分析完成后立即删除本地截图文件</div>
          </div>
          <q-toggle v-model="settings.autoDeleteScreenshots" color="primary" keep-color @update:model-value="save" />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">敏感场景自动跳过</div>
            <div class="text-xs text-muted-foreground mt-0.5">自动识别并跳过私人沟通、社交媒体等场景</div>
          </div>
          <q-toggle v-model="settings.sensitiveSceneSkip" color="primary" keep-color @update:model-value="save" />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">识别当前屏幕</div>
            <div class="text-xs text-muted-foreground">{{ captureStatus }}</div>
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
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">完成通知</div>
            <div class="text-xs text-muted-foreground mt-0.5">报告生成、识别完成时弹出系统通知</div>
          </div>
          <q-toggle v-model="settings.showNotifications" color="primary" keep-color @update:model-value="save" />
        </div>
      </section>

      <!-- 卡片 3：AI 分析 -->
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
          <div class="text-sm font-medium mb-2">API Base URL</div>
          <q-input v-model="settings.baseUrl" outlined dense class="full-width api-input" @blur="save" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium">API Key</div>
            <button class="btn-ghost btn-icon btn-sm" @click="showKey = !showKey" :title="showKey ? '隐藏' : '显示'">
              <Eye v-if="!showKey" class="w-3.5 h-3.5" />
              <EyeOff v-else class="w-3.5 h-3.5" />
            </button>
          </div>
          <q-input
            v-model="settings.apiKey"
            :type="showKey ? 'text' : 'password'"
            outlined
            dense
            class="full-width api-input"
            @blur="save"
            placeholder="sk-..."
          />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-2">报告生成模型</div>
          <q-input v-model="settings.model" outlined dense class="full-width api-input" @blur="save" placeholder="如 gpt-4o、doubao-pro-32k" />
        </div>
        <div class="px-5 py-3 border-t">
          <div class="text-sm font-medium mb-2">截图分析模型</div>
          <q-input v-model="settings.visionModel" outlined dense class="full-width api-input" @blur="save" placeholder="如 gpt-4o、doubao-vision-pro" />
        </div>
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
          <q-toggle :model-value="false" color="primary" keep-color disable />
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">每日定时生成日报</div>
            <div class="text-xs text-muted-foreground mt-0.5">指定时间自动基于当日工作记录生成日报</div>
          </div>
          <div class="flex items-center gap-2">
            <q-input
              type="time"
              v-model="settings.scheduledReportTime"
              dense
              outlined
              class="w-28 time-input"
              :disable="!settings.scheduledReportEnabled"
              @blur="saveField('scheduledReportTime', settings.scheduledReportTime)"
            />
            <q-toggle
              :model-value="settings.scheduledReportEnabled"
              color="primary"
              keep-color
              @update:model-value="(v) => saveField('scheduledReportEnabled', v)"
            />
          </div>
        </div>
        <div class="px-5 py-3 flex items-center gap-4 border-t">
          <div class="flex-1">
            <div class="text-sm font-medium">截图保留路径</div>
            <div class="text-xs text-muted-foreground mt-0.5">未开启"截图即销毁"时，截图保存到此目录（留空使用默认）</div>
          </div>
          <q-input
            v-model="settings.preservePath"
            dense
            outlined
            class="w-48 api-input"
            placeholder="默认路径"
            @blur="saveField('preservePath', settings.preservePath)"
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
            <q-toggle
              :model-value="apiStatus?.running ?? false"
              :disable="apiToggling"
              color="primary"
              keep-color
              @update:model-value="toggleLocalApi"
            />
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted-foreground mb-1 block">端口</label>
              <div class="flex items-center gap-1">
                <q-input
                  type="number"
                  v-model="apiPortDraft"
                  dense
                  outlined
                  class="w-24 api-input"
                  min="1024"
                  max="65535"
                  @blur="applyApiPort"
                />
                <button class="btn-ghost btn-sm" @click="applyApiPort">应用</button>
              </div>
            </div>
            <div>
              <label class="text-xs text-muted-foreground mb-1 block">Token</label>
              <div class="flex items-center gap-1">
                <q-input
                  :model-value="apiStatus?.token || ''"
                  readonly
                  dense
                  outlined
                  class="w-32 api-input"
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
      </section>

      <div class="text-xs text-muted-foreground text-center pb-4 pt-2">
        牙牙乐日报助手 · 开源免费 · 自有 API Key
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Quasar 控件皮肤统一到 design token */
:deep(.q-field--outlined .q-field__control) {
  border-radius: 10px !important;
  background: hsl(var(--background));
  min-height: 36px;
  padding: 0 10px;
}
:deep(.q-field--outlined .q-field__control):hover {
  border-color: hsl(var(--muted-foreground) / 0.3);
}
:deep(.q-field--outlined.q-field--focused .q-field__control) {
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.14);
  border-color: hsl(var(--primary));
}
:deep(.q-field__native),
:deep(.q-field__input) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  letter-spacing: 0.01em;
  color: hsl(var(--foreground));
  min-height: 36px;
  padding: 0;
}
:deep(.api-input .q-field__native),
:deep(.api-input .q-field__input) {
  font-size: 12px;
}
:deep(.interval-select .q-field__native),
:deep(.privacy-select .q-field__native),
:deep(.interval-select .q-field__input),
:deep(.privacy-select .q-field__input) {
  font-family: inherit;
  font-size: 13px;
}
:deep(.time-input input) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}

/* Quasar 列表 / 选项弹窗 */
:deep(.q-menu) {
  border-radius: 10px;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 12px 28px hsl(27 30% 20% / 0.10);
}
:deep(.q-item) {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
  color: hsl(var(--foreground));
}
:deep(.q-item:hover) {
  background: hsl(var(--accent));
}
:deep(.q-item--active) {
  color: hsl(27 92% 50%);
  background: hsl(27 92% 63% / 0.10);
}

/* Quasar toggle 圆角 */
:deep(.q-toggle__inner) {
  color: hsl(var(--primary));
}
</style>
