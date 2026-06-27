// window.api 类型声明
export interface AppSettings {
  apiKey: string
  baseUrl: string
  model: string
  visionModel: string
  scheduledReportEnabled: boolean
  scheduledReportTime: string
  screenshotIntervalSec: number
  visionEnabled: boolean
  excludedApps: string[]
  memoryContent: string
  customInstruction: string
  preservePath: string
  autoDeleteScreenshots: boolean
  sensitiveSceneSkip: boolean
  privacyLevel: 'loose' | 'standard' | 'strict'
  globalShortcut: string
  showNotifications: boolean
  subscription: 'free' | 'pro'
  subscriptionExpiry: string | null
  inviteCode: string
  localApiEnabled: boolean
  localApiPort: number
  localApiToken: string
}

export interface WorkRecord {
  id: string
  startedAt: string
  endedAt: string | null
  summary: string
  category: string | null
  appName: string | null
  source: string
  screenshotPath: string | null
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly'
  content: string
  startDate: string
  endDate: string
  status: 'generating' | 'completed' | 'failed'
  model: string | null
  createdAt: string
  updatedAt: string
}

export interface ReportTemplate {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly'
  content: string
  isBuiltin: boolean
  clustering: 'timeline' | 'category' | 'project'
  createdAt: string
  updatedAt: string
}

export interface Screenshot {
  id: string
  path: string
  takenAt: string
  analysis: string | null
  appName: string | null
  analyzed: boolean
  createdAt: string
}

export interface PlanItem {
  id: string
  date: string
  text: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}

interface Api {
  minimize(): void
  maximize(): void
  close(): void
  getVersion(): Promise<string>
  openExternal(url: string): Promise<{ ok: boolean }>
  settings: {
    get(): Promise<AppSettings>
    update(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  ai: {
    testConnection(): Promise<{ ok: boolean; message: string }>
    generateReport(input: {
      type: 'daily' | 'weekly' | 'monthly'
      startDate: string
      endDate: string
      templateBody?: string
      customInstruction?: string
      memoryContent?: string
      clustering?: 'timeline' | 'category' | 'project'
      plans?: Array<{ text: string; completed: boolean }>
      records: Array<{ startedAt: string; summary: string; category?: string }>
      appUsageSummary?: Array<{ appName: string; durationMinutes: number }>
    }): Promise<{ id: string }>
    generateTemplate(input: { reference: string; requirements: string; type: 'daily' | 'weekly' | 'monthly' }): Promise<{ started: boolean }>
    chat(input: { messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>; sessionId: string }): Promise<{ ok: boolean; error?: string }>
    onReportStreamChunk(cb: (data: { id: string; chunk: string }) => void): () => void
    onReportStatusChanged(cb: (data: any) => void): () => void
    onTemplateStreamChunk(cb: (data: { chunk: string }) => void): () => void
    onTemplateStatusChanged(cb: (data: any) => void): () => void
    onChatStreamChunk(cb: (data: { sessionId: string; chunk: string }) => void): () => void
    onChatStatusChanged(cb: (data: { sessionId: string; status: 'completed' | 'failed'; content?: string; error?: string }) => void): () => void
    generateInsight(input: { type: 'heatmap' | 'appUsage'; data: any }): Promise<{ ok: boolean; error?: string }>
    onInsightStreamChunk(cb: (data: { type: string; chunk: string }) => void): () => void
    onInsightStatusChanged(cb: (data: { type: string; status: 'completed' | 'failed'; content?: string; error?: string }) => void): () => void
  }
  workRecords: {
    list(input: { date?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<WorkRecord[]>
    create(input: { startedAt: string; summary: string; category?: string; endedAt?: string }): Promise<WorkRecord>
    update(input: { id: string; summary?: string; category?: string; startedAt?: string; endedAt?: string }): Promise<WorkRecord>
    delete(id: string): Promise<{ ok: boolean }>
    dailySummary(date: string): Promise<{ total: number; byCategory: Record<string, number>; records: WorkRecord[] }>
  }
  reports: {
    list(input: { limit?: number; offset?: number }): Promise<Report[]>
    delete(id: string): Promise<{ ok: boolean }>
    updateTitle(id: string, title: string): Promise<{ ok: boolean }>
    updateContent(id: string, content: string): Promise<{ ok: boolean }>
    exportToFile(id: string, format: 'md' | 'txt'): Promise<{ ok: boolean; path?: string; message?: string }>
  }
  reportTemplates: {
    list(type?: string): Promise<ReportTemplate[]>
    create(input: { name: string; type: string; content: string; clustering?: 'timeline' | 'category' | 'project' }): Promise<ReportTemplate>
    update(input: { id: string; name?: string; content?: string }): Promise<ReportTemplate>
    delete(id: string): Promise<{ ok: boolean }>
  }
  plans: {
    list(input: { date: string }): Promise<PlanItem[]>
    create(input: { date: string; text: string }): Promise<PlanItem>
    update(input: { id: string; text?: string; completed?: boolean; order?: number }): Promise<PlanItem>
    delete(id: string): Promise<{ ok: boolean }>
  }
  localApi: {
    getStatus(): Promise<{ running: boolean; port: number; token: string }>
    start(input: { port?: number }): Promise<{ ok: boolean; error?: string; port?: number }>
    stop(): Promise<{ ok: boolean }>
    regenerateToken(): Promise<{ ok: boolean; token: string }>
  }
  screenshots: {
    status(): Promise<{ running: boolean }>
    captureNow(): Promise<{ ok: boolean; summary?: string; category?: string; error?: string }>
    start(): Promise<{ ok: boolean }>
    stop(): Promise<{ ok: boolean }>
    list(input: { date?: string; limit?: number }): Promise<Screenshot[]>
  }
  timeline: {
    list(input: { startDate?: string; endDate?: string }): Promise<WorkRecord[]>
  }
  heatmap: {
    list(input: { startDate?: string; endDate?: string }): Promise<Array<{ date: string; hour: number; count: number }>>
  }
  appUsage: {
    list(input: { startDate?: string; endDate?: string }): Promise<Array<{ appName: string; durationMinutes: number; durationSec: number; count: number; firstAt: string | null; lastAt: string | null; share: number }>>
  }
  system: {
    displays(): Promise<Array<{ id: number; label: string; x: number; y: number; width: number; height: number; scaleFactor: number; isPrimary: boolean }>>
  }
  dataManagement: {
    export(): Promise<{ ok: boolean; path?: string; message?: string }>
    import(): Promise<{ ok: boolean; message?: string }>
    clear(): Promise<{ ok: boolean }>
  }
  readLocalImage(filePath: string): Promise<{ ok: boolean; dataUrl?: string; error?: string }>
  file: {
    readAsBase64(filePath: string): Promise<string>
  }
}

declare global {
  interface Window {
    api: Api
  }
}

export {}
