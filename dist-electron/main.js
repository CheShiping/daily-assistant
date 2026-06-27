import { app, screen, desktopCapturer, BrowserWindow, Notification, globalShortcut, ipcMain, dialog, shell, Menu, nativeImage, Tray } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { spawn, execFile } from "node:child_process";
import http from "node:http";
const DEFAULTS$1 = {
  version: 1,
  workRecords: [],
  reports: [],
  templates: [],
  screenshots: [],
  appUsageRecords: [],
  planItems: [],
  settings: {}
};
let dbPath = "";
let data = null;
let saveTimer = null;
function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getDb() {
  if (data) return data;
  const userData = app.getPath("userData");
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  dbPath = path.join(userData, "daily-assistant.json");
  let d;
  if (fs.existsSync(dbPath)) {
    try {
      d = { ...DEFAULTS$1, ...JSON.parse(fs.readFileSync(dbPath, "utf-8")) };
    } catch {
      d = { ...DEFAULTS$1 };
    }
  } else {
    d = { ...DEFAULTS$1 };
  }
  if (d.version < 2) {
    for (const t of d.templates) {
      if (!t.clustering) t.clustering = "timeline";
    }
    const defaults = {
      autoDeleteScreenshots: "true",
      sensitiveSceneSkip: "true",
      privacyLevel: "standard",
      globalShortcut: "Ctrl+Shift+J",
      showNotifications: "true",
      subscription: "free",
      localApiEnabled: "false",
      localApiPort: "8088",
      localApiToken: ""
    };
    for (const [key, val] of Object.entries(defaults)) {
      if (!d.settings[key]) d.settings[key] = val;
    }
    d.version = 2;
  }
  if (d.templates.filter((t) => t.isBuiltin).length === 0) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const builtinTemplates = [
      {
        id: "tpl-daily-default",
        name: "标准日报模板",
        type: "daily",
        content: "# {{日期}} 工作日报\n\n## 今日完成\n{{今日完成}}\n\n## 关键数据\n{{关键数据}}\n\n## 遇到的问题\n{{遇到的问题}}\n\n## 明日计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "timeline",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-simple",
        name: "简洁日报",
        type: "daily",
        content: "# {{日期}} 工作日报\n\n## 已完成\n{{今日完成}}\n\n## 未完成\n{{遇到的问题}}\n\n## 明日计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-tech",
        name: "技术日报",
        type: "daily",
        content: "# {{日期}} 技术日报\n\n## 开发进展\n{{今日完成}}\n\n## 技术问题与解决方案\n{{关键数据}}\n\n## 代码质量\n{{遇到的问题}}\n\n## 明日技术计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-project",
        name: "项目日报",
        type: "daily",
        content: "# {{日期}} 项目日报\n\n## 项目进展\n{{今日完成}}\n\n## 里程碑状态\n{{关键数据}}\n\n## 风险与阻塞\n{{遇到的问题}}\n\n## 下一步\n{{明日计划}}",
        isBuiltin: true,
        clustering: "project",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-pomodoro",
        name: "番茄钟聚类",
        type: "daily",
        content: "# {{日期}} 工作日报\n\n## 工作时间块\n{{今日完成}}\n\n## 效率分析\n{{关键数据}}\n\n## 明日计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "timeline",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-weekly-default",
        name: "标准周报模板",
        type: "weekly",
        content: "# {{起始}} - {{结束}} 工作周报\n\n## 本周完成\n{{本周完成}}\n\n## 关键成果\n{{关键成果}}\n\n## 问题与风险\n{{问题与风险}}\n\n## 下周计划\n{{下周计划}}",
        isBuiltin: true,
        clustering: "timeline",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-monthly-default",
        name: "标准月报模板",
        type: "monthly",
        content: "# {{月份}} 工作月报\n\n## 本月完成\n{{本月完成}}\n\n## 关键数据\n{{关键数据}}\n\n## 复盘与改进\n{{复盘与改进}}\n\n## 下月计划\n{{下月计划}}",
        isBuiltin: true,
        clustering: "timeline",
        createdAt: now,
        updatedAt: now
      }
    ];
    for (const t of builtinTemplates) {
      if (!d.templates.find((x) => x.id === t.id)) d.templates.push(t);
    }
    save();
  } else {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const builtinToAdd = [
      {
        id: "tpl-daily-simple",
        name: "简洁日报",
        type: "daily",
        content: "# {{日期}} 工作日报\n\n## 已完成\n{{今日完成}}\n\n## 未完成\n{{遇到的问题}}\n\n## 明日计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-tech",
        name: "技术日报",
        type: "daily",
        content: "# {{日期}} 技术日报\n\n## 开发进展\n{{今日完成}}\n\n## 技术问题与解决方案\n{{关键数据}}\n\n## 代码质量\n{{遇到的问题}}\n\n## 明日技术计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-project",
        name: "项目日报",
        type: "daily",
        content: "# {{日期}} 项目日报\n\n## 项目进展\n{{今日完成}}\n\n## 里程碑状态\n{{关键数据}}\n\n## 风险与阻塞\n{{遇到的问题}}\n\n## 下一步\n{{明日计划}}",
        isBuiltin: true,
        clustering: "project",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-pomodoro",
        name: "番茄钟聚类",
        type: "daily",
        content: "# {{日期}} 工作日报\n\n## 工作时间块\n{{今日完成}}\n\n## 效率分析\n{{关键数据}}\n\n## 明日计划\n{{明日计划}}",
        isBuiltin: true,
        clustering: "timeline",
        createdAt: now,
        updatedAt: now
      }
    ];
    let added = false;
    for (const t of builtinToAdd) {
      if (!d.templates.find((x) => x.id === t.id)) {
        d.templates.push(t);
        added = true;
      }
    }
    if (added) save();
  }
  data = d;
  return d;
}
function save() {
  if (!data) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (data) fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  }, 100);
}
function saveSync() {
  if (!data) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
}
function closeDb() {
  saveSync();
  data = null;
}
function listWorkRecords(opts = {}) {
  const db = getDb();
  let rows = [...db.workRecords];
  if (opts.date) {
    const target = opts.date;
    rows = rows.filter((r) => r.startedAt.slice(0, 10) === target);
  } else if (opts.startDate && opts.endDate) {
    rows = rows.filter((r) => r.startedAt >= opts.startDate && r.startedAt <= opts.endDate);
  }
  if (opts.date || opts.startDate && opts.endDate) {
    rows.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  } else {
    rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 200;
  return rows.slice(offset, offset + limit);
}
function createWorkRecord(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rec = {
    id: cryptoRandom$3(),
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? null,
    summary: input.summary,
    category: input.category ?? null,
    appName: input.appName ?? null,
    source: input.source ?? "manual",
    screenshotPath: input.screenshotPath ?? null,
    createdAt: now,
    updatedAt: now
  };
  db.workRecords.push(rec);
  save();
  return rec;
}
function updateWorkRecord(input) {
  const db = getDb();
  const r = db.workRecords.find((x) => x.id === input.id);
  if (!r) throw new Error("记录不存在");
  if (input.summary !== void 0) r.summary = input.summary;
  if (input.category !== void 0) r.category = input.category;
  if (input.startedAt !== void 0) r.startedAt = input.startedAt;
  if (input.endedAt !== void 0) r.endedAt = input.endedAt;
  r.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  save();
  return r;
}
function deleteWorkRecord(id) {
  const db = getDb();
  db.workRecords = db.workRecords.filter((r) => r.id !== id);
  save();
}
function dailySummary(date) {
  const records = listWorkRecords({ date });
  const byCategory = {};
  for (const r of records) {
    const c = r.category ?? "其他";
    byCategory[c] = (byCategory[c] ?? 0) + 1;
  }
  return { total: records.length, byCategory, records };
}
function listReports(opts = {}) {
  const db = getDb();
  const rows = [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}
function createReport(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const r = {
    id: input.id,
    title: input.title,
    type: input.type,
    content: "",
    startDate: input.startDate,
    endDate: input.endDate,
    status: "generating",
    model: input.model,
    createdAt: now,
    updatedAt: now
  };
  db.reports.push(r);
  save();
  return r;
}
function updateReport(id, patch) {
  const db = getDb();
  const r = db.reports.find((x) => x.id === id);
  if (!r) return;
  Object.assign(r, patch, { updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  save();
}
function deleteReport(id) {
  const db = getDb();
  db.reports = db.reports.filter((r) => r.id !== id);
  save();
}
function listTemplates(type) {
  const db = getDb();
  let rows = [...db.templates];
  if (type) rows = rows.filter((t) => t.type === type);
  rows.sort((a, b) => a.isBuiltin === b.isBuiltin ? a.createdAt.localeCompare(b.createdAt) : a.isBuiltin ? -1 : 1);
  return rows;
}
function createTemplate(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const t = {
    id: cryptoRandom$3(),
    name: input.name,
    type: input.type,
    content: input.content,
    isBuiltin: false,
    clustering: input.clustering || "timeline",
    createdAt: now,
    updatedAt: now
  };
  db.templates.push(t);
  save();
  return t;
}
function updateTemplate(input) {
  const db = getDb();
  const t = db.templates.find((x) => x.id === input.id);
  if (!t) throw new Error("模板不存在");
  if (t.isBuiltin) throw new Error("内置模板不可修改");
  if (input.name !== void 0) t.name = input.name;
  if (input.content !== void 0) t.content = input.content;
  t.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  save();
  return t;
}
function deleteTemplate(id) {
  const db = getDb();
  const t = db.templates.find((x) => x.id === id);
  if (t == null ? void 0 : t.isBuiltin) throw new Error("内置模板不可删除");
  db.templates = db.templates.filter((x) => x.id !== id);
  save();
}
function createScreenshot(input) {
  const db = getDb();
  const s = {
    id: input.id,
    path: input.path,
    takenAt: input.takenAt,
    analysis: null,
    appName: null,
    analyzed: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.screenshots.push(s);
  save();
  return s;
}
function updateScreenshot(id, patch) {
  const db = getDb();
  const s = db.screenshots.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, patch);
  save();
}
function listScreenshots(opts = {}) {
  const db = getDb();
  let rows = [...db.screenshots];
  if (opts.date) rows = rows.filter((s) => s.takenAt.slice(0, 10) === opts.date);
  rows.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  return rows.slice(0, opts.limit ?? 100);
}
function setSetting(key, value) {
  const db = getDb();
  db.settings[key] = value;
  save();
}
function getAllSettings() {
  return { ...getDb().settings };
}
function timeline(opts = {}) {
  const db = getDb();
  let rows = [...db.workRecords];
  if (opts.startDate && opts.endDate) {
    rows = rows.filter((r) => r.startedAt >= opts.startDate && r.startedAt <= opts.endDate);
  } else {
    const todayStr = localDate(/* @__PURE__ */ new Date());
    rows = rows.filter((r) => r.startedAt.slice(0, 10) === todayStr);
  }
  rows.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return rows;
}
function heatmap(opts = {}) {
  const db = getDb();
  let rows = [...db.workRecords];
  const end = opts.endDate ? new Date(opts.endDate) : /* @__PURE__ */ new Date();
  const start = opts.startDate ? new Date(opts.startDate) : new Date(end.getTime() - 6 * 24 * 60 * 60 * 1e3);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  rows = rows.filter((r) => {
    const t = new Date(r.startedAt).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const d = new Date(r.startedAt);
    const dateStr = localDate(d);
    const hour = d.getHours();
    const key = `${dateStr}_${hour}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const result = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = localDate(cur);
    for (let h = 0; h < 24; h++) {
      const key = `${dateStr}_${h}`;
      result.push({ date: dateStr, hour: h, count: map.get(key) ?? 0 });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}
function createAppUsageRecord(input) {
  const db = getDb();
  const rec = {
    id: cryptoRandom$3(),
    appName: input.appName,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSec: input.durationSec,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.appUsageRecords.push(rec);
  save();
  return rec;
}
function appUsage(opts = {}) {
  const db = getDb();
  let rows = [...db.appUsageRecords];
  if (opts.startDate && opts.endDate) {
    rows = rows.filter((r) => r.startedAt >= opts.startDate && r.startedAt <= opts.endDate);
  } else {
    const todayStr = localDate(/* @__PURE__ */ new Date());
    rows = rows.filter((r) => r.startedAt.slice(0, 10) === todayStr);
  }
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const cur = map.get(r.appName) ?? { durationSec: 0, count: 0, firstAt: null, lastAt: null };
    cur.durationSec += r.durationSec;
    cur.count += 1;
    if (!cur.firstAt || r.startedAt < cur.firstAt) cur.firstAt = r.startedAt;
    if (!cur.lastAt || r.startedAt > cur.lastAt) cur.lastAt = r.startedAt;
    map.set(r.appName, cur);
  }
  const list = Array.from(map.entries()).map(([appName, v]) => ({ appName, ...v, durationMinutes: Math.round(v.durationSec / 60) })).sort((a, b) => b.durationSec - a.durationSec);
  const total = list.reduce((s, x) => s + x.durationSec, 0);
  return list.map((x) => ({ ...x, share: total > 0 ? +(x.durationSec / total * 100).toFixed(1) : 0 }));
}
function listPlans(opts) {
  const db = getDb();
  return db.planItems.filter((p) => p.date === opts.date).sort((a, b) => a.order - b.order);
}
function createPlan(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = db.planItems.filter((p) => p.date === input.date);
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.order)) : 0;
  const plan = {
    id: cryptoRandom$3(),
    date: input.date,
    text: input.text,
    completed: false,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now
  };
  db.planItems.push(plan);
  save();
  return plan;
}
function updatePlan(input) {
  const db = getDb();
  const p = db.planItems.find((x) => x.id === input.id);
  if (!p) throw new Error("计划不存在");
  if (input.text !== void 0) p.text = input.text;
  if (input.completed !== void 0) p.completed = input.completed;
  if (input.order !== void 0) p.order = input.order;
  p.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  save();
  return p;
}
function deletePlan(id) {
  const db = getDb();
  db.planItems = db.planItems.filter((p) => p.id !== id);
  save();
}
function exportAll() {
  return JSON.parse(JSON.stringify(getDb()));
}
function importAll(input) {
  const db = getDb();
  if (Array.isArray(input.workRecords)) db.workRecords = input.workRecords;
  if (Array.isArray(input.reports)) db.reports = input.reports;
  if (Array.isArray(input.templates)) {
    const builtin = db.templates.filter((t) => t.isBuiltin);
    db.templates = [...builtin, ...input.templates.filter((t) => !t.isBuiltin)];
  }
  if (input.settings) db.settings = { ...input.settings };
  save();
}
function clearAll() {
  const db = getDb();
  db.workRecords = [];
  db.reports = [];
  db.templates = [];
  db.screenshots = [];
  db.appUsageRecords = [];
  save();
}
function cryptoRandom$3() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
const DEFAULTS = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  visionModel: "gpt-4o-mini",
  screenshotIntervalSec: 120,
  visionEnabled: true,
  excludedApps: [],
  memoryContent: "",
  customInstruction: "",
  preservePath: "",
  scheduledReportEnabled: true,
  scheduledReportTime: "18:00",
  // Phase 1 新增
  autoDeleteScreenshots: true,
  sensitiveSceneSkip: true,
  privacyLevel: "standard",
  globalShortcut: "Ctrl+Shift+J",
  showNotifications: true,
  subscription: "free",
  subscriptionExpiry: null,
  inviteCode: "",
  localApiEnabled: false,
  localApiPort: 8088,
  localApiToken: ""
};
function getSettings() {
  const map = getAllSettings();
  return {
    ...DEFAULTS,
    apiKey: map.apiKey ?? "",
    baseUrl: map.baseUrl ?? DEFAULTS.baseUrl,
    model: map.model ?? DEFAULTS.model,
    visionModel: map.visionModel ?? DEFAULTS.visionModel,
    screenshotIntervalSec: Number(map.screenshotIntervalSec ?? DEFAULTS.screenshotIntervalSec),
    visionEnabled: map.visionEnabled !== "false",
    excludedApps: map.excludedApps ? JSON.parse(map.excludedApps) : [],
    memoryContent: map.memoryContent ?? "",
    customInstruction: map.customInstruction ?? "",
    preservePath: map.preservePath ?? "",
    scheduledReportEnabled: map.scheduledReportEnabled !== "false",
    scheduledReportTime: map.scheduledReportTime ?? DEFAULTS.scheduledReportTime,
    // Phase 1 新增
    autoDeleteScreenshots: map.autoDeleteScreenshots !== "false",
    sensitiveSceneSkip: map.sensitiveSceneSkip !== "false",
    privacyLevel: ["loose", "standard", "strict"].includes(map.privacyLevel) ? map.privacyLevel : "standard",
    globalShortcut: map.globalShortcut ?? DEFAULTS.globalShortcut,
    showNotifications: map.showNotifications !== "false",
    subscription: map.subscription === "pro" ? "pro" : "free",
    subscriptionExpiry: map.subscriptionExpiry ?? null,
    inviteCode: map.inviteCode ?? "",
    localApiEnabled: map.localApiEnabled === "true",
    localApiPort: Number(map.localApiPort ?? DEFAULTS.localApiPort),
    localApiToken: map.localApiToken ?? ""
  };
}
function updateSettings(patch) {
  const current = getSettings();
  const next = { ...current, ...patch };
  setSetting("apiKey", next.apiKey);
  setSetting("baseUrl", next.baseUrl);
  setSetting("model", next.model);
  setSetting("visionModel", next.visionModel);
  setSetting("screenshotIntervalSec", String(next.screenshotIntervalSec));
  setSetting("visionEnabled", String(next.visionEnabled));
  setSetting("excludedApps", JSON.stringify(next.excludedApps));
  setSetting("memoryContent", next.memoryContent);
  setSetting("customInstruction", next.customInstruction);
  setSetting("preservePath", next.preservePath);
  setSetting("scheduledReportEnabled", String(next.scheduledReportEnabled));
  setSetting("scheduledReportTime", next.scheduledReportTime);
  setSetting("autoDeleteScreenshots", String(next.autoDeleteScreenshots));
  setSetting("sensitiveSceneSkip", String(next.sensitiveSceneSkip));
  setSetting("privacyLevel", next.privacyLevel);
  setSetting("globalShortcut", next.globalShortcut);
  setSetting("showNotifications", String(next.showNotifications));
  setSetting("subscription", next.subscription);
  setSetting("subscriptionExpiry", next.subscriptionExpiry ?? "");
  setSetting("inviteCode", next.inviteCode);
  setSetting("localApiEnabled", String(next.localApiEnabled));
  setSetting("localApiPort", String(next.localApiPort));
  setSetting("localApiToken", next.localApiToken);
  return next;
}
const SYSTEM_PROMPTS = {
  report: "你是一位工作日报生成助手。请严格基于用户提供的工作记录生成报告，不得编造、夸大或遗漏。保持专业、简洁、客观的职场表达。直接输出报告正文，不要添加额外解释、总结或元评论。",
  classify: "你是一个工作活动分类助手。根据工作描述判断所属类别，只输出类别名称，不要输出其他内容。",
  template: "你是一位资深职场报告写作专家。请基于用户提供的参考报告和自定义需求，生成一个高质量、可复用的报告模板。\n\n严格使用 Markdown 格式，第一行必须是 `# 模板标题`，正文使用 `{{占位符}}` 格式表示可变内容。只输出最终模板内容。",
  vision: `你是一个工作活动识别助手。请分析截图，描述当前屏幕上正在进行的活动，严格按照以下 JSON 格式返回：

{
  "category": "分类名",
  "summary": "详细描述"
}

## 核心原则：
无论截图内容是什么，都必须给出描述。即使是桌面、锁屏、空闲状态，也要如实描述。绝对不要返回"未识别到工作内容"或空内容。

## 分类选项（必须从中选择）：
- 开发：编程、调试、代码审查、IDE 使用
- 会议：视频会议、线上会议、会议软件
- 沟通：即时通讯、邮件、协作工具
- 文档：文档编辑、阅读、笔记
- 测试：测试执行、Bug 验证
- 设计：UI 设计、原型、设计工具
- 运维：服务器管理、部署、监控
- 数据分析：数据查看、报表、BI 工具
- 学习：在线课程、技术文档阅读、学习平台
- 管理：项目管理、任务管理工具
- 产品：产品规划、需求分析
- 生活：个人事务、社交、娱乐、桌面空闲、休息
- 其他：无法归类的活动

## summary 要求：
1. 用中文描述，50-200 字
2. 包含：活动主题、具体内容、使用的工具/技术、当前进展
3. 如果截图中同时存在多个活动，选择最主要的工作活动进行描述，不要忽略所有内容
4. 隐私脱敏规则（必须严格遵守）：
   - 即时通讯类（QQ、微信、钉钉、飞书、企业微信、Slack、Telegram、Discord）：category 设为"生活"，summary 固定写"当前包含私人沟通内容，具体内容已脱敏，不纳入日报。"
   - 社交媒体类（微博、抖音、小红书、快手、B站、Twitter、Instagram、Facebook、知乎）：category 设为"生活"，summary 固定写"浏览社交媒体，具体内容已脱敏。"
   - 邮件：不描述邮件具体内容，summary 写"处理邮件"
   - 绝对不要描述聊天对象、聊天内容、个人信息等任何隐私细节
5. 桌面/空闲状态：category 设为"生活"，summary 写"查看桌面，当前无明确工作活动。"
6. 不要输出任何额外内容，只返回 JSON`,
  test: "请只回复 OK，用于测试连接。"
};
const CATEGORIES = ["开发", "会议", "文档", "测试", "沟通", "设计", "运维", "数据分析", "学习", "管理", "产品", "生活", "其他"];
const CATEGORY_KEYWORDS = {
  "开发": ["代码", "编程", "开发", "IDE", "vscode", "vs code", "git", "github", "gitlab", "调试", "debug", "api", "函数", "bug", "编译", "终端", "terminal", "npm", "python", "java", "javascript", "typescript", "go", "rust", "react", "vue", "node", "docker", "k8s", "部署", "前端", "后端", "框架", "重构", "提交", "commit", "merge", "分支", "branch", "栈", "堆栈", "报错", "异常", "接口", "联调"],
  "会议": ["会议", "开会", "讨论", "zoom", "腾讯会议", "钉钉", "飞书", "视频会议", "评审", "站会", "周会", "例会", "需求评审", "技术评审", "头脑风暴", "brainstorm", "同步", "对齐", "拉齐"],
  "文档": ["文档", "word", "excel", "ppt", "powerpoint", "写文档", "笔记", "markdown", "notion", "语雀", "confluence", "wiki", "整理文档", "文档编写", "说明文档", "设计文档", "技术文档"],
  "测试": ["测试", "test", "qa", "验收", "回归", "测试用例", "自动化测试", "单元测试", "集成测试", "压测", "性能测试", "jenkins", "ci/cd", "缺陷", "bug修复", "验证"],
  "沟通": ["聊天", "微信", "邮件", "email", "slack", "沟通", "回复", "消息", "discord", "telegram", "企业微信", "即时通讯", "交流", "协商"],
  "设计": ["设计", "figma", "sketch", "ui", "ux", "原型", "设计稿", "切图", "标注", "photoshop", "ps", "ai", "illustrator", "交互设计", "视觉设计", "组件库"],
  "运维": ["运维", "服务器", "server", "docker", "kubernetes", "k8s", "部署", "监控", "日志", "log", "nginx", "linux", "shell", "脚本", "巡检", "告警", "故障", "恢复", "扩容"],
  "数据分析": ["数据", "分析", "报表", "统计", "bi", "数据库", "sql", "mysql", "redis", "elasticsearch", "数据清洗", "数据可视化", "指标", "dashboard", "埋点", "etl"],
  "学习": ["学习", "课程", "教程", "视频", "阅读", "看书", "文档", "博客", "stackoverflow", "b站", "coursera", "udemy", "技术文章", "研究", "调研"],
  "管理": ["管理", "计划", "排期", "任务", "jira", "项目管理", "teambition", "tapd", "看板", "敏捷", "scrum", "分配", "跟进", "协调", "汇报", "审批"],
  "产品": ["产品", "需求", "原型", "prd", "用户", "竞品", "axure", "产品规划", "路线图", "功能", "版本", "迭代", "用户调研", "反馈"],
  "生活": ["休息", "吃饭", "浏览", "购物", "音乐", "视频", "新闻", "社交媒体", "微博", "抖音", "小红书", "快手", "b站", "哔哩哔哩", "twitter", "instagram", "facebook", "知乎", "youtube", "netflix", "游戏", "闲聊", "桌面"]
};
function classifyByKeywords(summary) {
  const lower = summary.toLowerCase();
  let bestMatch = "其他";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((k) => lower.includes(k.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }
  return bestMatch;
}
function authHeaders(settings) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey}`
  };
}
function apiUrl(settings, path2) {
  const base = settings.baseUrl.replace(/\/$/, "");
  return `${base}${path2}`;
}
async function testConnection() {
  var _a, _b, _c;
  const settings = getSettings();
  if (!settings.apiKey) return { ok: false, message: "请先配置 API Key" };
  try {
    const res = await fetch(apiUrl(settings, "/chat/completions"), {
      method: "POST",
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: "user", content: SYSTEM_PROMPTS.test }],
        max_tokens: 10
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, message: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data2 = await res.json();
    const reply = ((_c = (_b = (_a = data2.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) ?? "";
    return { ok: true, message: `连接成功，模型回复：${reply}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
async function analyzeScreenshot(imageBase64, memoryContent) {
  var _a, _b;
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("请先配置 API Key");
  const systemContent = memoryContent ? `${SYSTEM_PROMPTS.vision}

个人工作记忆：
${memoryContent}` : SYSTEM_PROMPTS.vision;
  const res = await fetch(apiUrl(settings, "/chat/completions"), {
    method: "POST",
    headers: authHeaders(settings),
    body: JSON.stringify({
      model: settings.visionModel,
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: [
            { type: "text", text: "请分析这张截图中的工作活动。" },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`视觉识别失败: HTTP ${res.status} ${txt.slice(0, 500)}`);
  }
  const data2 = await res.json();
  console.log("[vision] 完整返回:", JSON.stringify(data2).slice(0, 800));
  const msg = (_b = (_a = data2.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message;
  const reply = ((msg == null ? void 0 : msg.content) ?? (msg == null ? void 0 : msg.reasoning_content) ?? "").trim();
  console.log("[vision] AI 返回内容:", reply.slice(0, 300));
  let parsed = null;
  try {
    parsed = JSON.parse(reply);
  } catch {
  }
  if (!parsed) {
    const codeBlock = reply.match(/```json\s*([\s\S]*?)```/);
    if (codeBlock) {
      try {
        parsed = JSON.parse(codeBlock[1].trim());
      } catch {
      }
    }
  }
  if (!parsed) {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
      }
    }
  }
  if (parsed && parsed.category) {
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "其他";
    const summary = String(parsed.summary ?? "").trim() || "当前屏幕无明确工作活动";
    return { category, summary };
  }
  if (reply) {
    const sumMatch = reply.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (sumMatch && sumMatch[1]) {
      const extracted = sumMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
      const catMatch = reply.match(/"category"\s*:\s*"([^"]*)"/);
      const category = catMatch && CATEGORIES.includes(catMatch[1]) ? catMatch[1] : classifyByKeywords(reply);
      return { category, summary: extracted || "当前屏幕无明确工作活动" };
    }
    let cleanReply = reply;
    if (cleanReply.startsWith("```")) cleanReply = cleanReply.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    return { category: classifyByKeywords(cleanReply), summary: cleanReply.slice(0, 200) };
  }
  return { category: "生活", summary: "当前屏幕内容未能识别，请手动确认。" };
}
async function generateReport(input, onChunk, onDone, onError) {
  var _a, _b, _c;
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("请先配置 API Key"));
    return;
  }
  const typeLabel = input.type === "daily" ? "日报" : input.type === "weekly" ? "周报" : "月报";
  const lines = [];
  lines.push(`【报告类型】${typeLabel}`);
  lines.push(`【日期范围】${input.startDate} 至 ${input.endDate}`);
  if (input.appUsageSummary && input.appUsageSummary.length > 0) {
    lines.push("【应用使用时长参考】");
    for (const a of input.appUsageSummary) {
      lines.push(`- ${a.appName}: ${a.durationMinutes} 分钟`);
    }
  }
  if (input.templateBody) {
    const clusteringHints = {
      timeline: "按时间线排列工作记录，标注每个时间段做了什么。",
      category: "按工作分类归纳（开发/会议/文档/测试/沟通等），每类下列出具体事项。",
      project: "识别工作记录中的项目关键词，按项目维度分组组织内容。"
    };
    const hint = clusteringHints[input.clustering ?? "timeline"] ?? clusteringHints.timeline;
    lines.push(`【组织方式】${hint}`);
  }
  if (input.plans && input.plans.length > 0) {
    lines.push("【今日计划】");
    const completed = input.plans.filter((p) => p.completed);
    const incomplete = input.plans.filter((p) => !p.completed);
    if (completed.length > 0) {
      lines.push("已完成：");
      completed.forEach((p) => lines.push(`- [x] ${p.text}`));
    }
    if (incomplete.length > 0) {
      lines.push("未完成：");
      incomplete.forEach((p) => lines.push(`- [ ] ${p.text}`));
    }
    lines.push('请在报告中对比"计划 vs 实际"，给出完成情况说明。');
  }
  if (input.templateBody) {
    lines.push(`【报告模板】（仅作为排版格式参考，不要照抄内容）`);
    lines.push(input.templateBody);
  }
  if (input.customInstruction) {
    lines.push(`【自定义指令】${input.customInstruction}`);
  }
  if (input.memoryContent) {
    lines.push(`【个人工作记忆】${input.memoryContent}`);
  }
  lines.push(`【工作记录】`);
  for (const r of input.records) {
    const cat = r.category ? `[${r.category}]` : "";
    lines.push(`- ${r.startedAt} ${cat} ${r.summary}`);
  }
  lines.push("");
  lines.push(`请基于以上工作记录生成一篇中文${typeLabel}。请使用中文生成整篇报告。直接输出报告正文，按 Markdown 格式。`);
  const userPrompt = lines.join("\n");
  try {
    const res = await fetch(apiUrl(settings, "/chat/completions"), {
      method: "POST",
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.report },
          { role: "user", content: userPrompt }
        ],
        stream: true,
        temperature: 0.7
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`生成失败: HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("无响应流");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const eventLines = buffer.split("\n");
      buffer = eventLines.pop() ?? "";
      for (const line of eventLines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data2 = trimmed.slice(5).trim();
        if (data2 === "[DONE]") continue;
        try {
          const json = JSON.parse(data2);
          const delta = (_c = (_b = (_a = json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.delta) == null ? void 0 : _c.content;
          if (delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {
        }
      }
    }
    onDone(full);
  } catch (e) {
    onError(e);
  }
}
async function generateTemplate(reference, requirements, type, onChunk, onDone, onError) {
  var _a, _b, _c;
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("请先配置 API Key"));
    return;
  }
  const typeLabel = type === "daily" ? "日报" : type === "weekly" ? "周报" : "月报";
  const userPrompt = `参考报告：
${reference || "无"}

自定义需求：
${requirements || "无"}

我要你给我生成一份${typeLabel}模板。`;
  try {
    const res = await fetch(apiUrl(settings, "/chat/completions"), {
      method: "POST",
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.template },
          { role: "user", content: userPrompt }
        ],
        stream: true,
        temperature: 0.5
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`模板生成失败: HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("无响应流");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const eventLines = buffer.split("\n");
      buffer = eventLines.pop() ?? "";
      for (const line of eventLines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data2 = trimmed.slice(5).trim();
        if (data2 === "[DONE]") continue;
        try {
          const json = JSON.parse(data2);
          const delta = (_c = (_b = (_a = json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.delta) == null ? void 0 : _c.content;
          if (delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {
        }
      }
    }
    onDone(full);
  } catch (e) {
    onError(e);
  }
}
async function generateInsight(type, data2, onChunk, onDone, onError) {
  var _a, _b, _c;
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("请先配置 API Key"));
    return;
  }
  const prompts = {
    heatmap: `以下是用户的时段热力图数据（日期 × 小时 × 记录数）：
${JSON.stringify(data2)}

请用一句话总结用户的工作节奏特点和一个改进建议。不超过 100 字。`,
    appUsage: `以下是用户的应用使用时长数据：
${JSON.stringify(data2)}

请用一句话总结用户的时间分配特点和一个改进建议。不超过 100 字。`
  };
  try {
    const res = await fetch(apiUrl(settings, "/chat/completions"), {
      method: "POST",
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: "你是一个工作效率分析助手。请简洁、具体地回答。" },
          { role: "user", content: prompts[type] }
        ],
        stream: true,
        temperature: 0.5,
        max_tokens: 200
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("无响应流");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const eventLines = buffer.split("\n");
      buffer = eventLines.pop() ?? "";
      for (const line of eventLines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data22 = trimmed.slice(5).trim();
        if (data22 === "[DONE]") continue;
        try {
          const json = JSON.parse(data22);
          const delta = (_c = (_b = (_a = json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.delta) == null ? void 0 : _c.content;
          if (delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {
        }
      }
    }
    onDone(full);
  } catch (e) {
    onError(e);
  }
}
async function chat(messages, onChunk, onDone, onError) {
  var _a, _b, _c;
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("请先配置 API Key"));
    return;
  }
  try {
    const res = await fetch(apiUrl(settings, "/chat/completions"), {
      method: "POST",
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: true,
        temperature: 0.7
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("无响应流");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const eventLines = buffer.split("\n");
      buffer = eventLines.pop() ?? "";
      for (const line of eventLines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data2 = trimmed.slice(5).trim();
        if (data2 === "[DONE]") continue;
        try {
          const json = JSON.parse(data2);
          const delta = (_c = (_b = (_a = json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.delta) == null ? void 0 : _c.content;
          if (delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {
        }
      }
    }
    onDone(full);
  } catch (e) {
    onError(e);
  }
}
const SENSITIVE_KEYWORDS = [
  "私人沟通",
  "社交媒体",
  "浏览社交媒体",
  "当前包含私人沟通",
  "桌面空闲",
  "查看桌面"
];
function isSensitive(category, summary) {
  if (category !== "生活") return false;
  return SENSITIVE_KEYWORDS.some((kw) => summary.includes(kw));
}
function showNotification(title, body) {
  const settings = getSettings();
  if (!settings.showNotifications) return;
  const win = BrowserWindow.getAllWindows()[0];
  if (win && win.isFocused()) return;
  const n = new Notification({ title, body });
  n.show();
  setTimeout(() => n.close(), 3e3);
}
let timer = null;
let isRunning = false;
let isCapturing = false;
function isScreenshotRunning() {
  return isRunning;
}
function startScreenshot() {
  if (isRunning) return false;
  const settings = getSettings();
  if (!settings.apiKey) return false;
  isRunning = true;
  const intervalMs = Math.max(30, settings.screenshotIntervalSec) * 1e3;
  const scheduleNext = () => {
    if (!isRunning) return;
    timer = setTimeout(async () => {
      await captureAndAnalyze();
      scheduleNext();
    }, intervalMs);
  };
  captureAndAnalyze().finally(() => scheduleNext());
  return true;
}
function stopScreenshot() {
  isRunning = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
function cryptoRandom$2() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
async function captureNow() {
  try {
    const settings = getSettings();
    if (!settings.apiKey) return { ok: false, error: "请先配置 API Key" };
    const displays = screen.getAllDisplays();
    const primary = displays.find((d) => d.bounds.x === 0 && d.bounds.y === 0) ?? displays[0];
    if (!primary) return { ok: false, error: "未找到显示器" };
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false
    });
    const source = sources.find((s) => s.display_id === String(primary.id)) ?? sources[0];
    if (!source) return { ok: false, error: "未找到屏幕源" };
    const thumbnail = source.thumbnail;
    const pngBuffer = thumbnail.toPNG();
    const dataUrl = thumbnail.toDataURL();
    const base64 = dataUrl.split(",")[1];
    const screenshotsDir = path.join(app.getPath("userData"), "screenshots");
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const filename = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.png`;
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, pngBuffer);
    const id = cryptoRandom$2();
    const takenAt = (/* @__PURE__ */ new Date()).toISOString();
    createScreenshot({ id, path: filePath, takenAt });
    if (settings.visionEnabled && base64) {
      console.log("[screenshot] 开始视觉识别, model:", settings.visionModel);
      const result = await analyzeScreenshot(base64, settings.memoryContent);
      console.log("[screenshot] 识别结果:", result.category, "|", result.summary.slice(0, 80));
      updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true });
      if (settings.sensitiveSceneSkip && isSensitive(result.category, result.summary)) {
        console.log("[screenshot] 检测到敏感场景，跳过记录");
        if (settings.autoDeleteScreenshots) {
          try {
            fs.unlinkSync(filePath);
          } catch {
          }
          updateScreenshot(id, { path: "" });
        }
        showNotification("⏭️ 已跳过", "检测到敏感内容，未记录");
        return { ok: true, summary: "敏感内容已跳过", category: "生活" };
      }
      const endedAt = new Date(Date.now() + settings.screenshotIntervalSec * 1e3).toISOString();
      createWorkRecord({
        startedAt: takenAt,
        endedAt,
        summary: result.summary,
        category: result.category,
        source: "manual",
        screenshotPath: settings.autoDeleteScreenshots ? void 0 : filePath
      });
      if (settings.autoDeleteScreenshots) {
        try {
          fs.unlinkSync(filePath);
        } catch {
        }
        updateScreenshot(id, { path: "" });
      }
      showNotification("✅ 快速记录", `${result.category} · ${result.summary.slice(0, 20)}`);
      return { ok: true, summary: result.summary, category: result.category };
    }
    console.warn("[screenshot] 视觉识别未启用或无 base64 数据");
    return { ok: false, error: "视觉识别未启用" };
  } catch (e) {
    console.error("[screenshot] 手动截图失败:", (e == null ? void 0 : e.message) ?? e);
    return { ok: false, error: (e == null ? void 0 : e.message) ?? "截图失败" };
  }
}
async function captureAndAnalyze() {
  if (isCapturing) {
    console.log("[screenshot:auto] 上一次截图仍在进行中，跳过本次");
    return;
  }
  isCapturing = true;
  try {
    const settings = getSettings();
    if (!settings.apiKey) return;
    const displays = screen.getAllDisplays();
    const primary = displays.find((d) => d.bounds.x === 0 && d.bounds.y === 0) ?? displays[0];
    if (!primary) return;
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false
    });
    const source = sources.find((s) => s.display_id === String(primary.id)) ?? sources[0];
    if (!source) return;
    const thumbnail = source.thumbnail;
    const pngBuffer = thumbnail.toPNG();
    const dataUrl = thumbnail.toDataURL();
    const base64 = dataUrl.split(",")[1];
    const screenshotsDir = path.join(app.getPath("userData"), "screenshots");
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const filename = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.png`;
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, pngBuffer);
    const id = cryptoRandom$2();
    const takenAt = (/* @__PURE__ */ new Date()).toISOString();
    createScreenshot({ id, path: filePath, takenAt });
    if (settings.visionEnabled && base64) {
      console.log("[screenshot:auto] 开始视觉识别, model:", settings.visionModel);
      const result = await analyzeScreenshot(base64, settings.memoryContent);
      console.log("[screenshot:auto] 识别结果:", result.category, "|", result.summary.slice(0, 80));
      updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true });
      if (settings.sensitiveSceneSkip && isSensitive(result.category, result.summary)) {
        console.log("[screenshot:auto] 检测到敏感场景，跳过记录");
        if (settings.autoDeleteScreenshots) {
          try {
            fs.unlinkSync(filePath);
          } catch {
          }
          updateScreenshot(id, { path: "" });
        }
        showNotification("⏭️ 已跳过", "检测到敏感内容，未记录");
        return;
      }
      const endedAt = new Date(Date.now() + settings.screenshotIntervalSec * 1e3).toISOString();
      createWorkRecord({
        startedAt: takenAt,
        endedAt,
        summary: result.summary,
        category: result.category,
        source: "auto",
        screenshotPath: settings.autoDeleteScreenshots ? void 0 : filePath
      });
      if (settings.autoDeleteScreenshots) {
        try {
          fs.unlinkSync(filePath);
        } catch {
        }
        updateScreenshot(id, { path: "" });
        console.log("[screenshot:auto] 截图已删除");
      }
      showNotification("✅ 已记录", `${result.category} · ${result.summary.slice(0, 20)}`);
    }
  } catch (e) {
    console.error("[screenshot:auto] 截图失败:", e);
  } finally {
    isCapturing = false;
  }
}
const PS_SCRIPT_PATH = path.join(app.getPath("userData"), "persistent-fg.ps1");
const PS_SCRIPT_CONTENT = `
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@ -ErrorAction SilentlyContinue

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line -eq "GET") {
        $result = ""
        try {
            $h = [Win32]::GetForegroundWindow()
            if ($h -ne 0) {
                $procId = 0
                [Win32]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
                if ($procId -ne 0) {
                    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($p) {
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($p.ProcessName)
                        $result = [Convert]::ToBase64String($bytes)
                    }
                }
            }
        } catch {}
        Write-Output "FG:$result"
    } elseif ($line -eq "EXIT") {
        break
    }
}
`;
function ensurePsScript() {
  fs.writeFileSync(PS_SCRIPT_PATH, PS_SCRIPT_CONTENT, "utf-8");
}
const APP_NAME_MAP = {
  "code": "VS Code",
  "code-insiders": "VS Code Insiders",
  "chrome": "Google Chrome",
  "msedge": "Microsoft Edge",
  "firefox": "Firefox",
  "explorer": "文件资源管理器",
  "WINWORD": "Word",
  "EXCEL": "Excel",
  "POWERPNT": "PowerPoint",
  "ONENOTE": "OneNote",
  "OUTLOOK": "Outlook",
  "WeChat": "微信",
  "QQ": "QQ",
  "DingTalk": "钉钉",
  "Feishu": "飞书",
  "Lark": "飞书",
  "Teams": "Microsoft Teams",
  "Slack": "Slack",
  "Discord": "Discord",
  "Telegram": "Telegram",
  "notepad": "记事本",
  "notepad++": "Notepad++",
  "idea": "IntelliJ IDEA",
  "idea64": "IntelliJ IDEA",
  "pycharm64": "PyCharm",
  "webstorm64": "WebStorm",
  "goland64": "GoLand",
  "rider64": "Rider",
  "clion64": "CLion",
  "devenv": "Visual Studio",
  "Cursor": "Cursor",
  "windsurf": "Windsurf",
  "figma": "Figma",
  "Notion": "Notion",
  "obsidian": "Obsidian",
  "typora": "Typora",
  "Terminal": "终端",
  "WindowsTerminal": "Windows Terminal",
  "powershell": "PowerShell",
  "cmd": "命令提示符",
  "git-bash": "Git Bash",
  "nautilus": "文件管理器",
  "Finder": "访达",
  "Safari": "Safari",
  "Preview": "预览",
  "Spotify": "Spotify",
  "vlc": "VLC",
  "potplayermini64": "PotPlayer",
  "Photoshop": "Photoshop",
  "Illustrator": "Illustrator",
  "AfterFX": "After Effects",
  "Premiere Pro": "Premiere Pro",
  "Snipaste": "Snipaste",
  "Teams_Work_": "Microsoft Teams",
  "FoxitPDFReader": "Foxit PDF Reader",
  "Acrobat": "Adobe Acrobat",
  "sumatrapdf": "SumatraPDF",
  "calibre": "Calibre",
  "wps": "WPS Office",
  "et": "WPS 表格",
  "wpp": "WPS 演示",
  "pdfxedit": "PDF-XChange Editor"
};
function toFriendlyName(processName) {
  return APP_NAME_MAP[processName] ?? processName;
}
let psProcess = null;
let stdoutBuffer = "";
let pendingResolve = null;
let pendingTimeout = null;
function clearPendingTimeout() {
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
}
function resolvePending(value) {
  clearPendingTimeout();
  if (pendingResolve) {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve(value);
  }
}
function startPsProcess() {
  var _a, _b, _c, _d;
  if (psProcess && !psProcess.killed && psProcess.stdin && psProcess.stdout) return;
  ensurePsScript();
  psProcess = spawn("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    PS_SCRIPT_PATH
  ], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });
  stdoutBuffer = "";
  (_a = psProcess.stdout) == null ? void 0 : _a.on("data", (data2) => {
    stdoutBuffer += data2.toString("utf-8");
    let idx;
    while ((idx = stdoutBuffer.indexOf("\n")) >= 0) {
      const line = stdoutBuffer.slice(0, idx).replace(/\r$/, "").trim();
      stdoutBuffer = stdoutBuffer.slice(idx + 1);
      if (line.startsWith("FG:") && pendingResolve) {
        const b64 = line.slice(3);
        try {
          if (b64) {
            const buf = Buffer.from(b64, "base64");
            resolvePending(buf.toString("utf-8"));
          } else {
            resolvePending("");
          }
        } catch {
          resolvePending("");
        }
      }
    }
  });
  (_b = psProcess.stderr) == null ? void 0 : _b.on("data", (data2) => {
    console.debug("[appTracker] PS stderr:", data2.toString("utf-8").trim());
  });
  (_c = psProcess.stdin) == null ? void 0 : _c.on("error", () => {
  });
  (_d = psProcess.stdout) == null ? void 0 : _d.on("error", () => {
  });
  psProcess.on("error", (err) => {
    console.error("[appTracker] PowerShell 进程错误:", err.message);
    psProcess = null;
    resolvePending("");
  });
  psProcess.on("exit", (code) => {
    console.log("[appTracker] PowerShell 进程退出, code=" + code);
    psProcess = null;
    resolvePending("");
  });
}
function queryForegroundApp() {
  return new Promise((resolve) => {
    if (!psProcess || psProcess.killed) {
      startPsProcess();
    }
    if (!psProcess || !psProcess.stdin || !psProcess.stdout) {
      resolve("");
      return;
    }
    pendingResolve = resolve;
    pendingTimeout = setTimeout(() => {
      if (pendingResolve === resolve) {
        console.warn("[appTracker] 查询超时, 重启 PowerShell 进程");
        pendingResolve = null;
        resolve("");
        if (psProcess) {
          try {
            psProcess.kill();
          } catch {
          }
          psProcess = null;
        }
      }
    }, 3e3);
    try {
      psProcess.stdin.write("GET\n");
    } catch {
      resolvePending("");
    }
  });
}
async function getActiveAppName() {
  try {
    if (process.platform === "win32") {
      const name = await queryForegroundApp();
      return toFriendlyName(name || "未知");
    }
    if (process.platform === "darwin") {
      return new Promise((resolve) => {
        const script = `tell application "System Events" to name of first application process whose frontmost is true`;
        execFile("osascript", ["-e", script], { encoding: "utf-8", timeout: 3e3 }, (err, stdout) => {
          if (err) {
            resolve("未知");
            return;
          }
          resolve(toFriendlyName(stdout.trim() || "未知"));
        });
      });
    }
    return "未知";
  } catch {
    return "未知";
  }
}
let tracker = null;
let lastAppName = null;
let lastSwitchTime = 0;
let tickCount = 0;
const POLL_INTERVAL = 5e3;
const FLUSH_INTERVAL = 12;
function flushCurrent() {
  if (!lastAppName || !lastSwitchTime) return;
  const now = Date.now();
  const durationSec = Math.round((now - lastSwitchTime) / 1e3);
  if (durationSec >= 1) {
    createAppUsageRecord({
      appName: lastAppName,
      startedAt: new Date(lastSwitchTime).toISOString(),
      endedAt: new Date(now).toISOString(),
      durationSec
    });
  }
  lastSwitchTime = now;
}
async function tick() {
  const now = Date.now();
  const appName = await getActiveAppName();
  tickCount++;
  if (lastAppName === null) {
    lastAppName = appName;
    lastSwitchTime = now;
    return;
  }
  if (appName !== lastAppName) {
    flushCurrent();
    lastAppName = appName;
    lastSwitchTime = now;
    tickCount = 0;
    return;
  }
  if (tickCount >= FLUSH_INTERVAL) {
    flushCurrent();
    tickCount = 0;
  }
}
function scheduleTick() {
  tracker = setTimeout(async () => {
    await tick();
    if (tracker) scheduleTick();
  }, POLL_INTERVAL);
}
function startAppTracker() {
  if (tracker) return;
  ensurePsScript();
  startPsProcess();
  lastAppName = null;
  lastSwitchTime = Date.now();
  tickCount = 0;
  scheduleTick();
  console.log("[appTracker] 活动窗口追踪已启动 (持久化 PowerShell 模式)");
}
function stopAppTracker() {
  if (!tracker) return;
  clearTimeout(tracker);
  tracker = null;
  if (lastAppName && lastSwitchTime) {
    const now = Date.now();
    const durationSec = Math.round((now - lastSwitchTime) / 1e3);
    if (durationSec >= 1) {
      createAppUsageRecord({
        appName: lastAppName,
        startedAt: new Date(lastSwitchTime).toISOString(),
        endedAt: new Date(now).toISOString(),
        durationSec
      });
    }
  }
  lastAppName = null;
  resolvePending("");
  if (psProcess) {
    try {
      psProcess.kill();
    } catch {
    }
    psProcess = null;
  }
  console.log("[appTracker] 活动窗口追踪已停止");
}
let server = null;
function cryptoRandom$1() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function todayISO() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayISO() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function checkAuth(req, token) {
  if (!token) return true;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7).trim() === token;
  }
  return false;
}
function getApiDocMarkdown(port, token) {
  const authLine = token ? `Authorization: Bearer ${token}` : "（未设置 token，免认证）";
  return `# 牙牙乐日报助手 - 本地 API 文档

服务地址：http://127.0.0.1:${port}
认证方式：${authLine}

## 端点列表

### GET /
返回本 API 文档（Markdown）。

### GET /api/work-records
查询工作记录。
- 查询参数：\`date\`（YYYY-MM-DD）、\`startDate\`、\`endDate\`、\`limit\`、\`offset\`

### GET /api/reports
查询历史报告。
- 查询参数：\`limit\`、\`offset\`

### GET /api/app-usage
查询应用使用统计。
- 查询参数：\`startDate\`、\`endDate\`

### GET /api/heatmap
查询热力图数据（日期 × 小时 × 记录数）。
- 查询参数：\`startDate\`、\`endDate\`

### GET /api/timeline
查询时间线工作记录。
- 查询参数：\`startDate\`、\`endDate\`

### GET /api/plans
查询今日计划。
- 查询参数：\`date\`（YYYY-MM-DD）

### POST /api/work-records
创建工作记录。
- Body：\`{ startedAt, summary, category?, endedAt? }\`

### POST /api/reports/generate
生成报告（流式）。
- Body：\`{ type, startDate, endDate, templateBody?, customInstruction? }\`

## 强制规则（给接入 Agent）
1. 每次处理用户请求前，必须先调用 GET / 获取最新 API 文档
2. 读取文档后，解析接口列表，动态选择接口并构造请求
3. 所有请求需携带 Header: Authorization: Bearer ${token || "<token>"}
`;
}
function sendJson(res, status, data2) {
  const body = JSON.stringify(data2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}
function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(text)
  });
  res.end(text);
}
async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
function startApiServer(port) {
  return new Promise((resolve) => {
    if (server) {
      resolve({ ok: false, error: "服务已在运行" });
      return;
    }
    const s = http.createServer(async (req, res) => {
      try {
        const settings = getSettings();
        if (!checkAuth(req, settings.localApiToken)) {
          sendJson(res, 401, { error: "未授权" });
          return;
        }
        const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
        const path2 = url.pathname;
        const method = req.method || "GET";
        if (path2 === "/" && method === "GET") {
          sendText(res, 200, getApiDocMarkdown(port, settings.localApiToken), "text/markdown; charset=utf-8");
          return;
        }
        if (path2 === "/api/work-records" && method === "GET") {
          const date = url.searchParams.get("date") || void 0;
          const startDate = url.searchParams.get("startDate") || void 0;
          const endDate = url.searchParams.get("endDate") || void 0;
          const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : void 0;
          const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : void 0;
          sendJson(res, 200, listWorkRecords({ date, startDate, endDate, limit, offset }));
          return;
        }
        if (path2 === "/api/work-records" && method === "POST") {
          const body = JSON.parse(await readBody(req));
          const rec = createWorkRecord({
            startedAt: body.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
            summary: body.summary,
            category: body.category,
            endedAt: body.endedAt
          });
          sendJson(res, 201, rec);
          return;
        }
        if (path2 === "/api/reports" && method === "GET") {
          const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50;
          const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0;
          sendJson(res, 200, listReports({ limit, offset }));
          return;
        }
        if (path2 === "/api/app-usage" && method === "GET") {
          const startDate = url.searchParams.get("startDate") || todayISO();
          const endDate = url.searchParams.get("endDate") || endOfTodayISO();
          sendJson(res, 200, appUsage({ startDate, endDate }));
          return;
        }
        if (path2 === "/api/heatmap" && method === "GET") {
          const startDate = url.searchParams.get("startDate") || void 0;
          const endDate = url.searchParams.get("endDate") || void 0;
          sendJson(res, 200, heatmap({ startDate, endDate }));
          return;
        }
        if (path2 === "/api/timeline" && method === "GET") {
          const startDate = url.searchParams.get("startDate") || void 0;
          const endDate = url.searchParams.get("endDate") || void 0;
          sendJson(res, 200, timeline({ startDate, endDate }));
          return;
        }
        if (path2 === "/api/plans" && method === "GET") {
          const today = /* @__PURE__ */ new Date();
          const date = url.searchParams.get("date") || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          sendJson(res, 200, listPlans({ date }));
          return;
        }
        if (path2 === "/api/reports/generate" && method === "POST") {
          const body = JSON.parse(await readBody(req));
          const records = listWorkRecords({ startDate: body.startDate, endDate: body.endDate, limit: 500 });
          if (records.length === 0) {
            sendJson(res, 400, { error: "所选日期范围内没有工作记录" });
            return;
          }
          const input = {
            type: body.type || "daily",
            startDate: body.startDate,
            endDate: body.endDate,
            templateBody: body.templateBody,
            customInstruction: body.customInstruction,
            records: records.map((r) => ({ startedAt: r.startedAt, summary: r.summary, category: r.category ?? void 0 }))
          };
          let fullContent = "";
          await new Promise((resolveGen, rejectGen) => {
            generateReport(
              input,
              (chunk) => {
                fullContent += chunk;
              },
              () => resolveGen(),
              (err) => rejectGen(err)
            );
          });
          sendJson(res, 200, { content: fullContent });
          return;
        }
        sendJson(res, 404, { error: `未找到端点：${method} ${path2}` });
      } catch (e) {
        sendJson(res, 500, { error: (e == null ? void 0 : e.message) ?? "服务器错误" });
      }
    });
    s.on("error", (err) => {
      server = null;
      if (err.code === "EADDRINUSE") {
        resolve({ ok: false, error: `端口 ${port} 已被占用` });
      } else {
        resolve({ ok: false, error: err.message });
      }
    });
    s.listen(port, "127.0.0.1", () => {
      server = s;
      resolve({ ok: true, port });
    });
  });
}
function stopApiServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve({ ok: true });
      return;
    }
    server.close(() => {
      server = null;
      resolve({ ok: true });
    });
  });
}
function isApiServerRunning() {
  return server !== null;
}
function regenerateApiToken() {
  return cryptoRandom$1().replace(/-/g, "") + cryptoRandom$1().replace(/-/g, "");
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
app.setName("牙牙乐日报助手");
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let mainWindow = null;
let tray = null;
function cryptoRandom() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "牙牙乐日报助手",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  Menu.setApplicationMenu(null);
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.on("close", (e) => {
    if (app.isQuitting) return;
    e.preventDefault();
    mainWindow == null ? void 0 : mainWindow.hide();
  });
  mainWindow.once("ready-to-show", () => mainWindow == null ? void 0 : mainWindow.show());
}
function createTray() {
  const iconPath = path.join(__dirname$1, "../dist/icon.png");
  let trayIcon;
  if (fs.existsSync(iconPath)) trayIcon = nativeImage.createFromPath(iconPath);
  else trayIcon = nativeImage.createEmpty();
  tray = new Tray(trayIcon);
  tray.setToolTip("牙牙乐日报助手");
  const menu = Menu.buildFromTemplate([
    { label: "打开主窗口", click: () => {
      mainWindow == null ? void 0 : mainWindow.show();
      mainWindow == null ? void 0 : mainWindow.focus();
    } },
    { label: "退出", click: () => {
      app.isQuitting = true;
      app.quit();
    } }
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    mainWindow == null ? void 0 : mainWindow.show();
    mainWindow == null ? void 0 : mainWindow.focus();
  });
}
let scheduledReportTimer = null;
let lastAutoReportDate = null;
function startScheduledReport() {
  if (scheduledReportTimer) return;
  scheduledReportTimer = setInterval(checkScheduledReport, 6e4);
  console.log("[scheduled] 定时日报已启动, 时间:", getSettings().scheduledReportTime);
}
function stopScheduledReport() {
  if (scheduledReportTimer) {
    clearInterval(scheduledReportTimer);
    scheduledReportTimer = null;
  }
}
function checkScheduledReport() {
  const settings = getSettings();
  if (!settings.scheduledReportEnabled || !settings.apiKey) return;
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (currentTime !== settings.scheduledReportTime) return;
  if (lastAutoReportDate === todayStr) return;
  lastAutoReportDate = todayStr;
  autoGenerateDailyReport();
}
async function autoGenerateDailyReport() {
  const settings = getSettings();
  if (!settings.apiKey) return;
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const records = listWorkRecords({ startDate: todayStr, endDate: todayStr });
  if (records.length === 0) {
    console.log("[scheduled] 今日无工作记录, 跳过自动生成");
    return;
  }
  console.log(`[scheduled] 开始自动生成日报, ${records.length} 条工作记录`);
  const reportId = cryptoRandom();
  createReport({
    id: reportId,
    title: "生成中...",
    type: "daily",
    startDate: todayStr,
    endDate: todayStr,
    model: settings.model
  });
  const input = {
    type: "daily",
    startDate: todayStr,
    endDate: todayStr,
    records: records.map((r) => ({ startedAt: r.startedAt, summary: r.summary, category: r.category ?? void 0 })),
    customInstruction: settings.customInstruction,
    memoryContent: settings.memoryContent
  };
  generateReport(
    input,
    (chunk) => emit("report:stream-chunk", { id: reportId, chunk }),
    (full) => {
      const titleMatch = full.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `日报 ${todayStr}`;
      updateReport(reportId, { content: full, title, status: "completed" });
      emit("report:status-changed", { id: reportId, status: "completed", title, content: full });
      console.log("[scheduled] 日报自动生成完成:", title);
    },
    (err) => {
      updateReport(reportId, { status: "failed", content: err.message });
      emit("report:status-changed", { id: reportId, status: "failed", error: err.message });
      console.error("[scheduled] 日报自动生成失败:", err.message);
    }
  );
}
function registerGlobalShortcut() {
  const settings = getSettings();
  const shortcut = settings.globalShortcut || "Ctrl+Shift+J";
  globalShortcut.unregisterAll();
  const ok = globalShortcut.register(shortcut, async () => {
    var _a;
    console.log("[shortcut] 触发快速记录:", shortcut);
    const result = await captureNow();
    if (result.ok) {
      console.log("[shortcut] 记录成功:", result.category, (_a = result.summary) == null ? void 0 : _a.slice(0, 50));
    } else {
      console.error("[shortcut] 记录失败:", result.error);
    }
  });
  if (!ok) {
    console.warn("[shortcut] 快捷键注册失败，可能被其他应用占用:", shortcut);
  } else {
    console.log("[shortcut] 全局快捷键已注册:", shortcut);
  }
}
app.whenReady().then(async () => {
  getDb();
  createWindow();
  createTray();
  startScreenshot();
  startAppTracker();
  startScheduledReport();
  registerGlobalShortcut();
  const settings = getSettings();
  if (settings.localApiEnabled) {
    const r = await startApiServer(settings.localApiPort);
    if (r.ok) console.log("[api-server] 本地 API 服务已启动, 端口:", r.port);
    else console.warn("[api-server] 启动失败:", r.error);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow == null ? void 0 : mainWindow.show();
  });
});
app.on("before-quit", async () => {
  globalShortcut.unregisterAll();
  stopScreenshot();
  stopAppTracker();
  stopScheduledReport();
  await stopApiServer();
  closeDb();
});
function emit(channel, ...args) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}
ipcMain.on("window-minimize", () => mainWindow == null ? void 0 : mainWindow.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow == null ? void 0 : mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow == null ? void 0 : mainWindow.maximize();
});
ipcMain.on("window-close", () => mainWindow == null ? void 0 : mainWindow.close());
ipcMain.handle("settings:get", () => getSettings());
ipcMain.handle("settings:update", (_e, patch) => {
  const result = updateSettings(patch);
  if (patch.globalShortcut !== void 0) {
    registerGlobalShortcut();
  }
  return result;
});
ipcMain.handle("ai:test-connection", () => testConnection());
ipcMain.handle("ai:generate-report", async (_e, input) => {
  const reportId = cryptoRandom();
  createReport({
    id: reportId,
    title: "生成中...",
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    model: getSettings().model
  });
  generateReport(
    input,
    (chunk) => emit("report:stream-chunk", { id: reportId, chunk }),
    (full) => {
      const titleMatch = full.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `${input.type === "daily" ? "日报" : input.type === "weekly" ? "周报" : "月报"} ${input.startDate}`;
      updateReport(reportId, { content: full, title, status: "completed" });
      emit("report:status-changed", { id: reportId, status: "completed", title, content: full });
    },
    (err) => {
      updateReport(reportId, { status: "failed", content: err.message });
      emit("report:status-changed", { id: reportId, status: "failed", error: err.message });
    }
  );
  return { id: reportId };
});
ipcMain.handle("ai:generate-template", async (_e, input) => {
  generateTemplate(
    input.reference,
    input.requirements,
    input.type,
    (chunk) => emit("ai:template-stream-chunk", { chunk }),
    (full) => emit("ai:template-status-changed", { status: "completed", content: full }),
    (err) => emit("ai:template-status-changed", { status: "failed", error: err.message })
  );
  return { started: true };
});
ipcMain.handle("work-records:list", (_e, input) => {
  return listWorkRecords(input);
});
ipcMain.handle("work-records:create", (_e, input) => {
  return createWorkRecord(input);
});
ipcMain.handle("work-records:update", (_e, input) => {
  return updateWorkRecord(input);
});
ipcMain.handle("work-records:delete", (_e, input) => {
  deleteWorkRecord(input.id);
  return { ok: true };
});
ipcMain.handle("work-records:daily-summary", (_e, input) => {
  return dailySummary(input.date);
});
ipcMain.handle("timeline:list", (_e, input) => timeline(input));
ipcMain.handle("heatmap:list", (_e, input) => heatmap(input));
ipcMain.handle("app-usage:list", (_e, input) => appUsage(input));
ipcMain.handle("system:displays", () => {
  return screen.getAllDisplays().map((d, i) => ({
    id: i + 1,
    label: d.label || `显示器 ${i + 1}`,
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    scaleFactor: d.scaleFactor,
    isPrimary: screen.getPrimaryDisplay().id === d.id
  }));
});
ipcMain.handle("reports:list", (_e, input) => listReports(input));
ipcMain.handle("reports:delete", (_e, input) => {
  deleteReport(input.id);
  return { ok: true };
});
ipcMain.handle("reports:update-title", (_e, input) => {
  updateReport(input.id, { title: input.title });
  return { ok: true };
});
ipcMain.handle("reports:update-content", (_e, input) => {
  updateReport(input.id, { content: input.content });
  return { ok: true };
});
ipcMain.handle("report:export-to-file", async (_e, input) => {
  const reports = listReports({ limit: 1e3 });
  const report = reports.find((r) => r.id === input.id);
  if (!report) throw new Error("报告不存在");
  const ext = input.format === "md" ? "md" : "txt";
  const res = await dialog.showSaveDialog({
    title: "导出报告",
    defaultPath: `${report.title}.${ext}`,
    filters: [{ name: input.format === "md" ? "Markdown" : "文本", extensions: [ext] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, message: "已取消" };
  fs.writeFileSync(res.filePath, report.content, "utf-8");
  return { ok: true, path: res.filePath };
});
ipcMain.handle("report-templates:list", (_e, input) => listTemplates(input == null ? void 0 : input.type));
ipcMain.handle("report-templates:create", (_e, input) => createTemplate(input));
ipcMain.handle("report-templates:update", (_e, input) => updateTemplate(input));
ipcMain.handle("report-templates:delete", (_e, input) => {
  deleteTemplate(input.id);
  return { ok: true };
});
ipcMain.handle("screenshots:status", () => ({ running: isScreenshotRunning() }));
ipcMain.handle("screenshots:capture-now", async () => captureNow());
ipcMain.handle("read-local-image", async (_e, filePath) => {
  try {
    const fs2 = await import("node:fs");
    if (!fs2.existsSync(filePath)) return { ok: false, error: "文件不存在" };
    const buffer = fs2.readFileSync(filePath);
    const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return { ok: true, dataUrl: `data:image/${ext};base64,${buffer.toString("base64")}` };
  } catch (e) {
    return { ok: false, error: (e == null ? void 0 : e.message) ?? "读取失败" };
  }
});
ipcMain.handle("screenshots:start", () => ({ ok: startScreenshot() }));
ipcMain.handle("screenshots:stop", () => {
  stopScreenshot();
  return { ok: true };
});
ipcMain.handle("screenshots:list", (_e, input) => listScreenshots(input));
ipcMain.handle("data-management:export", async () => {
  const res = await dialog.showSaveDialog({
    title: "导出数据备份",
    defaultPath: `daily-assistant-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON 备份", extensions: ["json"] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, message: "已取消" };
  fs.writeFileSync(res.filePath, JSON.stringify(exportAll(), null, 2), "utf-8");
  return { ok: true, path: res.filePath };
});
ipcMain.handle("data-management:import", async () => {
  const res = await dialog.showOpenDialog({
    title: "导入数据备份",
    filters: [{ name: "JSON 备份", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (res.canceled || res.filePaths.length === 0) return { ok: false, message: "已取消" };
  const raw = fs.readFileSync(res.filePaths[0], "utf-8");
  const data2 = JSON.parse(raw);
  if (!data2.version) throw new Error("无效的备份文件");
  importAll(data2);
  return { ok: true, message: "导入成功" };
});
ipcMain.handle("data-management:clear", () => {
  clearAll();
  return { ok: true };
});
ipcMain.handle("file:read-as-base64", (_e, filePath) => {
  if (!fs.existsSync(filePath)) throw new Error("文件不存在");
  return fs.readFileSync(filePath).toString("base64");
});
ipcMain.handle("app:open-external", (_e, url) => {
  shell.openExternal(url);
  return { ok: true };
});
ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("plans:list", (_e, input) => listPlans(input));
ipcMain.handle("plans:create", (_e, input) => createPlan(input));
ipcMain.handle("plans:update", (_e, input) => updatePlan(input));
ipcMain.handle("plans:delete", (_e, input) => {
  deletePlan(input.id);
  return { ok: true };
});
ipcMain.handle("ai:insight", async (_e, input) => {
  return new Promise((resolve, reject) => {
    generateInsight(
      input.type,
      input.data,
      (chunk) => emit("ai:insight-stream-chunk", { type: input.type, chunk }),
      (full) => {
        emit("ai:insight-status-changed", { type: input.type, status: "completed", content: full });
        resolve({ ok: true });
      },
      (err) => {
        emit("ai:insight-status-changed", { type: input.type, status: "failed", error: err.message });
        reject(err);
      }
    );
  });
});
ipcMain.handle("ai:chat", async (_e, input) => {
  return new Promise((resolve, reject) => {
    chat(
      input.messages,
      (chunk) => emit("ai:chat-stream-chunk", { sessionId: input.sessionId, chunk }),
      (full) => {
        emit("ai:chat-status-changed", { sessionId: input.sessionId, status: "completed", content: full });
        resolve({ ok: true });
      },
      (err) => {
        emit("ai:chat-status-changed", { sessionId: input.sessionId, status: "failed", error: err.message });
        reject(err);
      }
    );
  });
});
ipcMain.handle("localApi:getStatus", () => {
  const s = getSettings();
  return { running: isApiServerRunning(), port: s.localApiPort, token: s.localApiToken };
});
ipcMain.handle("localApi:start", async (_e, input) => {
  const settings = getSettings();
  const port = (input == null ? void 0 : input.port) ?? settings.localApiPort;
  if (port !== settings.localApiPort) {
    updateSettings({ localApiPort: port, localApiEnabled: true });
  } else {
    updateSettings({ localApiEnabled: true });
  }
  const r = await startApiServer(port);
  return r;
});
ipcMain.handle("localApi:stop", async () => {
  updateSettings({ localApiEnabled: false });
  return await stopApiServer();
});
ipcMain.handle("localApi:regenerateToken", () => {
  const token = regenerateApiToken();
  updateSettings({ localApiToken: token });
  return { ok: true, token };
});
