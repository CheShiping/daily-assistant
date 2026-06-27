<script setup lang="ts">
import { ref, onMounted, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import type { AppSettings } from '@/types'
import {
  Loader2, CheckCircle2, XCircle, Eye, EyeOff,
  Settings as SettingsIcon, Camera, Brain, Database, Sparkles,
  Trash2, Download, Upload, ChevronDown, Wand2, Languages, Clock
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

const intervalOpen = ref(false)
const screenshotIntervals = [
  { label: '1 分钟', value: 60 },
  { label: '2 分钟', value: 120 },
  { label: '3 分钟', value: 180 },
  { label: '5 分钟', value: 300 },
  { label: '20 分钟', value: 1200 }
]

async function load() {
  loading.value = true
  settings.value = await window.api.settings.get()
  excludedAppsText.value = (settings.value.excludedApps ?? []).join('\n')
  loading.value = false
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

async function clearData() {
  if (!confirm('确认清空所有本地数据？此操作不可恢复')) return
  await window.api.dataManagement.clear()
  alert('已清空')
}
async function exportData() { await window.api.dataManagement.export() }
async function importData() {
  const r = await window.api.dataManagement.import()
  if (r.ok) alert('导入成功')
}

onMounted(load)
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto pb-12">
    <h1 class="text-2xl font-bold mb-6">设置</h1>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <div v-else-if="settings" class="space-y-4">

      <!-- 通用 -->
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
            <div class="text-sm font-medium">开机自启动</div>
            <div class="text-xs text-muted-foreground mt-0.5">登录系统后自动运行</div>
          </div>
          <Switch :model-value="false" disabled />
        </div>
      </section>

      <!-- 截图与记录 -->
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
            <div class="text-sm font-medium">截图保留</div>
            <div class="text-xs text-muted-foreground mt-0.5">仅保留近 1 天未处理的历史</div>
          </div>
          <Switch :model-value="true" disabled />
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
      </section>

      <!-- AI 分析 -->
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
            <div class="text-sm font-medium mb-2">报告生成模型</div>
            <input v-model="settings.model" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="如 gpt-4o、doubao-pro-32k" />
          </div>
          <div class="px-5 py-3 border-t">
            <div class="text-sm font-medium mb-2">截图分析模型</div>
            <input v-model="settings.visionModel" class="input w-full h-8 font-mono text-xs" @change="save" placeholder="如 gpt-4o、doubao-vision-pro" />
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
      </section>

      <!-- 数据管理 -->
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
      </section>

      <div class="text-xs text-muted-foreground text-center pb-4 pt-2">
        牙牙乐日报助手 · 开源免费 · 自有 API Key
      </div>
    </div>
  </div>
</template>
