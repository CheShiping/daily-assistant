<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { WorkRecord } from '@/types'
import { formatDate, formatTime, today } from '@/lib/utils'
import { Plus, Trash2, Pencil, Loader2, ChevronLeft, ChevronRight, Clock } from 'lucide-vue-next'

const records = ref<WorkRecord[]>([])
const loading = ref(true)
const selectedDate = ref(today())
const showAdd = ref(false)
const editingId = ref<string | null>(null)

const newRecord = ref({
  startedAt: '',
  summary: '',
  category: '',
  endedAt: ''
})

const categories = ['开发', '会议', '文档', '测试', '沟通', '设计', '运维', '数据分析', '学习', '管理', '产品', '生活', '其他']

const categoryColors: Record<string, string> = {
  开发: 'bg-blue-100 text-blue-700',
  会议: 'bg-purple-100 text-purple-700',
  文档: 'bg-amber-100 text-amber-700',
  测试: 'bg-green-100 text-green-700',
  沟通: 'bg-pink-100 text-pink-700',
  设计: 'bg-indigo-100 text-indigo-700',
  运维: 'bg-orange-100 text-orange-700',
  数据分析: 'bg-cyan-100 text-cyan-700',
  学习: 'bg-teal-100 text-teal-700',
  管理: 'bg-rose-100 text-rose-700',
  产品: 'bg-violet-100 text-violet-700',
  生活: 'bg-lime-100 text-lime-700',
  其他: 'bg-gray-100 text-gray-700'
}

const byCategory = computed(() => {
  const m: Record<string, number> = {}
  for (const r of records.value) {
    const c = r.category ?? '其他'
    m[c] = (m[c] ?? 0) + 1
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1])
})

async function load() {
  loading.value = true
  records.value = await window.api.workRecords.list({ date: selectedDate.value })
  loading.value = false
}

function prevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = formatDate(d)
  load()
}

function nextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = formatDate(d)
  load()
}

function openAdd() {
  editingId.value = null
  newRecord.value = { startedAt: new Date().toISOString(), summary: '', category: '', endedAt: '' }
  showAdd.value = true
}

function openEdit(r: WorkRecord) {
  editingId.value = r.id
  newRecord.value = {
    startedAt: r.startedAt,
    summary: r.summary,
    category: r.category ?? '',
    endedAt: r.endedAt ?? ''
  }
  showAdd.value = true
}

async function saveRecord() {
  if (!newRecord.value.summary.trim()) return
  if (editingId.value) {
    await window.api.workRecords.update({
      id: editingId.value,
      summary: newRecord.value.summary,
      category: newRecord.value.category || undefined,
      startedAt: newRecord.value.startedAt,
      endedAt: newRecord.value.endedAt || undefined
    })
  } else {
    await window.api.workRecords.create({
      startedAt: newRecord.value.startedAt,
      summary: newRecord.value.summary,
      category: newRecord.value.category || undefined,
      endedAt: newRecord.value.endedAt || undefined
    })
  }
  showAdd.value = false
  await load()
}

async function deleteRecord(id: string) {
  if (!confirm('确认删除这条记录？')) return
  await window.api.workRecords.delete(id)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <button class="btn-outline btn-icon" @click="prevDay"><ChevronLeft class="w-4 h-4" /></button>
        <input type="date" v-model="selectedDate" @change="load" class="input w-44" />
        <button class="btn-outline btn-icon" @click="nextDay"><ChevronRight class="w-4 h-4" /></button>
        <button v-if="selectedDate !== today()" class="btn-ghost btn-sm" @click="selectedDate = today(); load()">今天</button>
      </div>
      <button class="btn-primary" @click="openAdd"><Plus class="w-4 h-4" /> 添加记录</button>
    </div>

    <div v-if="records.length > 0" class="card p-4 mb-4">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-muted-foreground">共 {{ records.length }} 条</span>
        <span class="text-muted-foreground">·</span>
        <span v-for="[cat, n] in byCategory" :key="cat" class="inline-flex items-center gap-1">
          <span :class="['px-2 py-0.5 rounded text-xs', categoryColors[cat] ?? categoryColors['其他']]">{{ cat }} {{ n }}</span>
        </span>
      </div>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中...
    </div>

    <div v-else-if="records.length === 0" class="card p-12 text-center text-muted-foreground">
      <Clock class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>今天还没有工作记录</p>
      <p class="text-xs mt-1">点击右上角"添加记录"手动添加，或在设置中开启自动截图</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="r in records"
        :key="r.id"
        class="card p-3 flex items-start gap-3 group hover:shadow-md transition-shadow"
      >
        <div class="text-xs text-muted-foreground font-mono pt-1 w-20 flex-shrink-0">
          {{ formatTime(r.startedAt) }}
          <span v-if="r.endedAt" class="block">→ {{ formatTime(r.endedAt) }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm">{{ r.summary }}</div>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="r.category" :class="['px-1.5 py-0.5 rounded text-xs', categoryColors[r.category] ?? categoryColors['其他']]">{{ r.category }}</span>
            <span v-if="r.source === 'screenshot'" class="text-xs text-muted-foreground">📷 自动</span>
          </div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <button class="btn-ghost btn-icon btn-sm" @click="openEdit(r)"><Pencil class="w-3.5 h-3.5" /></button>
          <button class="btn-ghost btn-icon btn-sm hover:text-destructive" @click="deleteRecord(r.id)"><Trash2 class="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>

    <div v-if="showAdd" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showAdd = false">
      <div class="card p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">{{ editingId ? '编辑记录' : '添加记录' }}</h3>
        <div class="space-y-3">
          <div>
            <label class="label mb-1 block">开始时间</label>
            <input type="datetime-local" :value="newRecord.startedAt.slice(0, 16)" @input="newRecord.startedAt = new Date(($event.target as HTMLInputElement).value).toISOString()" class="input" />
          </div>
          <div>
            <label class="label mb-1 block">结束时间（可选）</label>
            <input type="datetime-local" :value="newRecord.endedAt ? newRecord.endedAt.slice(0, 16) : ''" @input="newRecord.endedAt = ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value).toISOString() : ''" class="input" />
          </div>
          <div>
            <label class="label mb-1 block">工作内容</label>
            <textarea v-model="newRecord.summary" class="textarea" rows="3" placeholder="例如：编写用户登录接口"></textarea>
          </div>
          <div>
            <label class="label mb-1 block">分类</label>
            <select v-model="newRecord.category" class="input">
              <option value="">不分类</option>
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="btn-outline" @click="showAdd = false">取消</button>
          <button class="btn-primary" @click="saveRecord">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
