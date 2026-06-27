<div align="center">

# 🦷 牙牙乐日报助手 · Daily Assistant

**AI-powered work journal generator that runs entirely on your machine.**
*You just do the work. Let the AI write your daily / weekly / monthly reports.*

<br>

[![Release](https://img.shields.io/github/v/release/your-name/daily-assistant?style=flat-square&color=ff8a3d&logo=github&logoColor=white)](https://github.com/your-name/daily-assistant/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078d4?style=flat-square&logo=windows&logoColor=white)](https://github.com/your-name/daily-assistant/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org)
[![Electron](https://img.shields.io/badge/Electron-28-47848f?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Built with AI](https://img.shields.io/badge/AI-OpenAI%20Compatible-ff8a3d?style=flat-square&logo=openai&logoColor=white)](#-ai-integration)

**简体中文** · [English](#-introduction) · [更新日志](CHANGELOG.md) · [下载安装包](https://github.com/your-name/daily-assistant/releases/latest)

<br>

> 一款基于 **Electron + Vue 3 + 自有 API Key** 的开源桌面工作日报助手。
> 静默记录你的工作轨迹，让 AI 帮你写好每一份日报、周报、月报。
> 数据只存在你的本地，零上传、零账号、零云端依赖。

<br>

<!-- Screenshot placeholder — replace with your own -->
![Dashboard Preview](docs/preview.png)

<br>

[✨ 功能特性](#-功能特性) · [🏗️ 架构设计](#-架构设计) · [🚀 快速开始](#-快速开始) · [⚙️ 配置说明](#-配置说明) · [🛠️ 开发指南](#-开发指南) · [📦 打包发布](#-打包发布) · [🤝 贡献](#-贡献) · [📄 许可证](#-许可证)

</div>

---

## 📑 目录

- [🌟 Introduction](#-introduction)
- [✨ 功能特性](#-功能特性)
- [🏗️ 架构设计](#-架构设计)
- [🚀 快速开始](#-快速开始)
- [⚙️ 配置说明](#-配置说明)
- [🎨 设计系统](#-设计系统)
- [🤖 AI 集成](#-ai-集成)
- [💾 数据存储](#-数据存储)
- [🛠️ 开发指南](#-开发指南)
- [📦 打包发布](#-打包发布)
- [🐛 故障排查](#-故障排查)
- [🗺️ 路线图](#-路线图)
- [🤝 贡献](#-贡献)
- [🔒 隐私与安全](#-隐私与安全)
- [📄 许可证](#-许可证)
- [🙏 致谢](#-致谢)

---

## 🌟 Introduction

**Daily Assistant (牙牙乐日报助手)** is a fully open-source, self-hosted alternative to commercial time-tracking and report-writing tools such as RescueTime, Timely, or ClickUp.

It runs as a native Windows desktop application, captures your screen at a configurable interval, classifies each screenshot with a vision-capable LLM, and synthesizes your activity into editable **daily / weekly / monthly reports** in one click.

### Why Daily Assistant?

| 痛点 | 牙牙乐日报助手 |
| --- | --- |
| ❌ 商业工具月费贵、隐私差 | ✅ **完全免费、永久开源、本地优先** |
| ❌ AI 报告被锁在某家云服务 | ✅ **支持任意 OpenAI 兼容 API**（OpenAI / DeepSeek / 通义千问 / 自部署 vLLM） |
| ❌ 数据上传到云端 | ✅ **数据全部存在你电脑上的 JSON 文件里** |
| ❌ 强制注册账号 | ✅ **零账号、零登录、零激活** |
| ❌ 模板僵化、不可定制 | ✅ **5 套内置模板 + 1 套自定义示例 + 自由编辑** |

### Project Status

> 当前最新稳定版：**v2.1.1** · 适用于 **Windows 10 / 11 (x64)**
> Linux / macOS 暂未官方支持（欢迎 PR）

---

## ✨ 功能特性

### 📸 自动化工作追踪

- **定时截图**：可配置 30s / 1min / 5min / 自定义间隔，基于 Electron `desktopCapturer`
- **AI 视觉分析**：每张截图经多模态 LLM 自动归类为 `开发 / 设计 / 沟通 / 会议 / 文档 / 学习 / 其他`
- **自动生成摘要**：每条工作记录附带一句中文摘要
- **应用前台追踪**：Windows PowerShell 长驻进程，每 5 秒轮询前台窗口 → 进程名 → 友好名映射
- **应用使用时长**：聚合 60 秒或应用切换时刷写，统计 Top 20 应用

### 📊 报告生成

- **流式生成**：基于 SSE-like 流式响应，实时显示生成进度
- **多类型支持**：`日报 / 周报 / 月报 / 自由日期`
- **5 套内置模板**：
  1. 标准日报（`tpl-daily-standard`）
  2. 敏捷冲刺日报（`tpl-daily-scrum`）
  3. 成果型日报（`tpl-daily-result`）
  4. 标准周报（`tpl-weekly-standard`）
  5. OKR 月度复盘（`tpl-monthly-okr`）
- **1 套自定义示例**：`tpl-custom-sample`，可任意编辑
- **智能推荐**：根据所选报告类型自动推荐最合适的模板

### 🎨 看板视图

- **今日**：Hero 概览 + 今日计划 + 工作概览（3 张 Bento 计数卡）+ 24 时段热力 + 已连接显示器
- **生成**：模板选择 + 时间范围 + 自定义需求 → 一键生成
- **时间线**：按小时分组的工作记录流，支持分类筛选
- **热力图**：GitHub 风格 24h × N 天矩阵，5 级柑橘色阶
- **应用使用**：Top 20 应用柱状/饼图 + Top 5 最热时段 + 时段分布
- **历史报告**：所有生成过的报告列表，可搜索/删除/复制
- **AI 对话**：DeepSeek 风格 Chat UI，支持上下文多轮对话，20000 字上限

### 🔌 隐私 & 离线

- ✅ 所有截图、记录、报告存储在 `app.getPath('userData')/daily-assistant.json`
- ✅ 可选"截图分析后即销毁"自动清理
- ✅ 敏感场景（密码框、支付页）自动跳过
- ✅ AI 调用只走你配置的 baseUrl，**不经过任何中间服务器**

---

## 🏗️ 架构设计

### 双进程 Electron 模型

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐  │
│  │   DB    │  │ AI Client│  │Screenshot│  │ App Tracker  │  │
│  │ JSON FS │  │ OpenAI   │  │ desktop │  │ PowerShell   │  │
│  │         │  │ Compatible│  │ Capturer│  │  Foreground  │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘  │
│       │            │             │               │          │
│       └────────────┴─────────────┴───────────────┘          │
│                       IPC Handlers                          │
└─────────────────────────────┬───────────────────────────────┘
                              │  contextBridge
                              │  preload.cjs
┌─────────────────────────────▼───────────────────────────────┐
│                   Renderer (Vue 3 SPA)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Today   │  │  Reports │  │ Timeline │  │ Heatmap ... │  │
│  │   今日   │  │   报告   │  │  时间线  │  │     更多    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
│                                                              │
│   Vue 3 + Vite 5 + Quasar 2 + Tailwind 3 + Chart.js 4      │
└──────────────────────────────────────────────────────────────┘
```

### 目录结构

```
daily-assistant/
├── electron/                  # Electron 主进程
│   ├── main.ts                # 应用生命周期、IPC 注册
│   ├── preload.ts             # contextBridge → window.api
│   ├── db.ts                  # JSON 文件存储（CRUD + 迁移）
│   ├── settings.ts            # 设置读写
│   ├── ai.ts                  # OpenAI 兼容客户端
│   ├── screenshot.ts          # 定时截图 + 视觉分析
│   └── appTracker.ts          # Windows 前台应用追踪
│
├── src/                       # Vue 3 渲染层
│   ├── views/                 # 路由页面
│   │   ├── Today.vue          # /today
│   │   ├── Generate.vue       # /generate
│   │   ├── Timeline.vue       # /timeline
│   │   ├── Heatmap.vue        # /heatmap
│   │   ├── AppUsage.vue       # /app-usage
│   │   ├── History.vue        # /history
│   │   ├── Agent.vue          # /agent
│   │   ├── Records.vue        # /records
│   │   ├── Templates.vue      # /templates
│   │   └── Settings.vue       # /settings
│   ├── components/            # 复用组件
│   ├── lib/                   # 工具库
│   │   ├── toast.ts           # Quasar Notify 二次封装
│   │   └── utils.ts           # isApiReady / safeCall / FALLBACK_*
│   ├── router/                # Vue Router 配置
│   ├── App.vue                # 根组件
│   ├── main.ts                # 渲染进程入口
│   ├── style.css              # 全局样式 + 设计 token
│   └── types.d.ts             # window.api 类型声明
│
├── build/
│   ├── icon.ico               # Windows 应用图标
│   └── afterPack.cjs          # electron-builder 钩子
│
├── dist/                      # vite build 输出
├── dist-electron/             # esbuild 输出
├── release/                   # 打包输出（NSIS 安装包）
│
├── electron-builder.json      # 打包配置（位于 package.json）
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### IPC 通道一览

| 通道名 | 方向 | 说明 |
| --- | --- | --- |
| `settings:get` / `settings:set` | invoke | 应用设置读写 |
| `workRecords:list` / `create` / `update` / `delete` | invoke | 工作记录 CRUD |
| `reports:list` / `get` / `create` / `delete` | invoke | 历史报告 CRUD |
| `reportTemplates:list` | invoke | 报告模板列表 |
| `screenshots:status` / `start` / `stop` | invoke | 截图模块控制 |
| `ai:test` | invoke | 测试 API 连接 |
| `ai:reportStream` | invoke + send | 流式生成报告 |
| `ai:visionClassify` | invoke | 单张截图分析 |
| `plans:list` / `create` / `update` / `delete` | invoke | 今日计划 CRUD |
| `system:displays` | invoke | 已连接显示器列表 |
| `appUsage:list` | invoke | 应用使用记录 |
| `appUsage:insight` | invoke | AI 解读使用分布 |

所有通道通过 `electron/preload.ts` 的 `contextBridge.exposeInMainWorld('api', ...)` 暴露为 `window.api.*`。

---

## 🚀 快速开始

### 环境要求

- **操作系统**：Windows 10 / 11 (x64)
- **运行时**：仅需 Windows；Linux/macOS 暂未官方支持
- **Node.js**（仅开发）：v20 LTS 或更高版本
- **包管理器**：npm 10+ / pnpm 8+ / yarn 4+

### 用户安装（推荐）

1. 前往 [Releases](https://github.com/your-name/daily-assistant/releases/latest) 下载最新安装包：
   ```
   牙牙乐日报助手 Setup 2.1.1.exe
   ```
2. 双击安装，按提示选择安装路径
3. 启动应用，依次进入 **设置 → AI 分析**，填入你自己的 API 配置（参见 [⚙️ 配置说明](#-配置说明)）
4. 点击"开启自动记录"—— 助手开始每 60 秒截图分析

### 开发者安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-name/daily-assistant.git
cd daily-assistant

# 2. 安装依赖
npm install

# 3. 启动开发模式（Vite + Electron 热重载）
npm run dev

# 4. 生产构建（仅前端）
npm run build

# 5. 完整打包（前端 + 主进程 + NSIS 安装包）
npm run electron:build
```

启动后会自动打开 Electron 窗口并连接到本地 Vite dev server（`http://localhost:5173`）。

> 💡 **Tip**：开发模式下若 `window.api` 未注入（无 Electron 环境），所有 IPC 调用会走 `safeCall` 兜底，使用内置 `FALLBACK_*` 数据，确保 UI 仍可正常浏览。

---

## ⚙️ 配置说明

应用首次启动后，进入 **设置** 页面，按需填写：

### AI 服务（必填）

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| `baseUrl` | `https://api.openai.com/v1` | OpenAI 兼容 API 根地址 |
| `apiKey` | `sk-...` | 你的 API Key（**仅存本地**） |
| `model` | `gpt-4o-mini` | 文本生成模型（用于报告 / 解读） |
| `visionModel` | `gpt-4o-mini` | 视觉模型（用于截图分析） |

#### 支持的 API 提供商

| 提供商 | baseUrl | 备注 |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | 官方 |
| DeepSeek | `https://api.deepseek.com/v1` | 国产推荐 |
| 通义千问（DashScope） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容模式 |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | OpenAI 兼容模式 |
| Ollama（本地） | `http://localhost:11434/v1` | 自部署，需安装 `llava` 等视觉模型 |
| LM Studio | `http://localhost:1234/v1` | 桌面端本地推理 |
| vLLM / 自部署 | `https://your-domain/v1` | 任意 OpenAI 兼容网关 |

### 截图设置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `screenshotInterval` | 60s | 截图间隔（30s / 60s / 120s / 300s） |
| `autoDeleteScreenshots` | true | 分析完成后是否自动删除原图 |
| `sensitiveSceneSkip` | true | 密码输入框 / 支付页是否跳过 |
| `enableVision` | true | 是否启用 AI 视觉分析（关闭后只保留应用追踪） |

### 数据存储

所有数据存储在：

```
%APPDATA%\daily-assistant\daily-assistant.json   (Windows)
```

字段：`workRecords[]` / `reports[]` / `templates[]` / `screenshots[]` / `appUsageRecords[]` / `planItems[]` / `settings{}`

---

## 🎨 设计系统

### 设计原则

> **Warm Tech** — 暖色科技：柑橘亮主色 + 薄荷点缀，大字 + 圆角 + 微动效

### Design Tokens

| Token | HSL | 用途 |
| --- | --- | --- |
| `--primary` | `hsl(27 92% 63%)` = `#F5A04D` | 柑橘亮 · 品牌主色 |
| `--mint` | `hsl(165 21% 57%)` = `#7AAA9B` | 薄荷 · 次要强调 |
| `--background` | `hsl(40 33% 98%)` = `#FCFBF7` | **强制锁定**，禁止修改 |
| `--foreground` | `hsl(30 25% 12%)` | 主文字 |
| `--muted` | `hsl(35 20% 95%)` | 卡片背景 |
| `--border` | `hsl(35 15% 88%)` | 边框 |

### 字体方案

```css
--font-display: 'Bricolage Grotesque', 'Noto Sans SC', system-ui, sans-serif;
--font-body:    'Inter Tight',      'PingFang SC', system-ui, sans-serif;
--font-mono:    'JetBrains Mono',   'Cascadia Code', monospace;
```

### 微动效规范

- 仅动 `transform` / `opacity`（避免 layout thrashing）
- 缓动：`cubic-bezier(0.16, 1, 0.3, 1)`（spring）
- 悬停上浮 3px · 按下缩放 0.97 · 成功 check 弹入
- 使用 `IntersectionObserver` 触发入场动画，**禁止**用 scroll event

### 形状

- 12 / 16px 圆角（卡片）
- 999px pill 形（按钮）
- 侧栏折叠按钮：绝对定位 + 悬停放大

### 可访问性

- 全站尊重 `prefers-reduced-motion`
- 焦点环使用 `hsl(var(--ring))`
- 对比度满足 WCAG AA

---

## 🤖 AI 集成

### 视觉分析流程

```typescript
// 截图分析伪代码
const screenshot = await captureScreen()
const base64 = screenshot.toDataURL()
const response = await openai.chat.completions.create({
  model: settings.visionModel,
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: base64 } },
      { type: 'text', text: '请用一句话总结当前屏幕的主要工作内容，并归类为「开发/设计/沟通/会议/文档/学习/其他」' }
    ]
  }]
})
const { category, summary } = parseResponse(response)
```

### 流式报告生成

```typescript
// 主进程
ipcMain.handle('ai:reportStream', async (event, { records, template }) => {
  const stream = await openai.chat.completions.create({
    model: settings.model,
    stream: true,
    messages: [
      { role: 'system', content: template.systemPrompt },
      { role: 'user', content: buildUserPrompt(records) }
    ]
  })
  for await (const chunk of stream) {
    event.sender.send('ai:reportStream:chunk', chunk.choices[0]?.delta?.content || '')
  }
})
```

```typescript
// 渲染进程
const unsubscribe = window.api.ai.onReportStreamChunk((chunk) => {
  reportText.value += chunk
})
```

### 关键词兜底（无 AI 模式）

若未配置 API Key 或 AI 调用失败，`electron/ai.ts` 的 `classifyByKeyword()` 会用预置词表对截图进行简单归类，确保基础功能不中断。

---

## 💾 数据存储

### JSON Schema (v2)

```typescript
interface DB {
  schemaVersion: 2
  workRecords: WorkRecord[]
  reports: Report[]
  templates: ReportTemplate[]
  screenshots: ScreenshotMeta[]      // 仅元数据，原图可被清理
  appUsageRecords: AppUsageRecord[]
  planItems: PlanItem[]
  settings: AppSettings
}

interface WorkRecord {
  id: string                          // uuid v4
  startedAt: string                   // ISO 8601
  endedAt: string | null
  category: '开发' | '设计' | '沟通' | '会议' | '文档' | '学习' | '其他'
  summary: string
  source: 'screenshot' | 'manual'
  appName?: string
  windowTitle?: string
}

interface AppSettings {
  baseUrl: string
  apiKey: string
  model: string
  visionModel: string
  screenshotInterval: number          // 秒
  autoDeleteScreenshots: boolean
  sensitiveSceneSkip: boolean
  enableVision: boolean
  appTrackerEnabled: boolean
  // ... 更多
}
```

### 数据迁移

`electron/db.ts` 内置 v1 → v2 迁移逻辑：自动补充 `templates.clustering` 字段、`planItems` 表以及 Phase 1 默认设置。检测到旧 schema 时会在控制台输出迁移日志。

### 备份建议

```powershell
# 备份（每日）
Copy-Item "$env:APPDATA\daily-assistant\daily-assistant.json" `
          "$env:USERPROFILE\Backups\daily-assistant-$(Get-Date -Format yyyyMMdd).json"
```

---

## 🛠️ 开发指南

### 目录约定

- **主进程代码**：`electron/*.ts`，使用 CommonJS 输出（`.cjs`）避免 ESM 解析问题
- **渲染进程代码**：`src/**/*.{vue,ts}`，ES Module
- **IPC 类型**：`src/types.d.ts` 中声明 `window.api` 接口
- **设计 token**：`tailwind.config.js` + `src/style.css` 双源

### 提交前检查清单

- [ ] `npm run build` 通过（vue-tsc 类型检查 + Vite 构建）
- [ ] 所有 `view load()` 函数用 `try/finally` 包裹，配合 `safeCall` 防止 loading 卡死
- [ ] `Textarea` / `Input` 显式 `resize: none`（全局已加）
- [ ] 所有 view 根容器使用 `h-full overflow-y-auto min-h-0`（防止滚动失效）
- [ ] 时间选择器统一使用 Quasar `q-input` + `q-date`，**禁止** `:rules="['date']"`
- [ ] 动效仅用 `transform` / `opacity`
- [ ] 新增模板在 `electron/db.ts` 的 `builtinTemplates` 注册（带去重）

### 调试技巧

```bash
# 启动 dev 模式时查看主进程日志
npm run dev -- --enable-logging

# 在 DevTools 中启用 IPC 监控
window.addEventListener('message', (e) => console.log('IPC:', e.data))
```

### 添加新的 IPC 通道

1. `electron/main.ts` 注册 handler：
   ```typescript
   ipcMain.handle('myChannel:list', async () => { ... })
   ```
2. `electron/preload.ts` 暴露：
   ```typescript
   contextBridge.exposeInMainWorld('api', {
     myChannel: { list: () => ipcRenderer.invoke('myChannel:list') }
   })
   ```
3. `src/types.d.ts` 补全类型：
   ```typescript
   interface Api {
     myChannel: { list: () => Promise<MyType[]> }
   }
   ```
4. 在 Vue 组件里使用 `window.api.myChannel.list()`

---

## 📦 打包发布

### 自动化流程

```bash
# 1. 杀掉残留进程（Windows）
Get-Process -Name "牙牙乐日报助手" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 编译主进程（cjs 输出，文件名必须为 .cjs）
npx esbuild electron/main.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-electron/main.cjs --external:electron --external:sharp --external:better-sqlite3
npx esbuild electron/preload.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-electron/preload.cjs --external:electron

# 3. 编译渲染进程
npm run build

# 4. 打包为 NSIS 安装包
npx electron-builder --win --x64
```

### ⚠️ 部署踩坑清单

> 强烈建议阅读 [`.trae/skills/daily-assistant-deploy/SKILL.md`](.trae/skills/daily-assistant-deploy/SKILL.md)

| # | 坑 | 症状 | 解决 |
| --- | --- | --- | --- |
| 1 | esbuild 默认输出 ESM | `ReferenceError: require is not defined in ES module scope` | 加 `--format=cjs` 并用 `.cjs` 后缀 |
| 2 | main.js 找不到模块 | 控制台报 `Cannot find module` | 检查 `package.json` 的 `"main"` 字段指向 `.cjs` |
| 3 | preload 路径没改 | 所有 IPC 失效，提示 "Electron 未启动" | `electron/main.ts` 里的 `preload: 'preload.cjs'` |
| 4 | app.asar OS 级文件锁 | `Remove-Item release/` 卡住，错误码 32 | 临时改 `directories.output` 到新目录（如 `release_v2_1_3`） |
| 5 | Quasar `q-input` 红感叹号 | 日期选择器右边出现红 ❗ | 去掉 `:rules="['date']"`，仅用 mask 校验 |
| 6 | preload 路径同步遗漏 | 装好新版后所有 IPC 失效 | 改 cjs 时同时改 `main.ts` 的 `preload: 'preload.cjs'`，并 grep 验证 |

### 输出位置

```
release/
├── 牙牙乐日报助手 Setup 2.1.1.exe    # NSIS 安装包（~117 MB）
└── win-unpacked/                      # 绿色版（解压即用）
    └── 牙牙乐日报助手.exe
```

---

## 🐛 故障排查

### Q: 安装后打开提示"Electron 未启动，无法测试连接"

**A:** 主进程加载失败，99% 是 preload 路径不对。打开 DevTools（F12）查看错误，正常应该看到 `window.api` 已注入。如果没有：

1. 检查 `electron/main.ts` 第 50 行附近：`preload: path.join(__dirname, 'preload.cjs')`
2. 检查 `dist-electron/preload.cjs` 是否存在
3. 用 [npx asar](https://github.com/electron/asar) 解开 asar 验证：
   ```bash
   npx asar extract release/win-unpacked/resources/app.asar /tmp/verify
   grep "preload\." /tmp/verify/dist-electron/main.cjs
   # 应该输出 preload.cjs 而不是 preload.js
   ```

### Q: 截图分析一直失败，提示"AI 调用失败"

**A:** 按顺序排查：
1. 设置 → AI 分析 → 测试连接，应返回成功
2. 检查 baseUrl 是否带 `/v1` 后缀
3. visionModel 是否支持图像（部分模型只支持纯文本）
4. 关闭代理/VPN 试试

### Q: 应用追踪不工作

**A:** 仅 Windows 支持；PowerShell 进程需保持长驻。如果被杀毒软件拦截，添加白名单。

### Q: 数据文件损坏 / 丢失

**A:** JSON 文件被破坏时应用会创建新文件并备份损坏版本。从 `Backups/` 目录恢复最近一次备份。

---

## 🗺️ 路线图

- [ ] **v2.2** · 多显示器截图分别归类
- [ ] **v2.3** · 报告导出为 PDF / Markdown
- [ ] **v2.4** · Linux / macOS 适配
- [ ] **v2.5** · 团队协作模式（可选自托管同步）
- [ ] **v3.0** · 插件系统（自定义分析管道）

---

## 🤝 贡献

欢迎 PR / Issue / Discussion！

### 开发流程

1. Fork 本仓库
2. 创建 feature 分支：`git checkout -b feat/your-feature`
3. 提交改动：`git commit -m "feat: add your feature"`
4. 推送到 fork：`git push origin feat/your-feature`
5. 发起 Pull Request

### Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat:     新功能
fix:      Bug 修复
docs:     仅文档改动
style:    代码风格（不影响功能）
refactor: 重构
perf:     性能优化
test:     测试
chore:    构建/工具链
```

### Code of Conduct

请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — 保持友善与包容。

---

## 🔒 隐私与安全

- ✅ **零遥测**：应用不向任何外部服务器发送匿名统计
- ✅ **API Key 仅本地存储**：加密保存于 `userData/daily-assistant.json`
- ✅ **可选截图销毁**：默认 `autoDeleteScreenshots = true`，分析完成后删除原图
- ✅ **敏感场景跳过**：检测到密码框、支付页等自动跳过截图
- ✅ **数据导出/导入**：内置 JSON 导出功能，方便迁移

如果发现安全问题，请**私下**联系维护者（见下方），不要在公开 Issue 中披露。

---

## 📄 许可证

本项目基于 **MIT License** 开源 — 详见 [LICENSE](LICENSE) 文件。

```
MIT License

Copyright (c) 2024-2026 牙牙乐日报助手 Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 致谢

本项目站在以下开源巨人肩膀上：

### Core Stack

- [Electron](https://www.electronjs.org) · MIT
- [Vue 3](https://vuejs.org) · MIT
- [Vite](https://vitejs.dev) · MIT
- [TypeScript](https://www.typescriptlang.org) · Apache-2.0
- [Quasar Framework](https://quasar.dev) · MIT
- [Tailwind CSS](https://tailwindcss.com) · MIT
- [Chart.js](https://www.chartjs.org) · MIT
- [Lucide Icons](https://lucide.dev) · ISC

### Inspiration

- [RescueTime](https://www.rescuetime.com) — 自动化时间追踪的鼻祖
- [Timely](https://www.timelyapp.com) — 自动时间归类的灵感来源
- [DeepSeek Chat](https://chat.deepseek.com) — AI 对话 UI 设计参考

### Fonts

- [Bricolage Grotesque](https://github.com/ateliertriply/bricolage-grotesque) · OFL
- [Inter Tight](https://github.com/rsms/inter) · OFL
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) · OFL

---

<div align="center">

## ⭐ Star History

<a href="https://star-history.com/#your-name/daily-assistant&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=your-name/daily-assistant&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=your-name/daily-assistant&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=your-name/daily-assistant&type=Date" width="600" />
  </picture>
</a>

<br>

**如果这个项目对你有帮助，欢迎给个 ⭐ Star！**

<p>
  <a href="https://github.com/your-name/daily-assistant">
    <img src="https://img.shields.io/github/stars/your-name/daily-assistant?style=for-the-badge&logo=github&color=ff8a3d" alt="GitHub stars" />
  </a>
  <a href="https://github.com/your-name/daily-assistant/network/members">
    <img src="https://img.shields.io/github/forks/your-name/daily-assistant?style=for-the-badge&logo=github&color=7aaa9b" alt="GitHub forks" />
  </a>
  <a href="https://github.com/your-name/daily-assistant/issues">
    <img src="https://img.shields.io/github/issues/your-name/daily-assistant?style=for-the-badge&logo=github&color=22c55e" alt="GitHub issues" />
  </a>
</p>

<sub>Built with 🦷 & ☕ by the Daily Assistant Contributors</sub>

</div>
