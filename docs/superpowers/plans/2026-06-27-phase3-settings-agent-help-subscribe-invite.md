# Phase 3: 设置页 + Agent + 帮助/订阅/邀请 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善产品功能，包括重写设置页，集成内置 AI 对话 (Agent)，并添加订阅、邀请和帮助功能，最终形成一个完整的产品。

**Architecture:**
- **渲染进程**: 重写 `Settings.vue` 为 5 个卡片，新增 `Agent.vue`, `Subscription.vue`, `Invite.vue`, `Privacy.vue`, `Help.vue` 页面。
- **主进程**: 新增 `ai:chat` IPC 通道，实现本地 HTTP API 服务 (`api-server.ts`)。
- **路由**: 更新 `router.ts` 和 `App.vue`。

**Tech Stack:** Vue 3 Composition API, TypeScript, Electron IPC, Node.js `http.createServer()`

## Global Constraints

- 中文 UI，日期格式 YYYY-MM-DD
- 所有弹窗改为页面内内联展示
- 无测试框架，验证方式：`npm run dev` 手动测试 + `vue-tsc` 类型检查

---

### Task 1: 设置页 5 卡片重写

**Files:**
- Modify: `src/views/Settings.vue`

**Interfaces:**
- Consumes/Produces: 现有 `AppSettings` 接口，更新 `getSettings()` 和 `updateSettings()` 函数。

- [ ] **Step 1: 重写 `Settings.vue` 结构**
  - 将设置项分组为 5 个卡片。

- [ ] **Step 2: 实现“通用”卡片**
  - 全局快捷键显示/修改（内联编辑）。
  - 自动记录工作开关（控制定时截图）。

- [ ] **Step 3: 实现“截图与记录”卡片**
  - 截图间隔（下拉选择）。
  - 视觉识别开关。
  - 隐私级别三档滑块（宽松/标准/严格）。
  - 截图分析后自动删除开关（受隐私级别控制，可单独微调）。
  - 敏感场景自动跳过开关（受隐私级别控制，可单独微调）。
  - 排除应用列表（标签式输入）。
  - 完成通知开关。

- [ ] **Step 4: 实现“AI 分析”卡片**
  - 截图分析模型/报告生成模型显示与内联编辑。
  - 连接测试按钮（结果 inline 显示）。
  - 识别记录提示词（显示默认，可展开编辑）。
  - 自定义指令（文本框）。
  - AI 记忆内容（文本框）。

- [ ] **Step 5: 实现“数据管理”卡片**
  - 导出数据按钮。
  - 导入数据按钮（含文件选择）。
  - 清除历史数据按钮（含内联红色确认条）。

- [ ] **Step 6: 实现“实验”卡片**
  - 开机自启动开关（仅 Windows，标注“实验性”）。
  - 定时生成日报开关 + 时间选择。
  - 截图保留路径显示与修改。
  - 订阅状态显示与跳转链接。
  - 本地 API 服务开关 + 端口配置 + Token 显示/重置 + 接入配置文本一键复制。

- [ ] **Step 7: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 8: 提交**
  ```bash
  git add src/views/Settings.vue
  git commit -m "feat: rewrite Settings page with 5 cards"
  ```

---

### Task 2: Agent 三层架构

**Files:**
- New: `src/views/Agent.vue`
- Modify: `electron/ai.ts`, `electron/main.ts`, `electron/preload.ts`, `src/types.d.ts`
- New: `electron/api-server.ts`

**Interfaces:**
- 新增 `ai:chat` IPC 通道。
- `AppSettings` 新增 `localApiEnabled`, `localApiPort`, `localApiToken`。
- `Settings` 新增 `usageCounters`。

- [ ] **Step 1: 创建 `Agent.vue` 页面**
  - 实现内置 AI 对话的 UI 布局。

- [ ] **Step 2: 实现内置 AI 对话功能**
  - 复用现有 AI 配置 (`baseUrl`/`apiKey`/`model`)。
  - 对话时自动注入最近 7 天工作记录和应用使用数据作为系统上下文。
  - 控制注入数据量：最多 200 条工作记录 + Top 20 应用时长。
  - 提供快捷问题预设 Prompt。
  - 实现流式输出。
  - 对话历史保存在内存中。

- [ ] **Step 3: 实现 `ai:chat` IPC 通道**
  - 在 `electron/ai.ts` 中添加 AI 对话逻辑。
  - 在 `electron/main.ts` 中注册 `ai:chat` IPC handler。
  - 在 `electron/preload.ts` 中暴露 `ai.chat` API。
  - 在 `src/types.d.ts` 中更新 `Api` 接口，新增 `ai.chat`。

- [ ] **Step 4: 实现“一键复制上下文”功能**
  - 在 `Agent.vue` 中添加导出范围选择（今日/本周/本月/自定义日期范围）。
  - 导出结构化 JSON 数据，包含元数据说明。
  - 实现一键复制到剪贴板 (`navigator.clipboard.writeText(...)`)。
  - 提供导出内容预览和推荐提问。

- [ ] **Step 5: 实现本地 HTTP API 服务**
  - 新建 `electron/api-server.ts`，使用 Node.js `http.createServer()` 实现本地 HTTP API 服务。
  - 在 `electron/main.ts` 中添加启动/停止本地 API 服务的 IPC 通道和逻辑。
  - 实现 Bearer Token 认证机制，Token 存储在 `AppSettings`。
  - 实现可配置端口（默认 8088）。
  - 实现 API 端点：
    - `GET /` (API 文档，Markdown)
    - `GET /api/work-records`
    - `GET /api/reports`
    - `GET /api/app-usage`
    - `GET /api/heatmap`
    - `GET /api/timeline`
    - `GET /api/plans`
    - `POST /api/work-records`
    - `POST /api/reports/generate`
  - 在 `AppSettings` 中新增 `localApiEnabled`, `localApiPort`, `localApiToken` 字段。
  - 在 `Settings` “实验”卡片中提供本地 API 服务开关、端口配置、Token 显示/重置、Agent 接入配置文本一键复制。

- [ ] **Step 6: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 7: 提交**
  ```bash
  git add src/views/Agent.vue electron/ai.ts electron/main.ts electron/preload.ts src/types.d.ts electron/api-server.ts
  git commit -m "feat: implement Agent 3-tier architecture (built-in AI, copy context, local API)"
  ```

---

### Task 3: 订阅页

**Files:**
- New: `src/views/Subscription.vue`
- Modify: `electron/db.ts` (for usageCounters)

**Interfaces:**
- `AppSettings` 新增 `subscription`, `subscriptionExpiry`。
- `Settings` 新增 `usageCounters`。

- [ ] **Step 1: 创建 `Subscription.vue` 页面**
  - 实现定价卡片和功能对比表格 UI。

- [ ] **Step 2: 显示订阅状态**
  - 根据 `Settings.subscription` 和 `Settings.subscriptionExpiry` 显示当前订阅状态。
  - 支付按钮显示“即将开通”（纯前端 UI）。

- [ ] **Step 3: 实现限频执行机制**
  - 在 `electron/db.ts` 中新增 `usageCounters: { reportGenerated: number, aiChatUsed: number, date: string }` 字段及相关逻辑。
  - 每次调用 AI 报告/AI 对话前，检查 `date` 是否为今天，不是则重置计数器。
  - 免费版超限时，在 UI 上显示提示信息和跳转订阅页链接。

- [ ] **Step 4: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 5: 提交**
  ```bash
  git add src/views/Subscription.vue electron/db.ts
  git commit -m "feat: implement subscription page and usage counters"
  ```

---

### Task 4: 邀请激励页

**Files:**
- New: `src/views/Invite.vue`

**Interfaces:**
- `AppSettings` 新增 `inviteCode`。

- [ ] **Step 1: 创建 `Invite.vue` 页面**
  - 实现邀请码和邀请链接的 UI 布局。

- [ ] **Step 2: 实现邀请功能**
  - 显示用户邀请码 (`Settings.inviteCode`) 和邀请链接。
  - 实现一键复制邀请码和邀请链接功能。
  - 提供使用说明。
  - 简化邀请功能，去掉邀请记录和奖励天数。

- [ ] **Step 3: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 4: 提交**
  ```bash
  git add src/views/Invite.vue
  git commit -m "feat: implement invite page"
  ```

---

### Task 5: 隐私保护页

**Files:**
- New: `src/views/Privacy.vue`

**Steps:**
- [ ] **Step 1: 创建 `Privacy.vue` 页面**
  - 展示隐私保护机制：数据本地存储，截图即销毁，敏感场景跳过，本地模型支持。
  - 显示当前隐私状态，并提供跳转到设置页调整的链接。

- [ ] **Step 2: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 3: 提交**
  ```bash
  git add src/views/Privacy.vue
  git commit -m "feat: implement privacy protection page"
  ```

---

### Task 6: 帮助页

**Files:**
- New: `src/views/Help.vue`

**Steps:**
- [ ] **Step 1: 创建 `Help.vue` 页面**
  - 提供常见问题 (FAQ) 列表。
  - 展示快捷键列表。
  - 提供联系方式（GitHub 项目地址）和版本信息。

- [ ] **Step 2: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 3: 提交**
  ```bash
  git add src/views/Help.vue
  git commit -m "feat: implement help page"
  ```

---

### Task 7: 路由和导航更新

**Files:**
- Modify: `src/router.ts`, `src/App.vue`

**Steps:**
- [ ] **Step 1: 更新 `src/router.ts`**
  - 新增 Phase 3 页面路由 (`/subscription`, `/invite`, `/privacy`, `/settings`, `/help`)。

- [ ] **Step 2: 更新 `src/App.vue` 侧边栏导航**
  - 添加订阅、邀请、隐私、设置、帮助入口。

- [ ] **Step 3: 验证类型检查**
  ```bash
  vue-tsc --noEmit
  ```

- [ ] **Step 4: 提交**
  ```bash
  git add src/router.ts src/App.vue
  git commit -m "feat: update router and navigation for Phase 3 pages"
  ```
