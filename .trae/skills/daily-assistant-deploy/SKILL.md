---
name: daily-assistant-deploy
description: Builds and packages the 牙牙乐日报助手 (Daily Assistant) Electron desktop app to a Windows NSIS installer. Invoke when user runs `npm run electron:build`, packages the .exe installer, reports "Access is denied" on release/ folder, or sees "require is not defined in ES module scope" runtime error after install.
metadata:
  author: Shiping
  project: e:\Users\Shiping\daily-assistant
  stack: Vue 3 + Vite 5 + Electron 28 + Quasar 2 + Tailwind 3
  target: Windows x64 NSIS installer
---

# 牙牙乐日报助手 · 部署工作流

本项目是 Electron + Vite + Quasar 桌面应用，部署到 Windows 出 NSIS 安装包到 `release\`。本 skill 记录踩过的坑和正确流程，下次直接照抄。

## 一、为什么这个 skill 存在

`npm run electron:build` 跑得通但会撞 4 个坑，每次都手动 debug 半小时。Skill 一次性固化正确流程。

## 二、完整部署流程（4 步）

> 全部命令在项目根 `e:\Users\Shiping\daily-assistant` 下跑。PowerShell 兼容版，不用 `cmd /c`。

### Step 1 · 杀残留进程 + 清空 release

之前跑过 app 没退出，会留 1~6 个 `牙牙乐日报助手.exe` 锁住 `release/win-unpacked/` 下所有文件，删不动。

```powershell
Get-Process -Name "牙牙乐日报助手" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Remove-Item -LiteralPath 'e:\Users\Shiping\daily-assistant\release' -Recurse -Force -ErrorAction SilentlyContinue
```

如果 `Remove-Item` 报 `Cannot remove item ... being used by another process`：
- 任务管理器 → 详细信息 → 找 `牙牙乐日报助手.exe` → 结束任务
- 重新跑上述 `Remove-Item`

### Step 2 · 编译 electron 入口到 dist-electron

`tsconfig.json` 是 `noEmit: true`，vue-tsc 不输出 dist-electron。要用 **esbuild 手工编译**：

```powershell
npx esbuild electron/main.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-electron/main.cjs --external:electron --external:sharp --external:better-sqlite3

npx esbuild electron/preload.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-electron/preload.cjs --external:electron
```

**为什么是 `.cjs` 而不是 `.js`**：见下方"坑 3"。

### Step 3 · 编译 renderer（Vite）

```powershell
npm run build
```

跑 `vue-tsc -b && vite build`，生成 `dist/`。Quasar 样式自动注入。

### Step 4 · electron-builder 打包 NSIS

```powershell
npx electron-builder --win --x64
```

输出：
- `release\牙牙乐日报助手 Setup 2.0.0.exe` （117 MB，NSIS 安装包）
- `release\win-unpacked\牙牙乐日报助手.exe` （169 MB，免安装绿色版，可双击直接跑）

**最后那个 `GitHub Personal Access Token is not set` 错误可以忽略** — 是自动上传 GitHub release 的 hook 失败，安装包已经成功生成。

## 三、踩过的坑（必须知道）

### 坑 1 · 残留进程锁住 release/

**症状**：`remove E:\...\release\win-unpacked\d3dcompiler_47.dll: Access is denied`

**原因**：之前跑过 `牙牙乐日报助手.exe` 没干净退出，6 个 electron 进程持有 `app.asar`、`d3dcompiler_47.dll`、`v8_context_snapshot.bin` 等文件句柄。

**修法**：见 Step 1。

### 坑 2 · dist-electron/ 整个消失

**症状**：`Application entry file "dist-electron\main.js" in the ... does not exist`

**原因**：`tsconfig.json` 的 `noEmit: true`，vue-tsc 检查类型但不输出。`dist-electron/` 必须靠 `tsc` 或 `esbuild` 手动生成。

**修法**：见 Step 2。`esbuild` 比 `tsc` 快 10×，推荐用 esbuild。

### 坑 3 · `require is not defined in ES module scope`

**症状**：双击安装后的 app 报 "ReferenceError: require is not defined in ES module scope, you can use import instead"。

**原因**：`package.json` 有 `"type": "module"`，app.asar 里的 `.js` 文件被 Node 当 ESM 解析。但 main.js 是 esbuild cjs 输出，里面有 `require()`。撞了。

**修法**：编译输出后缀改成 `.cjs`（Node 强制 CommonJS 解析，不受 `type: module` 影响）。

```json
// package.json
"main": "dist-electron/main.cjs"   // 不是 .js
```

### 坑 4 · `import.meta` 在 cjs 下为空

**症状**：cjs 输出警告 `import.meta is not available with cjs output and will be empty`，运行时 `__dirname` 变 `undefined` 找不到资源。

**原因**：`electron/main.ts` 写的是 `const __dirname = path.dirname(fileURLToPath(import.meta.url))`（Vite/ESM 写法），esbuild 编译 cjs 时 `import.meta.url` 留空。

**修法**：在 [electron/main.ts](file:///e:/Users%5CShiping/daily-assistant/electron/main.ts) 改用兼容写法：

```ts
const __dirname = (typeof __dirname !== 'undefined' ? __dirname : process.cwd())
```

### 坑 5 · `release/win-unpacked/resources/app.asar` 被 OS 级锁锁死

**症状**：Step 1 `Remove-Item release/` 时只删得掉其他文件，剩 `app.asar` 删不掉（错误码 32 ERROR_SHARING_VIOLATION）。重启 explorer / 关闭 Windows Defender / `Add-MpPreference -ExclusionPath` / `MoveFileEx(REPLACE_EXISTING)` / `DeleteFileW` 全部失败。`Get-Process` 和 `Get-Process | Modules` 都找不到锁的进程。

**原因**：Windows 资源管理器（缩略图/预览）或 Antivirus filter driver 在 kernel 级别持有 `app.asar` 句柄。`Get-Process` 看不到，filter driver 是 OS 内核层。

**修法**（绕过，不等锁释放）：

```powershell
# 临时把 build 输出改到新目录
# 改 package.json:
#   "build": { "directories": { "output": "release_v2_1_1" } }
# 然后跑 npx electron-builder --win --x64
# 产物在 release_v2_1_1/ 完整生成后，把 output 改回 "release"
# 等下次 OS 释放旧 .asar 锁（重启后通常能），再把 release_v2_1_1/ 内容覆盖到 release/
```

不要耗在删 .asar 上 — 浪费时间。

### 坑 6 · `electron/main.ts` 里的 preload 路径忘了同步改成 `.cjs`

**症状**：安装后所有功能失效。打开"AI 分析"测试连接，提示 **"Electron 未启动，无法测试连接"**。侧边栏/路由/UI 都正常显示，但**所有 IPC 调用（设置、AI 测试、截图、应用追踪、报告生成）都失败**。Console 没有任何 preload 相关错误（因为 preload 根本没加载）。

**原因**：坑 3 把 esbuild 输出后缀从 `.js` 改成 `.cjs` 之后，[electron/main.ts](file:///e:/Users%5CShiping/daily-assistant/electron/main.ts) line 50 里的 `BrowserWindow` 配置**还是** `'preload.js'`。Electron 启动时去 asar 里找 `dist-electron/preload.js`，找不到就静默跳过 preload 加载 → `window.api` 永远没注入 → renderer 里所有 `window.api.xxx()` 都抛"未启动"。

**修法**：改 [electron/main.ts](file:///e:/Users%5CShiping/daily-assistant/electron/main.ts) line 50：

```ts
// 修复前
preload: path.join(__dirname, 'preload.js'),
// 修复后
preload: path.join(__dirname, 'preload.cjs'),
```

然后重跑 Step 2 (esbuild) + Step 4 (electron-builder)。

**每次 esbuild 完必须验证**（这是最低成本的回归检测）：

```powershell
# 1. 源码里的 preload 路径必须是 .cjs
Select-String -Path electron/main.ts -Pattern "preload\.(js|cjs)"
# 应输出: preload: path.join(__dirname, 'preload.cjs'),

# 2. 编译产物里的 preload 路径必须是 .cjs
Select-String -Path dist-electron/main.cjs -Pattern "preload\.(js|cjs)"
# 应输出: preload: import_node_path4.default.join(__dirname, "preload.cjs"),

# 3. asar 包里的 preload 路径必须是 .cjs
npx asar extract release/win-unpacked/resources/app.asar $env:TEMP/verify
Select-String -Path $env:TEMP/verify/dist-electron/main.cjs -Pattern "preload\.(js|cjs)"
# 应输出: preload.cjs
Remove-Item $env:TEMP/verify -Recurse -Force
```

**教训**：esbuild 改输出后缀时，**所有引用路径必须同步 grep 改全**。`electron/main.ts`、`package.json` 的 `"main"` 字段、dist-electron 里的 main.cjs 三处都得验。

## 四、验证

构建完成后，按顺序检查：

```powershell
# 1. dist-electron/ 存在且大小合理
Get-ChildItem e:\Users\Shiping\daily-assistant\dist-electron
# 应有 main.cjs (90+KB), preload.cjs (5KB)

# 2. release/ 安装包
Get-ChildItem e:\Users\Shiping\daily-assistant\release -Filter "*.exe"
# 应有 "牙牙乐日报助手 Setup 2.0.0.exe"

# 3. asar 里有 .cjs 入口（不是 .js）
npx asar list e:\Users\Shiping\daily-assistant\release\win-unpacked\resources\app.asar | Select-String "main\.cjs|preload\.cjs"
# 应输出: \dist-electron\main.cjs  \dist-electron\preload.cjs

# 4. 绿色版启动测试（先关旧进程）
Get-Process -Name "牙牙乐日报助手" -ErrorAction SilentlyContinue | Stop-Process -Force
& e:\Users\Shiping\daily-assistant\release\win-unpacked\牙牙乐日报助手.exe
# 应能开窗、侧边栏 / 路由 / Quasar 控件都正常
```

## 五、一键完整部署（5 步合一）

```powershell
$ErrorActionPreference = "Stop"
$root = "e:\Users\Shiping\daily-assistant"
Set-Location $root

# 1. 杀残留
Get-Process -Name "牙牙乐日报助手" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 1
Remove-Item -LiteralPath (Join-Path $root "release") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $root "dist-electron") -Recurse -Force -ErrorAction SilentlyContinue

# 2. 编译 electron 入口
npx esbuild electron/main.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-electron/main.cjs --external:electron --external:sharp --external:better-sqlite3
npx esbuild electron/preload.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist-electron/preload.cjs --external:electron

# 3. 编译 renderer
npm run build

# 4. 打包
npx electron-builder --win --x64

# 5. 输出位置
Get-ChildItem release -Filter "*.exe" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
```

## 六、关键文件位置

| 文件 | 角色 |
|------|------|
| [package.json](file:///e:/Users%5CShiping/daily-assistant/package.json) | `"main": "dist-electron/main.cjs"`, `"type": "module"`, build.files, scripts |
| [electron/main.ts](file:///e:/Users%5CShiping/daily-assistant/electron/main.ts) | 主进程入口（用了兼容 __dirname 写法） |
| [electron/preload.ts](file:///e:/Users%5CShiping/daily-assistant/electron/preload.ts) | contextBridge 注入 |
| [tsconfig.json](file:///e:/Users%5CShiping/daily-assistant/tsconfig.json) | noEmit, 类型检查 only |
| [vite.config.ts](file:///e:/Users%5CShiping/daily-assistant/vite.config.ts) | Quasar + Vite renderer |
| [src/main.ts](file:///e:/Users%5CShiping/daily-assistant/src/main.ts) | Vue app + Quasar install |
| [build/afterPack.cjs](file:///e:/Users%5CShiping/daily-assistant/build/afterPack.cjs) | 装图标后处理 |

## 七、不要改的东西

- **不要** 把 `dist-electron/main.cjs` 改回 `.js` — 会撞坑 3
- **不要** 在 `package.json` 去掉 `"type": "module"` — Vite renderer 需要
- **不要** 用 `tsc -p tsconfig.json` 编译 electron — 慢且 noEmit
- **不要** 忽略最后那个 `GH_TOKEN` 错误 — 是预期，install 仍可用
