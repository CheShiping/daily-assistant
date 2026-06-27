<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { marked } from 'marked'
import type { Report } from '@/types'
import { formatDateTime } from '@/lib/utils'
import {
  Loader2, FileText, Trash2, Edit3, Eye, Download, ArrowLeft,
  PencilLine, Save, X, Search
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const reports = ref<Report[]>([])
const selected = ref<Report | null>(null)
const editing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const searchQuery = ref('')

async function load() {
  loading.value = true
  reports.value = await window.api.reports.list({ limit: 200 })
  // 从 query 自动选中
  const id = route.query.id as string
  if (id) {
    const r = reports.value.find(x => x.id === id)
    if (r) selectReport(r)
  } else if (reports.value.length > 0) {
    selectReport(reports.value[0])
  }
  loading.value = false
}

function selectReport(r: Report) {
  selected.value = r
  editing.value = false
}

function startEdit() {
  if (!selected.value) return
  editTitle.value = selected.value.title
  editContent.value = selected.value.content
  editing.value = true
}

async function saveEdit() {
  if (!selected.value) return
  await window.api.reports.updateTitle(selected.value.id, editTitle.value)
  await window.api.reports.updateContent(selected.value.id, editContent.value)
  selected.value.title = editTitle.value
  selected.value.content = editContent.value
  editing.value = false
}

function cancelEdit() { editing.value = false }

async function deleteReport(r: Report) {
  if (!confirm(`确认删除报告「${r.title}」？`)) return
  await window.api.reports.delete(r.id)
  reports.value = reports.value.filter(x => x.id !== r.id)
  if (selected.value?.id === r.id) {
    selected.value = reports.value[0] ?? null
  }
}

async function exportReport(r: Report, fmt: 'md' | 'txt') {
  await window.api.reports.exportToFile(r.id, fmt)
}

const filteredReports = computed(() => {
  if (!searchQuery.value) return reports.value
  const q = searchQuery.value.toLowerCase()
  return reports.value.filter(r => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q))
})

function previewHtml(content: string): string {
  return marked.parse(content || '*暂无内容*') as string
}

onMounted(load)
</script>

<template>
  <div class="h-full flex">
    <!-- 左侧：报告列表 -->
    <div class="w-72 border-r flex flex-col flex-shrink-0">
      <div class="p-3 border-b">
        <div class="relative">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input v-model="searchQuery" class="input h-8 pl-7 w-full" placeholder="搜索报告..." />
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="loading" class="flex items-center justify-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
        </div>
        <div v-else-if="filteredReports.length === 0" class="text-center text-muted-foreground text-sm py-8">
          暂无报告
        </div>
        <button
          v-for="r in filteredReports"
          :key="r.id"
          @click="selectReport(r)"
          :class="[
            'w-full text-left p-3 border-b hover:bg-accent/40 transition-colors',
            selected?.id === r.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
          ]"
        >
          <div class="text-sm font-medium truncate">{{ r.title }}</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{{ r.type === 'daily' ? '日报' : r.type === 'weekly' ? '周报' : '月报' }}</span>
            <span class="text-xs text-muted-foreground">{{ formatDateTime(r.createdAt) }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 右侧：报告详情 / 预览 -->
    <div class="flex-1 flex flex-col min-w-0">
      <div v-if="!selected" class="flex-1 flex items-center justify-center text-muted-foreground">
        <div class="text-center">
          <FileText class="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p class="text-sm">选择左侧报告查看详情</p>
          <button class="btn-primary btn-sm mt-3" @click="router.push('/generate')">
            生成新报告
          </button>
        </div>
      </div>

      <template v-else>
        <!-- 顶栏 -->
        <div class="border-b p-4 flex items-center gap-3">
          <button class="btn-ghost btn-icon btn-sm" @click="router.push('/generate')">
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div class="flex-1 min-w-0">
            <div v-if="!editing" class="font-semibold truncate">{{ selected.title }}</div>
            <input v-else v-model="editTitle" class="input h-8 w-full" />
          </div>
          <div v-if="!editing" class="flex items-center gap-1">
            <button class="btn-outline btn-sm" @click="exportReport(selected, 'md')">
              <Download class="w-3.5 h-3.5" /> 导出
            </button>
            <button class="btn-outline btn-sm" @click="startEdit">
              <PencilLine class="w-3.5 h-3.5" /> 编辑
            </button>
            <button class="btn-outline btn-sm text-destructive border-destructive/30 hover:bg-destructive/10" @click="deleteReport(selected)">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
          <div v-else class="flex items-center gap-1">
            <button class="btn-primary btn-sm" @click="saveEdit">
              <Save class="w-3.5 h-3.5" /> 保存
            </button>
            <button class="btn-outline btn-sm" @click="cancelEdit">
              <X class="w-3.5 h-3.5" /> 取消
            </button>
          </div>
        </div>

        <!-- 内容区：编辑/预览 -->
        <div class="flex-1 overflow-hidden flex">
          <div v-if="editing" class="w-1/2 border-r overflow-y-auto p-4">
            <textarea
              v-model="editContent"
              class="w-full h-full resize-none border-0 focus:ring-0 text-sm font-mono outline-none"
              placeholder="Markdown 内容..."
            ></textarea>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <div
              class="prose prose-sm max-w-none dark:prose-invert"
              v-html="editing ? previewHtml(editContent) : previewHtml(selected.content)"
            ></div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
