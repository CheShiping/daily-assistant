# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-06-28

### Fixed
- **Critical**: `electron/main.ts` 中 `preload` 路径未同步为 `.cjs`，导致 Electron 找不到 preload 脚本，所有 IPC 调用失效
- 添加 `flex-shrink-0` 防止 Hero 区域被 flex 容器压缩
- 优化 Hero 区域渲染，移除 `reveal` 动画以避免潜在的渲染异常

### Changed
- 重构 Hero 区域：将多行 `class` + `style` 属性合并为单行结构，提高 Vite 编译可靠性
- 调整今日页面根容器布局：`flex flex-col` + `max-w-[1280px]` 单列竖排
- 工作概览 3 张 Bento 卡保持 `grid-cols-3` 横排
- 已连接显示器多屏时回到 `grid-cols-2`

### Added
- 应用记录页面自定义时间范围支持 Quasar `q-input` + `q-date` 弹窗
- 应用记录按钮加宽 (`ya-qbtn-toggle--wide` 修饰类)
- 全局按钮 `cursor: pointer` 修复
- 计划输入框 `cursor: text` + 柑橘色 caret

## [2.1.0] - 2026-06-27

### Added
- 时段热力图：GitHub 风格 24h × N 天矩阵 + 5 级柑橘色阶
- 工作时间线：分类筛选
- AI 对话：DeepSeek 风格 UI + 20000 字上限 + 多轮上下文
- 5 套报告模板 + 1 套自定义示例
- Toast 4 状态色强制覆盖 Quasar 默认
- Quasar 框架集成（q-date、q-btn-toggle、q-input、q-popup-proxy）

### Fixed
- 所有 view 滚动问题：根容器统一加 `h-full overflow-y-auto min-h-0`
- 所有 view `load()` 用 `try/finally` + `safeCall` 防止 loading 卡死
- Quasar `q-input` 红色感叹号：去掉 `:rules="['date']"`
- 侧边栏折叠按钮：绝对定位 + hover 缩放

## [2.0.0] - 2026-06-20

### Added
- 完整 UI 重构：Warm Tech 设计系统
  - 柑橘亮 `#F5A04D` + 薄荷 `#7AAA9B`
  - Bricolage Grotesque + Inter Tight + JetBrains Mono
- 完整功能：截图 / AI 视觉 / 应用追踪 / 报告生成 / 历史 / 对话

### Changed
- 从 Vue 2 迁移到 Vue 3 + Composition API + TypeScript
- 从 webpack 迁移到 Vite 5
- 数据库从 SQLite 简化为 JSON 文件存储

## [1.0.0] - 2026-05-01

### Added
- 首个公开发布版本
- 基础截图定时器 + OpenAI 兼容 API 调用
- 日报生成功能
- 简单历史记录

[2.1.1]: https://github.com/your-name/daily-assistant/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/your-name/daily-assistant/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/your-name/daily-assistant/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/your-name/daily-assistant/releases/tag/v1.0.0
