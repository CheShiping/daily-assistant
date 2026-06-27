<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Gift, Copy, Check, Users, Link, Sparkles } from 'lucide-vue-next'
import type { AppSettings } from '@/types'
import { safeCall, FALLBACK_SETTINGS } from '@/lib/utils'

const settings = ref<AppSettings>({ ...FALLBACK_SETTINGS })
const inviteCode = ref('')
const inviteLink = ref('')
const codeCopied = ref(false)
const linkCopied = ref(false)

async function load() {
  const s = await safeCall(() => window.api.settings.get(), { ...FALLBACK_SETTINGS })
  settings.value = { ...FALLBACK_SETTINGS, ...s }
  // 若无邀请码，本地生成一个稳定的（基于现有 inviteCode 或随机）
  if (!settings.value.inviteCode) {
    const code = 'YAYA-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    if (typeof window !== 'undefined' && (window as any).api?.settings?.update) {
      await (window as any).api.settings.update({ inviteCode: code })
    }
    settings.value.inviteCode = code
  }
  inviteCode.value = settings.value.inviteCode
  inviteLink.value = `https://daily-assistant.app/invite?code=${inviteCode.value}`
}

async function copyText(text: string, type: 'code' | 'link') {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'code') {
      codeCopied.value = true
      setTimeout(() => (codeCopied.value = false), 1500)
    } else {
      linkCopied.value = true
      setTimeout(() => (linkCopied.value = false), 1500)
    }
  } catch {
    alert('复制失败，请手动选择复制')
  }
}

onMounted(load)
</script>

<template>
  <div class="p-6 px-7 max-w-[1280px] mx-auto pb-12 w-full h-full overflow-y-auto min-h-0">
    <div class="text-center mb-8">
      <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Gift class="w-6 h-6 text-primary" />
      </div>
      <h1 class="text-2xl font-bold">邀请有礼</h1>
      <p class="text-sm text-muted-foreground mt-1">分享给同事朋友，一起高效写日报</p>
    </div>

    <!-- 邀请码 -->
    <section class="card p-5 mb-4">
      <div class="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Users class="w-4 h-4 text-muted-foreground" /> 我的邀请码
      </div>
      <div class="flex items-center gap-2">
        <input
          type="text"
          readonly
          :value="inviteCode"
          class="input flex-1 h-10 font-mono text-lg tracking-widest text-center"
        />
        <button class="btn-primary btn-icon h-10 w-10 flex items-center justify-center" @click="copyText(inviteCode, 'code')">
          <Check v-if="codeCopied" class="w-4 h-4" />
          <Copy v-else class="w-4 h-4" />
        </button>
      </div>
      <p class="text-xs text-muted-foreground mt-2">点击右侧按钮复制邀请码</p>
    </section>

    <!-- 邀请链接 -->
    <section class="card p-5 mb-4">
      <div class="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Link class="w-4 h-4 text-muted-foreground" /> 邀请链接
      </div>
      <div class="flex items-center gap-2">
        <input
          type="text"
          readonly
          :value="inviteLink"
          class="input flex-1 h-10 text-xs font-mono"
        />
        <button class="btn-primary btn-icon h-10 w-10 flex items-center justify-center" @click="copyText(inviteLink, 'link')">
          <Check v-if="linkCopied" class="w-4 h-4" />
          <Copy v-else class="w-4 h-4" />
        </button>
      </div>
      <p class="text-xs text-muted-foreground mt-2">复制链接发送给朋友，他们打开即可下载应用</p>
    </section>

    <!-- 使用说明 -->
    <section class="card p-5">
      <div class="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Sparkles class="w-4 h-4 text-muted-foreground" /> 如何使用
      </div>
      <ol class="space-y-2.5 text-sm text-foreground/80 list-decimal pl-5">
        <li>复制上方的邀请码或邀请链接</li>
        <li>发送给同事、朋友或工作群</li>
        <li>对方通过链接下载并安装牙牙乐日报助手</li>
        <li>对方在设置中输入你的邀请码即可绑定</li>
      </ol>
      <div class="mt-4 p-3 rounded-lg bg-primary/5 text-xs text-primary/80">
        邀请功能为纯分享机制，邀请记录和奖励将在后续版本提供。
      </div>
    </section>
  </div>
</template>
