"use strict";

// electron/preload.ts
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  // 窗口控制
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  // 设置
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (patch) => ipcRenderer.invoke("settings:update", patch)
  },
  // AI
  ai: {
    testConnection: () => ipcRenderer.invoke("ai:test-connection"),
    generateReport: (input) => ipcRenderer.invoke("ai:generate-report", input),
    generateTemplate: (input) => ipcRenderer.invoke("ai:generate-template", input),
    chat: (input) => ipcRenderer.invoke("ai:chat", input),
    generateInsight: (input) => ipcRenderer.invoke("ai:insight", input),
    onReportStreamChunk: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("report:stream-chunk", l);
      return () => ipcRenderer.removeListener("report:stream-chunk", l);
    },
    onReportStatusChanged: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("report:status-changed", l);
      return () => ipcRenderer.removeListener("report:status-changed", l);
    },
    onTemplateStreamChunk: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("ai:template-stream-chunk", l);
      return () => ipcRenderer.removeListener("ai:template-stream-chunk", l);
    },
    onTemplateStatusChanged: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("ai:template-status-changed", l);
      return () => ipcRenderer.removeListener("ai:template-status-changed", l);
    },
    onChatStreamChunk: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("ai:chat-stream-chunk", l);
      return () => ipcRenderer.removeListener("ai:chat-stream-chunk", l);
    },
    onChatStatusChanged: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("ai:chat-status-changed", l);
      return () => ipcRenderer.removeListener("ai:chat-status-changed", l);
    },
    onInsightStreamChunk: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("ai:insight-stream-chunk", l);
      return () => ipcRenderer.removeListener("ai:insight-stream-chunk", l);
    },
    onInsightStatusChanged: (cb) => {
      const l = (_e, d) => cb(d);
      ipcRenderer.on("ai:insight-status-changed", l);
      return () => ipcRenderer.removeListener("ai:insight-status-changed", l);
    }
  },
  // 工作记录
  workRecords: {
    list: (input) => ipcRenderer.invoke("work-records:list", input),
    create: (input) => ipcRenderer.invoke("work-records:create", input),
    update: (input) => ipcRenderer.invoke("work-records:update", input),
    delete: (id) => ipcRenderer.invoke("work-records:delete", { id }),
    dailySummary: (date) => ipcRenderer.invoke("work-records:daily-summary", { date })
  },
  // 报告
  reports: {
    list: (input) => ipcRenderer.invoke("reports:list", input),
    delete: (id) => ipcRenderer.invoke("reports:delete", { id }),
    updateTitle: (id, title) => ipcRenderer.invoke("reports:update-title", { id, title }),
    updateContent: (id, content) => ipcRenderer.invoke("reports:update-content", { id, content }),
    exportToFile: (id, format) => ipcRenderer.invoke("report:export-to-file", { id, format })
  },
  // 报告模板
  reportTemplates: {
    list: (type) => ipcRenderer.invoke("report-templates:list", type ? { type } : {}),
    create: (input) => ipcRenderer.invoke("report-templates:create", input),
    update: (input) => ipcRenderer.invoke("report-templates:update", input),
    delete: (id) => ipcRenderer.invoke("report-templates:delete", { id })
  },
  // 计划
  plans: {
    list: (input) => ipcRenderer.invoke("plans:list", input),
    create: (input) => ipcRenderer.invoke("plans:create", input),
    update: (input) => ipcRenderer.invoke("plans:update", input),
    delete: (id) => ipcRenderer.invoke("plans:delete", { id })
  },
  // 本地 API 服务
  localApi: {
    getStatus: () => ipcRenderer.invoke("localApi:getStatus"),
    start: (input) => ipcRenderer.invoke("localApi:start", input || {}),
    stop: () => ipcRenderer.invoke("localApi:stop"),
    regenerateToken: () => ipcRenderer.invoke("localApi:regenerateToken")
  },
  // 时间线/热力图/应用使用
  timeline: {
    list: (input) => ipcRenderer.invoke("timeline:list", input)
  },
  heatmap: {
    list: (input) => ipcRenderer.invoke("heatmap:list", input)
  },
  appUsage: {
    list: (input) => ipcRenderer.invoke("app-usage:list", input)
  },
  // 系统
  system: {
    displays: () => ipcRenderer.invoke("system:displays")
  },
  // 截图
  screenshots: {
    status: () => ipcRenderer.invoke("screenshots:status"),
    captureNow: () => ipcRenderer.invoke("screenshots:capture-now"),
    start: () => ipcRenderer.invoke("screenshots:start"),
    stop: () => ipcRenderer.invoke("screenshots:stop"),
    list: (input) => ipcRenderer.invoke("screenshots:list", input)
  },
  // 数据管理
  dataManagement: {
    export: () => ipcRenderer.invoke("data-management:export"),
    import: () => ipcRenderer.invoke("data-management:import"),
    clear: () => ipcRenderer.invoke("data-management:clear")
  },
  // 读取本地图片（截图查看用）
  readLocalImage: (filePath) => ipcRenderer.invoke("read-local-image", filePath),
  // 文件
  file: {
    readAsBase64: (filePath) => ipcRenderer.invoke("file:read-as-base64", filePath)
  }
});
