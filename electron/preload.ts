// preload - 通过 contextBridge 暴露安全 API
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),

  // 设置
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch: any) => ipcRenderer.invoke('settings:update', patch)
  },

  // AI
  ai: {
    testConnection: () => ipcRenderer.invoke('ai:test-connection'),
    generateReport: (input: any) => ipcRenderer.invoke('ai:generate-report', input),
    generateTemplate: (input: any) => ipcRenderer.invoke('ai:generate-template', input),
<<<<<<< HEAD
    chat: (input: { messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>; sessionId: string }) =>
      ipcRenderer.invoke('ai:chat', input),
    generateInsight: (input: { type: 'heatmap' | 'appUsage'; data: any }) =>
      ipcRenderer.invoke('ai:insight', input),
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
    onReportStreamChunk: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('report:stream-chunk', l)
      return () => ipcRenderer.removeListener('report:stream-chunk', l)
    },
    onReportStatusChanged: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('report:status-changed', l)
      return () => ipcRenderer.removeListener('report:status-changed', l)
    },
    onTemplateStreamChunk: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('ai:template-stream-chunk', l)
      return () => ipcRenderer.removeListener('ai:template-stream-chunk', l)
    },
    onTemplateStatusChanged: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('ai:template-status-changed', l)
      return () => ipcRenderer.removeListener('ai:template-status-changed', l)
<<<<<<< HEAD
    },
    onChatStreamChunk: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('ai:chat-stream-chunk', l)
      return () => ipcRenderer.removeListener('ai:chat-stream-chunk', l)
    },
    onChatStatusChanged: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('ai:chat-status-changed', l)
      return () => ipcRenderer.removeListener('ai:chat-status-changed', l)
    },
    onInsightStreamChunk: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('ai:insight-stream-chunk', l)
      return () => ipcRenderer.removeListener('ai:insight-stream-chunk', l)
    },
    onInsightStatusChanged: (cb: (data: any) => void) => {
      const l = (_e: any, d: any) => cb(d)
      ipcRenderer.on('ai:insight-status-changed', l)
      return () => ipcRenderer.removeListener('ai:insight-status-changed', l)
=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
    }
  },

  // 工作记录
  workRecords: {
    list: (input: any) => ipcRenderer.invoke('work-records:list', input),
    create: (input: any) => ipcRenderer.invoke('work-records:create', input),
    update: (input: any) => ipcRenderer.invoke('work-records:update', input),
    delete: (id: string) => ipcRenderer.invoke('work-records:delete', { id }),
    dailySummary: (date: string) => ipcRenderer.invoke('work-records:daily-summary', { date })
  },

  // 报告
  reports: {
    list: (input: any) => ipcRenderer.invoke('reports:list', input),
    delete: (id: string) => ipcRenderer.invoke('reports:delete', { id }),
    updateTitle: (id: string, title: string) => ipcRenderer.invoke('reports:update-title', { id, title }),
    updateContent: (id: string, content: string) => ipcRenderer.invoke('reports:update-content', { id, content }),
    exportToFile: (id: string, format: 'md' | 'txt') => ipcRenderer.invoke('report:export-to-file', { id, format })
  },

  // 报告模板
  reportTemplates: {
    list: (type?: string) => ipcRenderer.invoke('report-templates:list', type ? { type } : {}),
    create: (input: any) => ipcRenderer.invoke('report-templates:create', input),
    update: (input: any) => ipcRenderer.invoke('report-templates:update', input),
    delete: (id: string) => ipcRenderer.invoke('report-templates:delete', { id })
  },

<<<<<<< HEAD
  // 计划
  plans: {
    list: (input: { date: string }) => ipcRenderer.invoke('plans:list', input),
    create: (input: { date: string; text: string }) => ipcRenderer.invoke('plans:create', input),
    update: (input: { id: string; text?: string; completed?: boolean; order?: number }) => ipcRenderer.invoke('plans:update', input),
    delete: (id: string) => ipcRenderer.invoke('plans:delete', { id })
  },

  // 本地 API 服务
  localApi: {
    getStatus: () => ipcRenderer.invoke('localApi:getStatus'),
    start: (input?: { port?: number }) => ipcRenderer.invoke('localApi:start', input || {}),
    stop: () => ipcRenderer.invoke('localApi:stop'),
    regenerateToken: () => ipcRenderer.invoke('localApi:regenerateToken')
  },

=======
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
  // 时间线/热力图/应用使用
  timeline: {
    list: (input: any) => ipcRenderer.invoke('timeline:list', input)
  },
  heatmap: {
    list: (input: any) => ipcRenderer.invoke('heatmap:list', input)
  },
  appUsage: {
    list: (input: any) => ipcRenderer.invoke('app-usage:list', input)
  },

  // 系统
  system: {
    displays: () => ipcRenderer.invoke('system:displays')
  },

  // 截图
  screenshots: {
    status: () => ipcRenderer.invoke('screenshots:status'),
    captureNow: () => ipcRenderer.invoke('screenshots:capture-now'),
    start: () => ipcRenderer.invoke('screenshots:start'),
    stop: () => ipcRenderer.invoke('screenshots:stop'),
    list: (input: any) => ipcRenderer.invoke('screenshots:list', input)
  },

  // 数据管理
  dataManagement: {
    export: () => ipcRenderer.invoke('data-management:export'),
    import: () => ipcRenderer.invoke('data-management:import'),
    clear: () => ipcRenderer.invoke('data-management:clear')
  },

  // 读取本地图片（截图查看用）
  readLocalImage: (filePath: string) => ipcRenderer.invoke('read-local-image', filePath),

  // 文件
  file: {
    readAsBase64: (filePath: string) => ipcRenderer.invoke('file:read-as-base64', filePath)
  }
})
