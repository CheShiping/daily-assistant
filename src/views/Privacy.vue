<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Shield, HardDrive, Camera, EyeOff, Lock, Check, Settings as SettingsIcon, Cpu } from 'lucide-vue-next'
import type { AppSettings } from '@/types'
import { safeCall, FALLBACK_SETTINGS } from '@/lib/utils'

const router = useRouter()
const settings = ref<AppSettings>({ ...FALLBACK_SETTINGS })

async function load() {
  const s = await safeCall(() => window.api.settings.get(), { ...FALLBACK_SETTINGS })
  settings.value = { ...FALLBACK_SETTINGS, ...s }
}

onMounted(load)

const mechanisms = [
  {
    icon: HardDrive,
    title: '数据仅存本地',
    desc: '所有工作记录、报告、截图均保存在你本机的 userData 目录，不上传任何服务器。'
  },
  {
    icon: Camera,
    title: '截图即销毁',
    desc: 'AI 视觉分析完成后立即删除本地截图文件，绝不留存原始图像。可在设置中关闭。'
  },
  {
    icon: EyeOff,
    title: '敏感场景跳过',
    desc: '自动识别并跳过私人沟通、社交媒体等场景，相关内容脱敏后不纳入日报。'
  },
  {
    icon: Lock,
    title: '自有 API Key',
    desc: '使用你自己的 OpenAI 兼容 API Key，请求直连模型服务商，不经我们中转。'
  },
  {
    icon: Cpu,
    title: '本地模型支持',
    desc: '兼容任意 OpenAI 格式 API，可接入本地部署模型（如 Ollama），数据完全不出本机。'
  }
]
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto pb-12 w-full h-full overflow-y-auto min-h-0">
    <div class="text-center mb-8">
      <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Shield class="w-6 h-6 text-primary" />
      </div>
      <h1 class="text-2xl font-bold">隐私保护</h1>
      <p class="text-sm text-muted-foreground mt-1">你的工作数据，始终属于你</p>
    </div>

    <!-- 当前隐私状态 -->
    <section class="card p-5 mb-6">
      <div class="text-sm font-semibold mb-3">当前隐私状态</div>
      <div class="space-y-2.5">
        <div class="flex items-center gap-2 text-sm">
          <Check v-if="settings?.autoDeleteScreenshots" class="w-4 h-4 text-green-500" />
          <Check v-else class="w-4 h-4 text-muted-foreground/40" />
          <span class="flex-1">截图分析后即销毁</span>
          <span class="text-xs" :class="settings?.autoDeleteScreenshots ? 'text-green-600' : 'text-muted-foreground'">
            {{ settings?.autoDeleteScreenshots ? '已开启' : '已关闭' }}
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <Check v-if="settings?.sensitiveSceneSkip" class="w-4 h-4 text-green-500" />
          <Check v-else class="w-4 h-4 text-muted-foreground/40" />
          <span class="flex-1">敏感场景自动跳过</span>
          <span class="text-xs" :class="settings?.sensitiveSceneSkip ? 'text-green-600' : 'text-muted-foreground'">
            {{ settings?.sensitiveSceneSkip ? '已开启' : '已关闭' }}
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <Check class="w-4 h-4 text-green-500" />
          <span class="flex-1">数据本地存储</span>
          <span class="text-xs text-green-600">始终开启</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <Check class="w-4 h-4 text-green-500" />
          <span class="flex-1">自有 API Key 直连</span>
          <span class="text-xs text-green-600">始终开启</span>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-2 text-xs">
        <span class="text-muted-foreground">隐私级别：</span>
        <span class="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
          {{ settings?.privacyLevel === 'loose' ? '宽松' : settings?.privacyLevel === 'strict' ? '严格' : '标准' }}
        </span>
      </div>
      <button class="btn-outline btn-sm mt-4 flex items-center gap-1" @click="router.push('/settings')">
        <SettingsIcon class="w-3.5 h-3.5" /> 调整隐私设置
      </button>
    </section>

    <!-- 隐私保护机制 -->
    <section class="space-y-3">
      <div v-for="m in mechanisms" :key="m.title" class="card p-4 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <component :is="m.icon" class="w-4.5 h-4.5 text-primary" />
        </div>
        <div class="flex-1">
          <div class="text-sm font-medium">{{ m.title }}</div>
          <p class="text-xs text-muted-foreground mt-1 leading-relaxed">{{ m.desc }}</p>
        </div>
      </div>
    </section>

    <p class="text-xs text-muted-foreground text-center mt-6">
      牙牙乐日报助手是开源软件，你可随时审查源码验证隐私承诺
    </p>
  </div>
</template>
