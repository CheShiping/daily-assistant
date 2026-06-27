<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { HelpCircle, Keyboard, Github, ChevronDown, Info, ExternalLink } from 'lucide-vue-next'

const version = ref('')
const openFaq = ref<number | null>(0)

onMounted(async () => {
  try { version.value = await window.api.getVersion() } catch {}
})

const faqs = [
  {
    q: '截图识别不工作怎么办？',
    a: '请依次检查：1) 设置 → AI 分析中 API Key 是否已配置；2) 设置 → 截图与记录中"视觉识别"是否开启；3) 截图分析模型是否支持视觉（如 gpt-4o）；4) 点击"连接测试"验证 API 可用性。'
  },
  {
    q: '报告生成失败如何排查？',
    a: '常见原因：API Key 无效、模型名称错误、网络不通。请先在设置页点击"测试"按钮，确认连接正常。若使用自定义模型，请确保模型名称与服务商文档一致。'
  },
  {
    q: '数据存储在哪里？如何备份？',
    a: '所有数据存储在系统 userData 目录下的 daily-assistant.json 文件中。可在设置 → 数据管理中点击"导出"生成 JSON 备份，或"导入"从备份恢复。'
  },
  {
    q: '支持哪些 AI 模型？',
    a: '支持任意 OpenAI 兼容 API，包括 OpenAI、DeepSeek、通义千问、智谱、本地 Ollama 等。只需在设置中填写对应的 Base URL、API Key 和模型名称。'
  },
  {
    q: '如何保护隐私？',
    a: '默认开启"截图即销毁"和"敏感场景跳过"。所有数据仅存本地，使用自有 API Key 直连模型服务商。可在隐私保护页查看详细机制，或在设置中调整隐私级别。'
  },
  {
    q: '本地 HTTP API 怎么用？',
    a: '在设置 → 实验 → 本地 API 服务中开启，生成 Token 后即可通过 http://localhost:8088 调用。支持查询工作记录、报告、应用使用等，可用于接入外部 Agent 或自动化脚本。'
  },
  {
    q: '今日计划如何使用？',
    a: '在"今日工作"页可添加今日计划，支持勾选完成、双击编辑、拖拽排序。生成日报时会自动注入计划，AI 会对比"计划 vs 实际"给出完成情况说明。'
  }
]

const shortcuts = [
  { key: 'Ctrl + Shift + J', desc: '快速记录当前工作状态（全局快捷键）' },
  { key: 'Enter', desc: '在非输入框中触发截图识别' },
  { key: 'Esc', desc: '取消当前编辑' }
]

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

async function openGithub() {
  await window.api.openExternal('https://github.com/daily-assistant/daily-assistant')
}
</script>

<template>
  <div class="p-6 px-7 max-w-3xl mx-auto pb-12 w-full h-full overflow-y-auto min-h-0">
    <div class="text-center mb-8">
      <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <HelpCircle class="w-6 h-6 text-primary" />
      </div>
      <h1 class="text-2xl font-bold">帮助</h1>
      <p class="text-sm text-muted-foreground mt-1">常见问题与使用指南</p>
    </div>

    <!-- FAQ -->
    <section class="mb-6">
      <div class="text-sm font-semibold mb-3 px-1">常见问题</div>
      <div class="space-y-2">
        <div v-for="(faq, i) in faqs" :key="i" class="card overflow-hidden">
          <button
            class="w-full px-4 py-3 flex items-center gap-3 text-left"
            @click="toggleFaq(i)"
          >
            <span class="flex-1 text-sm font-medium">{{ faq.q }}</span>
            <ChevronDown class="w-4 h-4 text-muted-foreground transition-transform flex-shrink-0" :class="openFaq === i ? 'rotate-180' : ''" />
          </button>
          <div v-if="openFaq === i" class="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t pt-3">
            {{ faq.a }}
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷键 -->
    <section class="mb-6">
      <div class="text-sm font-semibold mb-3 px-1 flex items-center gap-2">
        <Keyboard class="w-4 h-4 text-muted-foreground" /> 快捷键
      </div>
      <div class="card p-4 space-y-2.5">
        <div v-for="s in shortcuts" :key="s.key" class="flex items-center gap-3 text-sm">
          <kbd class="px-2 py-1 rounded bg-muted text-xs font-mono border border-border min-w-[120px] text-center">{{ s.key }}</kbd>
          <span class="text-muted-foreground">{{ s.desc }}</span>
        </div>
      </div>
    </section>

    <!-- 联系与版本 -->
    <section class="grid grid-cols-2 gap-3">
      <button class="card p-4 text-left hover:border-primary/50 transition-colors" @click="openGithub">
        <div class="flex items-center gap-2 mb-1">
          <Github class="w-4 h-4 text-muted-foreground" />
          <span class="text-sm font-medium">项目仓库</span>
          <ExternalLink class="w-3 h-3 text-muted-foreground ml-auto" />
        </div>
        <p class="text-xs text-muted-foreground">GitHub 查看源码、提 Issue、参与贡献</p>
      </button>
      <div class="card p-4">
        <div class="flex items-center gap-2 mb-1">
          <Info class="w-4 h-4 text-muted-foreground" />
          <span class="text-sm font-medium">版本信息</span>
        </div>
        <p class="text-xs text-muted-foreground">当前版本 v{{ version || '—' }}</p>
      </div>
    </section>

    <p class="text-xs text-muted-foreground text-center mt-8">
      牙牙乐日报助手 · 开源免费 · 自有 API Key
    </p>
  </div>
</template>
