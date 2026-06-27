<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { marked } from 'marked'
import type { ReportTemplate } from '@/types'
import { Loader2, Plus, Trash2, Pencil, Sparkles, Save, X } from 'lucide-vue-next'

const templates = ref<ReportTemplate[]>([])
const loading = ref(true)
const showEditor = ref(false)
const editingId = ref<string | null>(null)
const editor = ref({ name: '', type: 'daily' as 'daily' | 'weekly' | 'monthly', content: '' })

// AI 生成
const showGenerate = ref(false)
const genForm = ref({ reference: '', requirements: '', type: 'daily' as 'daily' | 'weekly' | 'monthly' })
const generating = ref(false)
const genContent = ref('')
let unsubStream: (() => void) | null = null
let unsubStatus: (() => void) | null = null
const errorMessage = ref('')

function showError(msg: string) {
  errorMessage.value = msg
  setTimeout(() => {
    if (errorMessage.value === msg) {
      errorMessage.value = ''
    }
  }, 3000)
}

const typeLabels = { daily: '日报', weekly: '周报', monthly: '月报' }

const renderedContent = computed(() => editor.value.content ? marked.parse(editor.value.content) as string : '')

async function load() {
  loading.value = true
  templates.value = await window.api.reportTemplates.list()
  loading.value = false
}

function openCreate() {
  editingId.value = null
  editor.value = { name: '', type: 'daily', content: '# {{标题}}\n\n## 今日完成\n{{今日完成}}\n\n## 明日计划\n{{明日计划}}' }
  showEditor.value = true
}

function openEdit(t: ReportTemplate) {
  if (t.isBuiltin) {
    // 内置模板只读
    editingId.value = null
    editor.value = { name: t.name, type: t.type, content: t.content }
    showEditor.value = true
    return
  }
  editingId.value = t.id
  editor.value = { name: t.name, type: t.type, content: t.content }
  showEditor.value = true
}

async function save() {
  if (!editor.value.name.trim() || !editor.value.content.trim()) return
  if (editingId.value) {
    await window.api.reportTemplates.update({
      id: editingId.value,
      name: editor.value.name,
      content: editor.value.content
    })
  } else {
    await window.api.reportTemplates.create({
      name: editor.value.name,
      type: editor.value.type,
      content: editor.value.content
    })
  }
  showEditor.value = false
  await load()
}

async function remove(id: string) {
  if (!confirm('确认删除这个模板？')) return
  try {
    await window.api.reportTemplates.delete(id)
    await load()
  } catch (e) {
    showError((e as Error).message)
  }
}

function openGenerate() {
  genForm.value = { reference: '', requirements: '', type: 'daily' }
  genContent.value = ''
  showGenerate.value = true
}

async function generate() {
  generating.value = true
  genContent.value = ''
  await window.api.ai.generateTemplate({
    reference: genForm.value.reference,
    requirements: genForm.value.requirements,
    type: genForm.value.type
  })
  unsubStream = window.api.ai.onTemplateStreamChunk((data) => {
    genContent.value += data.chunk
  })
  unsubStatus = window.api.ai.onTemplateStatusChanged((data) => {
    generating.value = false
    if (data.status === 'completed') {
      genContent.value = data.content
    } else if (data.status === 'failed') {
      showError('生成失败：' + (data.error ?? '未知错误'))
    }
  })
}

function useGenerated() {
  editor.value = {
    name: 'AI 生成模板',
    type: genForm.value.type,
    content: genContent.value
  }
  showGenerate.value = false
  showEditor.value = true
  editingId.value = null
}

onMounted(load)
onUnmounted(() => {
  unsubStream?.()
  unsubStatus?.()
})
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- 错误提示 -->
    <div v-if="errorMessage" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg text-sm flex items-center gap-2 transition-all">
      <span>{{ errorMessage }}</span>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">报告模板</h1>
      <div class="flex gap-2">
        <button class="btn-outline" @click="openGenerate"><Sparkles class="w-4 h-4" /> AI 生成</button>
        <button class="btn-primary" @click="openCreate"><Plus class="w-4 h-4" /> 新建模板</button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="t in templates"
        :key="t.id"
        class="card p-4 cursor-pointer hover:shadow-md transition-shadow group"
        @click="openEdit(t)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="font-medium flex items-center gap-2">
              {{ t.name }}
              <span v-if="t.isBuiltin" class="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">内置</span>
            </div>
            <div class="text-xs text-muted-foreground mt-1">{{ typeLabels[t.type] }}</div>
          </div>
          <button
            v-if="!t.isBuiltin"
            class="btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100 hover:text-destructive"
            @click.stop="remove(t.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
        <pre class="text-xs text-muted-foreground mt-2 line-clamp-3 font-mono whitespace-pre-wrap">{{ t.content }}</pre>
      </div>
    </div>

    <!-- 编辑器 -->
    <div v-if="showEditor" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showEditor = false">
      <div class="card w-full max-w-4xl mx-4 my-8 flex flex-col" style="max-height: 90vh">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="font-semibold">{{ editingId ? '编辑模板' : '新建模板' }}</h3>
          <button class="btn-ghost btn-icon btn-sm" @click="showEditor = false"><X class="w-4 h-4" /></button>
        </div>
        <div class="p-4 flex-1 overflow-auto grid grid-cols-2 gap-4">
          <div class="space-y-3">
            <div>
              <label class="label mb-1 block">名称</label>
              <input v-model="editor.name" class="input" :disabled="!!editingId && templates.find(t => t.id === editingId)?.isBuiltin" />
            </div>
            <div>
              <label class="label mb-1 block">类型</label>
              <select v-model="editor.type" class="input" :disabled="!!editingId">
                <option value="daily">日报</option>
                <option value="weekly">周报</option>
                <option value="monthly">月报</option>
              </select>
            </div>
            <div>
              <label class="label mb-1 block" v-pre>模板内容（Markdown，用 {{占位符}} 表示可变内容）</label>
              <textarea v-model="editor.content" class="textarea font-mono text-xs" rows="18"></textarea>
            </div>
          </div>
          <div>
            <label class="label mb-2 block">预览</label>
            <div class="border rounded-md p-4 h-[500px] overflow-auto markdown-body text-sm bg-muted/30" v-html="renderedContent"></div>
          </div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t">
          <button class="btn-outline" @click="showEditor = false">取消</button>
          <button
            v-if="!editingId || !templates.find(t => t.id === editingId)?.isBuiltin"
            class="btn-primary"
            @click="save"
          >
            <Save class="w-4 h-4" /> 保存
          </button>
        </div>
      </div>
    </div>

    <!-- AI 生成 -->
    <div v-if="showGenerate" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showGenerate = false">
      <div class="card p-6 w-full max-w-2xl mx-4" style="max-height: 90vh">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">AI 生成模板</h3>
          <button class="btn-ghost btn-icon btn-sm" @click="showGenerate = false"><X class="w-4 h-4" /></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="label mb-1 block">报告类型</label>
            <select v-model="genForm.type" class="input">
              <option value="daily">日报</option>
              <option value="weekly">周报</option>
              <option value="monthly">月报</option>
            </select>
          </div>
          <div>
            <label class="label mb-1 block">参考报告（粘贴历史报告作为参考）</label>
            <textarea v-model="genForm.reference" class="textarea font-mono text-xs" rows="5" placeholder="可选，留空则按通用风格生成"></textarea>
          </div>
          <div>
            <label class="label mb-1 block">自定义需求</label>
            <textarea v-model="genForm.requirements" class="textarea" rows="3" placeholder="例如：成果导向型，突出数据，简洁风格"></textarea>
          </div>
          <button class="btn-primary" :disabled="generating" @click="generate">
            <Loader2 v-if="generating" class="w-4 h-4 animate-spin" />
            <Sparkles v-else class="w-4 h-4" />
            {{ generating ? '生成中...' : '开始生成' }}
          </button>
          <div v-if="genContent" class="border rounded-md p-4 max-h-80 overflow-auto">
            <div class="markdown-body text-sm" v-html="marked.parse(genContent)"></div>
            <button class="btn-primary btn-sm mt-3" @click="useGenerated">使用此模板</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
