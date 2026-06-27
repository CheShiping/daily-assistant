<script setup lang="ts">
import { Bot, Sparkles } from 'lucide-vue-next'
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto pb-12">
    <div class="card p-10 text-center">
      <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Bot class="w-8 h-8 text-primary" />
      </div>
      <h1 class="text-2xl font-bold mb-2">接入 Agent</h1>
      <p class="text-sm text-muted-foreground mb-6">
        通过 MCP 协议接入外部 Agent，让牙牙乐日报助手成为你工作流中的一环。
      </p>
      <div class="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
        <Sparkles class="w-3 h-3" /> 即将上线
      </div>
      <div class="mt-8 text-left bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
        <p class="font-medium text-foreground mb-2">规划中的能力：</p>
        <ul class="space-y-1 list-disc pl-5">
          <li>支持 MCP 协议，可接入任意兼容 Agent</li>
          <li>把日报生成能力暴露为工具，供其他 Agent 调用</li>
          <li>接入任务管理 Agent，自动从待办生成日报</li>
          <li>支持自定义 Hook，扩展分析能力</li>
        </ul>
      </div>
    </div>
  </div>
</template>
