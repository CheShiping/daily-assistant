<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Crown, Check, Sparkles, Loader2 } from 'lucide-vue-next'
import type { AppSettings } from '@/types'
import { safeCall, FALLBACK_SETTINGS } from '@/lib/utils'

const router = useRouter()
const settings = ref<AppSettings>({ ...FALLBACK_SETTINGS })
const loading = ref(true)
const purchasing = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const s = await safeCall(() => window.api.settings.get(), { ...FALLBACK_SETTINGS })
    settings.value = { ...FALLBACK_SETTINGS, ...s }
  } finally {
    loading.value = false
  }
}

onMounted(load)

const plans = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '永久',
    desc: '适合个人日常使用',
    features: [
      '截图识别 + 工作记录',
      '日报/周报/月报生成',
      '时段热力图',
      '应用使用统计',
      'AI 洞察建议',
      '本地 HTTP API',
      '每日 5 次报告生成',
      '每日 20 次 AI 对话'
    ],
    cta: '当前方案',
    highlight: false
  },
  {
    id: 'pro',
    name: 'Pro 版',
    price: '¥19',
    period: '/ 月',
    desc: '适合高频协作与深度分析',
    features: [
      '免费版全部功能',
      '无限次报告生成',
      '无限次 AI 对话',
      '多模板聚类策略',
      '历史数据趋势分析',
      '优先支持新功能',
      '去除所有用量限制'
    ],
    cta: '升级到 Pro',
    highlight: true
  }
]

const comparison = [
  { feature: '工作记录', free: '不限', pro: '不限' },
  { feature: '报告生成', free: '5 次/天', pro: '无限' },
  { feature: 'AI 对话', free: '20 次/天', pro: '无限' },
  { feature: 'AI 洞察', free: '✓', pro: '✓' },
  { feature: '本地 API', free: '✓', pro: '✓' },
  { feature: '模板聚类', free: '基础', pro: '全部' },
  { feature: '趋势分析', free: '—', pro: '✓' },
  { feature: '优先支持', free: '—', pro: '✓' }
]

async function subscribe(planId: string) {
  if (planId === 'free') return
  purchasing.value = planId
  // 纯前端 UI，仅模拟
  setTimeout(() => {
    purchasing.value = null
    alert('支付功能即将开通，敬请期待。当前可继续使用免费版全部核心功能。')
  }, 800)
}

const isPro = ref(false)
onMounted(async () => {
  const s = await safeCall(() => window.api.settings.get(), { ...FALLBACK_SETTINGS })
  isPro.value = s.subscription === 'pro'
})
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto pb-12 w-full h-full overflow-y-auto min-h-0">
    <div class="text-center mb-8">
      <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Crown class="w-6 h-6 text-primary" />
      </div>
      <h1 class="text-2xl font-bold">订阅方案</h1>
      <p class="text-sm text-muted-foreground mt-1">选择适合你的方案，核心功能始终免费</p>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground justify-center py-12">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <template v-else>
      <!-- 当前订阅状态 -->
      <div v-if="isPro" class="card p-4 mb-6 flex items-center gap-3 bg-primary/5 border-primary/30">
        <Crown class="w-5 h-5 text-primary" />
        <div class="flex-1">
          <div class="text-sm font-medium">Pro 版已激活</div>
          <div class="text-xs text-muted-foreground">到期时间：{{ settings?.subscriptionExpiry ?? '—' }}</div>
        </div>
      </div>

      <!-- 定价卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="card p-6 relative"
          :class="plan.highlight ? 'border-primary ring-1 ring-primary/30' : ''"
        >
          <div v-if="plan.highlight" class="absolute -top-2.5 left-6 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center gap-1">
            <Sparkles class="w-2.5 h-2.5" /> 推荐
          </div>
          <div class="text-sm font-medium text-muted-foreground">{{ plan.name }}</div>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-3xl font-bold">{{ plan.price }}</span>
            <span class="text-sm text-muted-foreground">{{ plan.period }}</span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ plan.desc }}</p>

          <button
            class="w-full mt-4 py-2 rounded-md text-sm font-medium transition-colors"
            :class="plan.highlight
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border hover:bg-accent'"
            :disabled="purchasing === plan.id || (plan.id === 'free' && !isPro) || (plan.id === 'pro' && isPro)"
            @click="subscribe(plan.id)"
          >
            <Loader2 v-if="purchasing === plan.id" class="w-3.5 h-3.5 animate-spin inline" />
            {{ isPro && plan.id === 'pro' ? '已订阅' : (isPro && plan.id === 'free' ? '降级' : plan.cta) }}
          </button>

          <div class="mt-5 space-y-2">
            <div v-for="f in plan.features" :key="f" class="flex items-start gap-2 text-sm">
              <Check class="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              <span class="text-foreground/80">{{ f }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能对比 -->
      <div class="card overflow-hidden">
        <div class="px-5 py-3 border-b text-sm font-semibold">功能对比</div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-xs text-muted-foreground">
              <th class="text-left px-5 py-2.5 font-medium">功能</th>
              <th class="text-center px-5 py-2.5 font-medium">免费版</th>
              <th class="text-center px-5 py-2.5 font-medium">Pro 版</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison" :key="row.feature" class="border-b last:border-0">
              <td class="px-5 py-2.5">{{ row.feature }}</td>
              <td class="px-5 py-2.5 text-center text-muted-foreground">{{ row.free }}</td>
              <td class="px-5 py-2.5 text-center text-foreground font-medium">{{ row.pro }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-xs text-muted-foreground text-center mt-6">
        牙牙乐日报助手核心功能永久免费 · 自有 API Key，无中间商加价
      </p>
    </template>
  </div>
</template>
