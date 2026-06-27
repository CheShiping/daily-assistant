"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron5 = require("electron");
var import_node_path4 = __toESM(require("node:path"), 1);
var import_node_fs4 = __toESM(require("node:fs"), 1);

// electron/db.ts
var import_electron = require("electron");
var import_node_path = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var DEFAULTS = {
  version: 1,
  workRecords: [],
  reports: [],
  templates: [],
  screenshots: [],
  appUsageRecords: [],
  planItems: [],
  settings: {}
};
var dbPath = "";
var data = null;
var saveTimer = null;
function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getDb() {
  if (data) return data;
  const userData = import_electron.app.getPath("userData");
  if (!import_node_fs.default.existsSync(userData)) import_node_fs.default.mkdirSync(userData, { recursive: true });
  dbPath = import_node_path.default.join(userData, "daily-assistant.json");
  let d;
  if (import_node_fs.default.existsSync(dbPath)) {
    try {
      d = { ...DEFAULTS, ...JSON.parse(import_node_fs.default.readFileSync(dbPath, "utf-8")) };
    } catch {
      d = { ...DEFAULTS };
    }
  } else {
    d = { ...DEFAULTS };
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
      // ===== 日报 =====
      {
        id: "tpl-daily-standard",
        name: "\u6807\u51C6\u65E5\u62A5",
        type: "daily",
        content: `# {{\u65E5\u671F}} \u5DE5\u4F5C\u65E5\u62A5

## \u{1F4CC} \u4ECA\u65E5\u5B8C\u6210
{{\u4ECA\u65E5\u5B8C\u6210}}

## \u{1F4CA} \u5173\u952E\u6570\u636E
{{\u5173\u952E\u6570\u636E}}

## \u26A0\uFE0F \u9047\u5230\u7684\u95EE\u9898
{{\u9047\u5230\u7684\u95EE\u9898}}

## \u{1F3AF} \u660E\u65E5\u8BA1\u5212
{{\u660E\u65E5\u8BA1\u5212}}`,
        isBuiltin: true,
        clustering: "timeline",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-scrum",
        name: "\u654F\u6377\u51B2\u523A\u65E5\u62A5",
        type: "daily",
        content: `# {{\u65E5\u671F}} \xB7 Sprint \u51B2\u523A\u65E5\u62A5

## \u2705 \u6628\u65E5\u5B8C\u6210
- [ ] {{\u6628\u65E5\u4EFB\u52A1 1}}
- [ ] {{\u6628\u65E5\u4EFB\u52A1 2}}
- [ ] {{\u6628\u65E5\u4EFB\u52A1 3}}

## \u{1F504} \u4ECA\u65E5\u8BA1\u5212
- [ ] {{\u4ECA\u65E5\u4EFB\u52A1 1}}
- [ ] {{\u4ECA\u65E5\u4EFB\u52A1 2}}
- [ ] {{\u4ECA\u65E5\u4EFB\u52A1 3}}

## \u{1F6A7} \u963B\u788D / \u98CE\u9669
{{\u963B\u788D\u63CF\u8FF0}}

## \u{1F4A1} \u9700\u8981\u534F\u52A9
{{\u534F\u52A9\u5185\u5BB9\uFF08\u65E0\u5219\u586B"\u65E0"\uFF09}}`,
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-result",
        name: "\u6210\u679C\u578B\u65E5\u62A5",
        type: "daily",
        content: `# {{\u65E5\u671F}} \u5DE5\u4F5C\u65E5\u62A5\uFF08\u6210\u679C\u5BFC\u5411\uFF09

## \u{1F31F} \u6838\u5FC3\u6210\u679C
{{\u4ECA\u65E5\u5B8C\u6210}}

## \u{1F4C8} \u6570\u636E\u6307\u6807
| \u7EF4\u5EA6 | \u6570\u503C | \u53D8\u5316 |
|------|------|------|
| {{\u6307\u6807 1}} | {{\u6570\u503C}} | {{\u53D8\u5316}} |
| {{\u6307\u6807 2}} | {{\u6570\u503C}} | {{\u53D8\u5316}} |

## \u{1F4AD} \u601D\u8003\u4E0E\u6C89\u6DC0
{{\u5173\u952E\u6570\u636E}}

## \u{1F525} \u98CE\u9669\u4E0E\u673A\u4F1A
{{\u9047\u5230\u7684\u95EE\u9898}}

## \u{1F4C5} \u660E\u65E5\u805A\u7126
{{\u660E\u65E5\u8BA1\u5212}}`,
        isBuiltin: true,
        clustering: "project",
        createdAt: now,
        updatedAt: now
      },
      // ===== 周报 =====
      {
        id: "tpl-weekly-standard",
        name: "\u6807\u51C6\u5468\u62A5",
        type: "weekly",
        content: `# {{\u8D77\u59CB}} - {{\u7ED3\u675F}} \u5DE5\u4F5C\u5468\u62A5

## \u{1F4CB} \u672C\u5468\u6982\u89C8
{{\u672C\u5468\u6982\u89C8}}

## \u2705 \u672C\u5468\u5B8C\u6210
{{\u672C\u5468\u5B8C\u6210}}

## \u{1F3C6} \u5173\u952E\u6210\u679C
{{\u5173\u952E\u6210\u679C}}

## \u{1F4CA} \u6570\u636E\u5206\u6790
{{\u6570\u636E\u5206\u6790}}

## \u26A0\uFE0F \u95EE\u9898\u4E0E\u98CE\u9669
{{\u95EE\u9898\u4E0E\u98CE\u9669}}

## \u{1F3AF} \u4E0B\u5468\u8BA1\u5212
{{\u4E0B\u5468\u8BA1\u5212}}`,
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      // ===== 月报 =====
      {
        id: "tpl-monthly-okr",
        name: "OKR \u6708\u5EA6\u590D\u76D8",
        type: "monthly",
        content: `# {{\u6708\u4EFD}} OKR \u6708\u5EA6\u590D\u76D8

## \u{1F3AF} \u672C\u6708 OKR \u8FDB\u5C55

### O1 \xB7 {{\u76EE\u6807 1}}
- KR1: {{\u5173\u952E\u7ED3\u679C 1}} \u2014\u2014 \u8FDB\u5EA6 {{\u767E\u5206\u6BD4 1}}%
- KR2: {{\u5173\u952E\u7ED3\u679C 2}} \u2014\u2014 \u8FDB\u5EA6 {{\u767E\u5206\u6BD4 2}}%

### O2 \xB7 {{\u76EE\u6807 2}}
- KR1: {{\u5173\u952E\u7ED3\u679C 3}} \u2014\u2014 \u8FDB\u5EA6 {{\u767E\u5206\u6BD4 3}}%

## \u{1F3C6} \u5173\u952E\u6210\u679C
{{\u672C\u6708\u5B8C\u6210}}

## \u{1F4CA} \u5173\u952E\u6570\u636E
{{\u5173\u952E\u6570\u636E}}

## \u{1F50D} \u590D\u76D8\u4E0E\u6539\u8FDB
### \u505A\u5F97\u597D
{{\u505A\u5F97\u597D\u7684\u65B9\u9762}}

### \u5F85\u6539\u8FDB
{{\u5F85\u6539\u8FDB\u7684\u65B9\u9762}}

## \u{1F3AF} \u4E0B\u6708\u8BA1\u5212
{{\u4E0B\u6708\u8BA1\u5212}}`,
        isBuiltin: true,
        clustering: "project",
        createdAt: now,
        updatedAt: now
      }
    ];
    const sampleCustom = {
      id: "tpl-custom-sample",
      name: "\u6211\u7684\u81EA\u5B9A\u4E49\u6A21\u677F\uFF08\u793A\u4F8B\uFF09",
      type: "daily",
      content: `# {{\u65E5\u671F}} \xB7 {{\u6C47\u62A5\u5BF9\u8C61}}\u65E5\u62A5

## \u4E00\u3001\u6838\u5FC3\u8FDB\u5C55
{{\u4ECA\u65E5\u5B8C\u6210}}

## \u4E8C\u3001\u5173\u952E\u4EA7\u51FA
{{\u5173\u952E\u6570\u636E}}

## \u4E09\u3001\u98CE\u9669\u4E0E\u4F9D\u8D56
{{\u9047\u5230\u7684\u95EE\u9898}}

## \u56DB\u3001\u660E\u65E5\u8BA1\u5212
{{\u660E\u65E5\u8BA1\u5212}}

> \u81EA\u5B9A\u4E49\u8BF4\u660E\uFF1A\u53EF\u7F16\u8F91\u5360\u4F4D\u7B26\u3001\u8C03\u6574\u7AE0\u8282\u987A\u5E8F\u3001\u4FDD\u5B58\u4E3A\u65B0\u6A21\u677F\u3002`,
      isBuiltin: false,
      clustering: "timeline",
      createdAt: now,
      updatedAt: now
    };
    for (const t of [...builtinTemplates, sampleCustom]) {
      if (!d.templates.find((x) => x.id === t.id)) d.templates.push(t);
    }
    save();
  } else {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const builtinToAdd = [
      {
        id: "tpl-daily-scrum",
        name: "\u654F\u6377\u51B2\u523A\u65E5\u62A5",
        type: "daily",
        content: `# {{\u65E5\u671F}} \xB7 Sprint \u51B2\u523A\u65E5\u62A5

## \u2705 \u6628\u65E5\u5B8C\u6210
- [ ] {{\u6628\u65E5\u4EFB\u52A1 1}}
- [ ] {{\u6628\u65E5\u4EFB\u52A1 2}}
- [ ] {{\u6628\u65E5\u4EFB\u52A1 3}}

## \u{1F504} \u4ECA\u65E5\u8BA1\u5212
- [ ] {{\u4ECA\u65E5\u4EFB\u52A1 1}}
- [ ] {{\u4ECA\u65E5\u4EFB\u52A1 2}}
- [ ] {{\u4ECA\u65E5\u4EFB\u52A1 3}}

## \u{1F6A7} \u963B\u788D / \u98CE\u9669
{{\u963B\u788D\u63CF\u8FF0}}

## \u{1F4A1} \u9700\u8981\u534F\u52A9
{{\u534F\u52A9\u5185\u5BB9\uFF08\u65E0\u5219\u586B"\u65E0"\uFF09}}`,
        isBuiltin: true,
        clustering: "category",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-daily-result",
        name: "\u6210\u679C\u578B\u65E5\u62A5",
        type: "daily",
        content: `# {{\u65E5\u671F}} \u5DE5\u4F5C\u65E5\u62A5\uFF08\u6210\u679C\u5BFC\u5411\uFF09

## \u{1F31F} \u6838\u5FC3\u6210\u679C
{{\u4ECA\u65E5\u5B8C\u6210}}

## \u{1F4C8} \u6570\u636E\u6307\u6807
| \u7EF4\u5EA6 | \u6570\u503C | \u53D8\u5316 |
|------|------|------|
| {{\u6307\u6807 1}} | {{\u6570\u503C}} | {{\u53D8\u5316}} |
| {{\u6307\u6807 2}} | {{\u6570\u503C}} | {{\u53D8\u5316}} |

## \u{1F4AD} \u601D\u8003\u4E0E\u6C89\u6DC0
{{\u5173\u952E\u6570\u636E}}

## \u{1F525} \u98CE\u9669\u4E0E\u673A\u4F1A
{{\u9047\u5230\u7684\u95EE\u9898}}

## \u{1F4C5} \u660E\u65E5\u805A\u7126
{{\u660E\u65E5\u8BA1\u5212}}`,
        isBuiltin: true,
        clustering: "project",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tpl-monthly-okr",
        name: "OKR \u6708\u5EA6\u590D\u76D8",
        type: "monthly",
        content: `# {{\u6708\u4EFD}} OKR \u6708\u5EA6\u590D\u76D8

## \u{1F3AF} \u672C\u6708 OKR \u8FDB\u5C55

### O1 \xB7 {{\u76EE\u6807 1}}
- KR1: {{\u5173\u952E\u7ED3\u679C 1}} \u2014\u2014 \u8FDB\u5EA6 {{\u767E\u5206\u6BD4 1}}%
- KR2: {{\u5173\u952E\u7ED3\u679C 2}} \u2014\u2014 \u8FDB\u5EA6 {{\u767E\u5206\u6BD4 2}}%

### O2 \xB7 {{\u76EE\u6807 2}}
- KR1: {{\u5173\u952E\u7ED3\u679C 3}} \u2014\u2014 \u8FDB\u5EA6 {{\u767E\u5206\u6BD4 3}}%

## \u{1F3C6} \u5173\u952E\u6210\u679C
{{\u672C\u6708\u5B8C\u6210}}

## \u{1F4CA} \u5173\u952E\u6570\u636E
{{\u5173\u952E\u6570\u636E}}

## \u{1F50D} \u590D\u76D8\u4E0E\u6539\u8FDB
### \u505A\u5F97\u597D
{{\u505A\u5F97\u597D\u7684\u65B9\u9762}}

### \u5F85\u6539\u8FDB
{{\u5F85\u6539\u8FDB\u7684\u65B9\u9762}}

## \u{1F3AF} \u4E0B\u6708\u8BA1\u5212
{{\u4E0B\u6708\u8BA1\u5212}}`,
        isBuiltin: true,
        clustering: "project",
        createdAt: now,
        updatedAt: now
      }
    ];
    const sampleCustom = {
      id: "tpl-custom-sample",
      name: "\u6211\u7684\u81EA\u5B9A\u4E49\u6A21\u677F\uFF08\u793A\u4F8B\uFF09",
      type: "daily",
      content: `# {{\u65E5\u671F}} \xB7 {{\u6C47\u62A5\u5BF9\u8C61}}\u65E5\u62A5

## \u4E00\u3001\u6838\u5FC3\u8FDB\u5C55
{{\u4ECA\u65E5\u5B8C\u6210}}

## \u4E8C\u3001\u5173\u952E\u4EA7\u51FA
{{\u5173\u952E\u6570\u636E}}

## \u4E09\u3001\u98CE\u9669\u4E0E\u4F9D\u8D56
{{\u9047\u5230\u7684\u95EE\u9898}}

## \u56DB\u3001\u660E\u65E5\u8BA1\u5212
{{\u660E\u65E5\u8BA1\u5212}}

> \u81EA\u5B9A\u4E49\u8BF4\u660E\uFF1A\u53EF\u7F16\u8F91\u5360\u4F4D\u7B26\u3001\u8C03\u6574\u7AE0\u8282\u987A\u5E8F\u3001\u4FDD\u5B58\u4E3A\u65B0\u6A21\u677F\u3002`,
      isBuiltin: false,
      clustering: "timeline",
      createdAt: now,
      updatedAt: now
    };
    let added = false;
    for (const t of [...builtinToAdd, sampleCustom]) {
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
    if (data) import_node_fs.default.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  }, 100);
}
function saveSync() {
  if (!data) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  import_node_fs.default.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
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
    id: cryptoRandom(),
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
  if (!r) throw new Error("\u8BB0\u5F55\u4E0D\u5B58\u5728");
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
    const c = r.category ?? "\u5176\u4ED6";
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
    id: cryptoRandom(),
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
  if (!t) throw new Error("\u6A21\u677F\u4E0D\u5B58\u5728");
  if (t.isBuiltin) throw new Error("\u5185\u7F6E\u6A21\u677F\u4E0D\u53EF\u4FEE\u6539");
  if (input.name !== void 0) t.name = input.name;
  if (input.content !== void 0) t.content = input.content;
  t.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  save();
  return t;
}
function deleteTemplate(id) {
  const db = getDb();
  const t = db.templates.find((x) => x.id === id);
  if (t?.isBuiltin) throw new Error("\u5185\u7F6E\u6A21\u677F\u4E0D\u53EF\u5220\u9664");
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
    id: cryptoRandom(),
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
    id: cryptoRandom(),
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
  if (!p) throw new Error("\u8BA1\u5212\u4E0D\u5B58\u5728");
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
function cryptoRandom() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// electron/settings.ts
var DEFAULTS2 = {
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
    ...DEFAULTS2,
    apiKey: map.apiKey ?? "",
    baseUrl: map.baseUrl ?? DEFAULTS2.baseUrl,
    model: map.model ?? DEFAULTS2.model,
    visionModel: map.visionModel ?? DEFAULTS2.visionModel,
    screenshotIntervalSec: Number(map.screenshotIntervalSec ?? DEFAULTS2.screenshotIntervalSec),
    visionEnabled: map.visionEnabled !== "false",
    excludedApps: map.excludedApps ? JSON.parse(map.excludedApps) : [],
    memoryContent: map.memoryContent ?? "",
    customInstruction: map.customInstruction ?? "",
    preservePath: map.preservePath ?? "",
    scheduledReportEnabled: map.scheduledReportEnabled !== "false",
    scheduledReportTime: map.scheduledReportTime ?? DEFAULTS2.scheduledReportTime,
    // Phase 1 新增
    autoDeleteScreenshots: map.autoDeleteScreenshots !== "false",
    sensitiveSceneSkip: map.sensitiveSceneSkip !== "false",
    privacyLevel: ["loose", "standard", "strict"].includes(map.privacyLevel) ? map.privacyLevel : "standard",
    globalShortcut: map.globalShortcut ?? DEFAULTS2.globalShortcut,
    showNotifications: map.showNotifications !== "false",
    subscription: map.subscription === "pro" ? "pro" : "free",
    subscriptionExpiry: map.subscriptionExpiry ?? null,
    inviteCode: map.inviteCode ?? "",
    localApiEnabled: map.localApiEnabled === "true",
    localApiPort: Number(map.localApiPort ?? DEFAULTS2.localApiPort),
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

// electron/ai.ts
var import_electron2 = require("electron");
var SYSTEM_PROMPTS = {
  report: "\u4F60\u662F\u4E00\u4F4D\u5DE5\u4F5C\u65E5\u62A5\u751F\u6210\u52A9\u624B\u3002\u8BF7\u4E25\u683C\u57FA\u4E8E\u7528\u6237\u63D0\u4F9B\u7684\u5DE5\u4F5C\u8BB0\u5F55\u751F\u6210\u62A5\u544A\uFF0C\u4E0D\u5F97\u7F16\u9020\u3001\u5938\u5927\u6216\u9057\u6F0F\u3002\u4FDD\u6301\u4E13\u4E1A\u3001\u7B80\u6D01\u3001\u5BA2\u89C2\u7684\u804C\u573A\u8868\u8FBE\u3002\u76F4\u63A5\u8F93\u51FA\u62A5\u544A\u6B63\u6587\uFF0C\u4E0D\u8981\u6DFB\u52A0\u989D\u5916\u89E3\u91CA\u3001\u603B\u7ED3\u6216\u5143\u8BC4\u8BBA\u3002",
  classify: "\u4F60\u662F\u4E00\u4E2A\u5DE5\u4F5C\u6D3B\u52A8\u5206\u7C7B\u52A9\u624B\u3002\u6839\u636E\u5DE5\u4F5C\u63CF\u8FF0\u5224\u65AD\u6240\u5C5E\u7C7B\u522B\uFF0C\u53EA\u8F93\u51FA\u7C7B\u522B\u540D\u79F0\uFF0C\u4E0D\u8981\u8F93\u51FA\u5176\u4ED6\u5185\u5BB9\u3002",
  template: "\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u804C\u573A\u62A5\u544A\u5199\u4F5C\u4E13\u5BB6\u3002\u8BF7\u57FA\u4E8E\u7528\u6237\u63D0\u4F9B\u7684\u53C2\u8003\u62A5\u544A\u548C\u81EA\u5B9A\u4E49\u9700\u6C42\uFF0C\u751F\u6210\u4E00\u4E2A\u9AD8\u8D28\u91CF\u3001\u53EF\u590D\u7528\u7684\u62A5\u544A\u6A21\u677F\u3002\n\n\u4E25\u683C\u4F7F\u7528 Markdown \u683C\u5F0F\uFF0C\u7B2C\u4E00\u884C\u5FC5\u987B\u662F `# \u6A21\u677F\u6807\u9898`\uFF0C\u6B63\u6587\u4F7F\u7528 `{{\u5360\u4F4D\u7B26}}` \u683C\u5F0F\u8868\u793A\u53EF\u53D8\u5185\u5BB9\u3002\u53EA\u8F93\u51FA\u6700\u7EC8\u6A21\u677F\u5185\u5BB9\u3002",
  vision: `\u4F60\u662F\u4E00\u4E2A\u5DE5\u4F5C\u6D3B\u52A8\u8BC6\u522B\u52A9\u624B\u3002\u8BF7\u5206\u6790\u622A\u56FE\uFF0C\u63CF\u8FF0\u5F53\u524D\u5C4F\u5E55\u4E0A\u6B63\u5728\u8FDB\u884C\u7684\u6D3B\u52A8\uFF0C\u4E25\u683C\u6309\u7167\u4EE5\u4E0B JSON \u683C\u5F0F\u8FD4\u56DE\uFF1A

{
  "category": "\u5206\u7C7B\u540D",
  "summary": "\u8BE6\u7EC6\u63CF\u8FF0"
}

## \u6838\u5FC3\u539F\u5219\uFF1A
\u65E0\u8BBA\u622A\u56FE\u5185\u5BB9\u662F\u4EC0\u4E48\uFF0C\u90FD\u5FC5\u987B\u7ED9\u51FA\u63CF\u8FF0\u3002\u5373\u4F7F\u662F\u684C\u9762\u3001\u9501\u5C4F\u3001\u7A7A\u95F2\u72B6\u6001\uFF0C\u4E5F\u8981\u5982\u5B9E\u63CF\u8FF0\u3002\u7EDD\u5BF9\u4E0D\u8981\u8FD4\u56DE"\u672A\u8BC6\u522B\u5230\u5DE5\u4F5C\u5185\u5BB9"\u6216\u7A7A\u5185\u5BB9\u3002

## \u5206\u7C7B\u9009\u9879\uFF08\u5FC5\u987B\u4ECE\u4E2D\u9009\u62E9\uFF09\uFF1A
- \u5F00\u53D1\uFF1A\u7F16\u7A0B\u3001\u8C03\u8BD5\u3001\u4EE3\u7801\u5BA1\u67E5\u3001IDE \u4F7F\u7528
- \u4F1A\u8BAE\uFF1A\u89C6\u9891\u4F1A\u8BAE\u3001\u7EBF\u4E0A\u4F1A\u8BAE\u3001\u4F1A\u8BAE\u8F6F\u4EF6
- \u6C9F\u901A\uFF1A\u5373\u65F6\u901A\u8BAF\u3001\u90AE\u4EF6\u3001\u534F\u4F5C\u5DE5\u5177
- \u6587\u6863\uFF1A\u6587\u6863\u7F16\u8F91\u3001\u9605\u8BFB\u3001\u7B14\u8BB0
- \u6D4B\u8BD5\uFF1A\u6D4B\u8BD5\u6267\u884C\u3001Bug \u9A8C\u8BC1
- \u8BBE\u8BA1\uFF1AUI \u8BBE\u8BA1\u3001\u539F\u578B\u3001\u8BBE\u8BA1\u5DE5\u5177
- \u8FD0\u7EF4\uFF1A\u670D\u52A1\u5668\u7BA1\u7406\u3001\u90E8\u7F72\u3001\u76D1\u63A7
- \u6570\u636E\u5206\u6790\uFF1A\u6570\u636E\u67E5\u770B\u3001\u62A5\u8868\u3001BI \u5DE5\u5177
- \u5B66\u4E60\uFF1A\u5728\u7EBF\u8BFE\u7A0B\u3001\u6280\u672F\u6587\u6863\u9605\u8BFB\u3001\u5B66\u4E60\u5E73\u53F0
- \u7BA1\u7406\uFF1A\u9879\u76EE\u7BA1\u7406\u3001\u4EFB\u52A1\u7BA1\u7406\u5DE5\u5177
- \u4EA7\u54C1\uFF1A\u4EA7\u54C1\u89C4\u5212\u3001\u9700\u6C42\u5206\u6790
- \u751F\u6D3B\uFF1A\u4E2A\u4EBA\u4E8B\u52A1\u3001\u793E\u4EA4\u3001\u5A31\u4E50\u3001\u684C\u9762\u7A7A\u95F2\u3001\u4F11\u606F
- \u5176\u4ED6\uFF1A\u65E0\u6CD5\u5F52\u7C7B\u7684\u6D3B\u52A8

## summary \u8981\u6C42\uFF1A
1. \u7528\u4E2D\u6587\u63CF\u8FF0\uFF0C50-200 \u5B57
2. \u5305\u542B\uFF1A\u6D3B\u52A8\u4E3B\u9898\u3001\u5177\u4F53\u5185\u5BB9\u3001\u4F7F\u7528\u7684\u5DE5\u5177/\u6280\u672F\u3001\u5F53\u524D\u8FDB\u5C55
3. \u5982\u679C\u622A\u56FE\u4E2D\u540C\u65F6\u5B58\u5728\u591A\u4E2A\u6D3B\u52A8\uFF0C\u9009\u62E9\u6700\u4E3B\u8981\u7684\u5DE5\u4F5C\u6D3B\u52A8\u8FDB\u884C\u63CF\u8FF0\uFF0C\u4E0D\u8981\u5FFD\u7565\u6240\u6709\u5185\u5BB9
4. \u9690\u79C1\u8131\u654F\u89C4\u5219\uFF08\u5FC5\u987B\u4E25\u683C\u9075\u5B88\uFF09\uFF1A
   - \u5373\u65F6\u901A\u8BAF\u7C7B\uFF08QQ\u3001\u5FAE\u4FE1\u3001\u9489\u9489\u3001\u98DE\u4E66\u3001\u4F01\u4E1A\u5FAE\u4FE1\u3001Slack\u3001Telegram\u3001Discord\uFF09\uFF1Acategory \u8BBE\u4E3A"\u751F\u6D3B"\uFF0Csummary \u56FA\u5B9A\u5199"\u5F53\u524D\u5305\u542B\u79C1\u4EBA\u6C9F\u901A\u5185\u5BB9\uFF0C\u5177\u4F53\u5185\u5BB9\u5DF2\u8131\u654F\uFF0C\u4E0D\u7EB3\u5165\u65E5\u62A5\u3002"
   - \u793E\u4EA4\u5A92\u4F53\u7C7B\uFF08\u5FAE\u535A\u3001\u6296\u97F3\u3001\u5C0F\u7EA2\u4E66\u3001\u5FEB\u624B\u3001B\u7AD9\u3001Twitter\u3001Instagram\u3001Facebook\u3001\u77E5\u4E4E\uFF09\uFF1Acategory \u8BBE\u4E3A"\u751F\u6D3B"\uFF0Csummary \u56FA\u5B9A\u5199"\u6D4F\u89C8\u793E\u4EA4\u5A92\u4F53\uFF0C\u5177\u4F53\u5185\u5BB9\u5DF2\u8131\u654F\u3002"
   - \u90AE\u4EF6\uFF1A\u4E0D\u63CF\u8FF0\u90AE\u4EF6\u5177\u4F53\u5185\u5BB9\uFF0Csummary \u5199"\u5904\u7406\u90AE\u4EF6"
   - \u7EDD\u5BF9\u4E0D\u8981\u63CF\u8FF0\u804A\u5929\u5BF9\u8C61\u3001\u804A\u5929\u5185\u5BB9\u3001\u4E2A\u4EBA\u4FE1\u606F\u7B49\u4EFB\u4F55\u9690\u79C1\u7EC6\u8282
5. \u684C\u9762/\u7A7A\u95F2\u72B6\u6001\uFF1Acategory \u8BBE\u4E3A"\u751F\u6D3B"\uFF0Csummary \u5199"\u67E5\u770B\u684C\u9762\uFF0C\u5F53\u524D\u65E0\u660E\u786E\u5DE5\u4F5C\u6D3B\u52A8\u3002"
6. \u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u989D\u5916\u5185\u5BB9\uFF0C\u53EA\u8FD4\u56DE JSON`,
  test: "\u8BF7\u53EA\u56DE\u590D OK\uFF0C\u7528\u4E8E\u6D4B\u8BD5\u8FDE\u63A5\u3002"
};
var CATEGORIES = ["\u5F00\u53D1", "\u4F1A\u8BAE", "\u6587\u6863", "\u6D4B\u8BD5", "\u6C9F\u901A", "\u8BBE\u8BA1", "\u8FD0\u7EF4", "\u6570\u636E\u5206\u6790", "\u5B66\u4E60", "\u7BA1\u7406", "\u4EA7\u54C1", "\u751F\u6D3B", "\u5176\u4ED6"];
var CATEGORY_KEYWORDS = {
  "\u5F00\u53D1": ["\u4EE3\u7801", "\u7F16\u7A0B", "\u5F00\u53D1", "IDE", "vscode", "vs code", "git", "github", "gitlab", "\u8C03\u8BD5", "debug", "api", "\u51FD\u6570", "bug", "\u7F16\u8BD1", "\u7EC8\u7AEF", "terminal", "npm", "python", "java", "javascript", "typescript", "go", "rust", "react", "vue", "node", "docker", "k8s", "\u90E8\u7F72", "\u524D\u7AEF", "\u540E\u7AEF", "\u6846\u67B6", "\u91CD\u6784", "\u63D0\u4EA4", "commit", "merge", "\u5206\u652F", "branch", "\u6808", "\u5806\u6808", "\u62A5\u9519", "\u5F02\u5E38", "\u63A5\u53E3", "\u8054\u8C03"],
  "\u4F1A\u8BAE": ["\u4F1A\u8BAE", "\u5F00\u4F1A", "\u8BA8\u8BBA", "zoom", "\u817E\u8BAF\u4F1A\u8BAE", "\u9489\u9489", "\u98DE\u4E66", "\u89C6\u9891\u4F1A\u8BAE", "\u8BC4\u5BA1", "\u7AD9\u4F1A", "\u5468\u4F1A", "\u4F8B\u4F1A", "\u9700\u6C42\u8BC4\u5BA1", "\u6280\u672F\u8BC4\u5BA1", "\u5934\u8111\u98CE\u66B4", "brainstorm", "\u540C\u6B65", "\u5BF9\u9F50", "\u62C9\u9F50"],
  "\u6587\u6863": ["\u6587\u6863", "word", "excel", "ppt", "powerpoint", "\u5199\u6587\u6863", "\u7B14\u8BB0", "markdown", "notion", "\u8BED\u96C0", "confluence", "wiki", "\u6574\u7406\u6587\u6863", "\u6587\u6863\u7F16\u5199", "\u8BF4\u660E\u6587\u6863", "\u8BBE\u8BA1\u6587\u6863", "\u6280\u672F\u6587\u6863"],
  "\u6D4B\u8BD5": ["\u6D4B\u8BD5", "test", "qa", "\u9A8C\u6536", "\u56DE\u5F52", "\u6D4B\u8BD5\u7528\u4F8B", "\u81EA\u52A8\u5316\u6D4B\u8BD5", "\u5355\u5143\u6D4B\u8BD5", "\u96C6\u6210\u6D4B\u8BD5", "\u538B\u6D4B", "\u6027\u80FD\u6D4B\u8BD5", "jenkins", "ci/cd", "\u7F3A\u9677", "bug\u4FEE\u590D", "\u9A8C\u8BC1"],
  "\u6C9F\u901A": ["\u804A\u5929", "\u5FAE\u4FE1", "\u90AE\u4EF6", "email", "slack", "\u6C9F\u901A", "\u56DE\u590D", "\u6D88\u606F", "discord", "telegram", "\u4F01\u4E1A\u5FAE\u4FE1", "\u5373\u65F6\u901A\u8BAF", "\u4EA4\u6D41", "\u534F\u5546"],
  "\u8BBE\u8BA1": ["\u8BBE\u8BA1", "figma", "sketch", "ui", "ux", "\u539F\u578B", "\u8BBE\u8BA1\u7A3F", "\u5207\u56FE", "\u6807\u6CE8", "photoshop", "ps", "ai", "illustrator", "\u4EA4\u4E92\u8BBE\u8BA1", "\u89C6\u89C9\u8BBE\u8BA1", "\u7EC4\u4EF6\u5E93"],
  "\u8FD0\u7EF4": ["\u8FD0\u7EF4", "\u670D\u52A1\u5668", "server", "docker", "kubernetes", "k8s", "\u90E8\u7F72", "\u76D1\u63A7", "\u65E5\u5FD7", "log", "nginx", "linux", "shell", "\u811A\u672C", "\u5DE1\u68C0", "\u544A\u8B66", "\u6545\u969C", "\u6062\u590D", "\u6269\u5BB9"],
  "\u6570\u636E\u5206\u6790": ["\u6570\u636E", "\u5206\u6790", "\u62A5\u8868", "\u7EDF\u8BA1", "bi", "\u6570\u636E\u5E93", "sql", "mysql", "redis", "elasticsearch", "\u6570\u636E\u6E05\u6D17", "\u6570\u636E\u53EF\u89C6\u5316", "\u6307\u6807", "dashboard", "\u57CB\u70B9", "etl"],
  "\u5B66\u4E60": ["\u5B66\u4E60", "\u8BFE\u7A0B", "\u6559\u7A0B", "\u89C6\u9891", "\u9605\u8BFB", "\u770B\u4E66", "\u6587\u6863", "\u535A\u5BA2", "stackoverflow", "b\u7AD9", "coursera", "udemy", "\u6280\u672F\u6587\u7AE0", "\u7814\u7A76", "\u8C03\u7814"],
  "\u7BA1\u7406": ["\u7BA1\u7406", "\u8BA1\u5212", "\u6392\u671F", "\u4EFB\u52A1", "jira", "\u9879\u76EE\u7BA1\u7406", "teambition", "tapd", "\u770B\u677F", "\u654F\u6377", "scrum", "\u5206\u914D", "\u8DDF\u8FDB", "\u534F\u8C03", "\u6C47\u62A5", "\u5BA1\u6279"],
  "\u4EA7\u54C1": ["\u4EA7\u54C1", "\u9700\u6C42", "\u539F\u578B", "prd", "\u7528\u6237", "\u7ADE\u54C1", "axure", "\u4EA7\u54C1\u89C4\u5212", "\u8DEF\u7EBF\u56FE", "\u529F\u80FD", "\u7248\u672C", "\u8FED\u4EE3", "\u7528\u6237\u8C03\u7814", "\u53CD\u9988"],
  "\u751F\u6D3B": ["\u4F11\u606F", "\u5403\u996D", "\u6D4F\u89C8", "\u8D2D\u7269", "\u97F3\u4E50", "\u89C6\u9891", "\u65B0\u95FB", "\u793E\u4EA4\u5A92\u4F53", "\u5FAE\u535A", "\u6296\u97F3", "\u5C0F\u7EA2\u4E66", "\u5FEB\u624B", "b\u7AD9", "\u54D4\u54E9\u54D4\u54E9", "twitter", "instagram", "facebook", "\u77E5\u4E4E", "youtube", "netflix", "\u6E38\u620F", "\u95F2\u804A", "\u684C\u9762"]
};
function classifyByKeywords(summary) {
  const lower = summary.toLowerCase();
  let bestMatch = "\u5176\u4ED6";
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
function apiUrl(settings, path5) {
  const base = settings.baseUrl.replace(/\/$/, "");
  return `${base}${path5}`;
}
async function testConnection() {
  const settings = getSettings();
  if (!settings.apiKey) return { ok: false, message: "\u8BF7\u5148\u914D\u7F6E API Key" };
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
    const reply = data2.choices?.[0]?.message?.content ?? "";
    return { ok: true, message: `\u8FDE\u63A5\u6210\u529F\uFF0C\u6A21\u578B\u56DE\u590D\uFF1A${reply}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
async function analyzeScreenshot(imageBase64, memoryContent) {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("\u8BF7\u5148\u914D\u7F6E API Key");
  const systemContent = memoryContent ? `${SYSTEM_PROMPTS.vision}

\u4E2A\u4EBA\u5DE5\u4F5C\u8BB0\u5FC6\uFF1A
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
            { type: "text", text: "\u8BF7\u5206\u6790\u8FD9\u5F20\u622A\u56FE\u4E2D\u7684\u5DE5\u4F5C\u6D3B\u52A8\u3002" },
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
    throw new Error(`\u89C6\u89C9\u8BC6\u522B\u5931\u8D25: HTTP ${res.status} ${txt.slice(0, 500)}`);
  }
  const data2 = await res.json();
  console.log("[vision] \u5B8C\u6574\u8FD4\u56DE:", JSON.stringify(data2).slice(0, 800));
  const msg = data2.choices?.[0]?.message;
  const reply = (msg?.content ?? msg?.reasoning_content ?? "").trim();
  console.log("[vision] AI \u8FD4\u56DE\u5185\u5BB9:", reply.slice(0, 300));
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
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "\u5176\u4ED6";
    const summary = String(parsed.summary ?? "").trim() || "\u5F53\u524D\u5C4F\u5E55\u65E0\u660E\u786E\u5DE5\u4F5C\u6D3B\u52A8";
    return { category, summary };
  }
  if (reply) {
    const sumMatch = reply.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (sumMatch && sumMatch[1]) {
      const extracted = sumMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
      const catMatch = reply.match(/"category"\s*:\s*"([^"]*)"/);
      const category = catMatch && CATEGORIES.includes(catMatch[1]) ? catMatch[1] : classifyByKeywords(reply);
      return { category, summary: extracted || "\u5F53\u524D\u5C4F\u5E55\u65E0\u660E\u786E\u5DE5\u4F5C\u6D3B\u52A8" };
    }
    let cleanReply = reply;
    if (cleanReply.startsWith("```")) cleanReply = cleanReply.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    return { category: classifyByKeywords(cleanReply), summary: cleanReply.slice(0, 200) };
  }
  return { category: "\u751F\u6D3B", summary: "\u5F53\u524D\u5C4F\u5E55\u5185\u5BB9\u672A\u80FD\u8BC6\u522B\uFF0C\u8BF7\u624B\u52A8\u786E\u8BA4\u3002" };
}
async function generateReport(input, onChunk, onDone, onError) {
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("\u8BF7\u5148\u914D\u7F6E API Key"));
    return;
  }
  const typeLabel = input.type === "daily" ? "\u65E5\u62A5" : input.type === "weekly" ? "\u5468\u62A5" : "\u6708\u62A5";
  const lines = [];
  lines.push(`\u3010\u62A5\u544A\u7C7B\u578B\u3011${typeLabel}`);
  lines.push(`\u3010\u65E5\u671F\u8303\u56F4\u3011${input.startDate} \u81F3 ${input.endDate}`);
  if (input.appUsageSummary && input.appUsageSummary.length > 0) {
    lines.push("\u3010\u5E94\u7528\u4F7F\u7528\u65F6\u957F\u53C2\u8003\u3011");
    for (const a of input.appUsageSummary) {
      lines.push(`- ${a.appName}: ${a.durationMinutes} \u5206\u949F`);
    }
  }
  if (input.templateBody) {
    const clusteringHints = {
      timeline: "\u6309\u65F6\u95F4\u7EBF\u6392\u5217\u5DE5\u4F5C\u8BB0\u5F55\uFF0C\u6807\u6CE8\u6BCF\u4E2A\u65F6\u95F4\u6BB5\u505A\u4E86\u4EC0\u4E48\u3002",
      category: "\u6309\u5DE5\u4F5C\u5206\u7C7B\u5F52\u7EB3\uFF08\u5F00\u53D1/\u4F1A\u8BAE/\u6587\u6863/\u6D4B\u8BD5/\u6C9F\u901A\u7B49\uFF09\uFF0C\u6BCF\u7C7B\u4E0B\u5217\u51FA\u5177\u4F53\u4E8B\u9879\u3002",
      project: "\u8BC6\u522B\u5DE5\u4F5C\u8BB0\u5F55\u4E2D\u7684\u9879\u76EE\u5173\u952E\u8BCD\uFF0C\u6309\u9879\u76EE\u7EF4\u5EA6\u5206\u7EC4\u7EC4\u7EC7\u5185\u5BB9\u3002"
    };
    const hint = clusteringHints[input.clustering ?? "timeline"] ?? clusteringHints.timeline;
    lines.push(`\u3010\u7EC4\u7EC7\u65B9\u5F0F\u3011${hint}`);
  }
  if (input.plans && input.plans.length > 0) {
    lines.push("\u3010\u4ECA\u65E5\u8BA1\u5212\u3011");
    const completed = input.plans.filter((p) => p.completed);
    const incomplete = input.plans.filter((p) => !p.completed);
    if (completed.length > 0) {
      lines.push("\u5DF2\u5B8C\u6210\uFF1A");
      completed.forEach((p) => lines.push(`- [x] ${p.text}`));
    }
    if (incomplete.length > 0) {
      lines.push("\u672A\u5B8C\u6210\uFF1A");
      incomplete.forEach((p) => lines.push(`- [ ] ${p.text}`));
    }
    lines.push('\u8BF7\u5728\u62A5\u544A\u4E2D\u5BF9\u6BD4"\u8BA1\u5212 vs \u5B9E\u9645"\uFF0C\u7ED9\u51FA\u5B8C\u6210\u60C5\u51B5\u8BF4\u660E\u3002');
  }
  if (input.templateBody) {
    lines.push(`\u3010\u62A5\u544A\u6A21\u677F\u3011\uFF08\u4EC5\u4F5C\u4E3A\u6392\u7248\u683C\u5F0F\u53C2\u8003\uFF0C\u4E0D\u8981\u7167\u6284\u5185\u5BB9\uFF09`);
    lines.push(input.templateBody);
  }
  if (input.customInstruction) {
    lines.push(`\u3010\u81EA\u5B9A\u4E49\u6307\u4EE4\u3011${input.customInstruction}`);
  }
  if (input.memoryContent) {
    lines.push(`\u3010\u4E2A\u4EBA\u5DE5\u4F5C\u8BB0\u5FC6\u3011${input.memoryContent}`);
  }
  lines.push(`\u3010\u5DE5\u4F5C\u8BB0\u5F55\u3011`);
  for (const r of input.records) {
    const cat = r.category ? `[${r.category}]` : "";
    lines.push(`- ${r.startedAt} ${cat} ${r.summary}`);
  }
  lines.push("");
  lines.push(`\u8BF7\u57FA\u4E8E\u4EE5\u4E0A\u5DE5\u4F5C\u8BB0\u5F55\u751F\u6210\u4E00\u7BC7\u4E2D\u6587${typeLabel}\u3002\u8BF7\u4F7F\u7528\u4E2D\u6587\u751F\u6210\u6574\u7BC7\u62A5\u544A\u3002\u76F4\u63A5\u8F93\u51FA\u62A5\u544A\u6B63\u6587\uFF0C\u6309 Markdown \u683C\u5F0F\u3002`);
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
      throw new Error(`\u751F\u6210\u5931\u8D25: HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("\u65E0\u54CD\u5E94\u6D41");
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
          const delta = json.choices?.[0]?.delta?.content;
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
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("\u8BF7\u5148\u914D\u7F6E API Key"));
    return;
  }
  const typeLabel = type === "daily" ? "\u65E5\u62A5" : type === "weekly" ? "\u5468\u62A5" : "\u6708\u62A5";
  const userPrompt = `\u53C2\u8003\u62A5\u544A\uFF1A
${reference || "\u65E0"}

\u81EA\u5B9A\u4E49\u9700\u6C42\uFF1A
${requirements || "\u65E0"}

\u6211\u8981\u4F60\u7ED9\u6211\u751F\u6210\u4E00\u4EFD${typeLabel}\u6A21\u677F\u3002`;
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
      throw new Error(`\u6A21\u677F\u751F\u6210\u5931\u8D25: HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("\u65E0\u54CD\u5E94\u6D41");
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
          const delta = json.choices?.[0]?.delta?.content;
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
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("\u8BF7\u5148\u914D\u7F6E API Key"));
    return;
  }
  const prompts = {
    heatmap: `\u4EE5\u4E0B\u662F\u7528\u6237\u7684\u65F6\u6BB5\u70ED\u529B\u56FE\u6570\u636E\uFF08\u65E5\u671F \xD7 \u5C0F\u65F6 \xD7 \u8BB0\u5F55\u6570\uFF09\uFF1A
${JSON.stringify(data2)}

\u8BF7\u7528\u4E00\u53E5\u8BDD\u603B\u7ED3\u7528\u6237\u7684\u5DE5\u4F5C\u8282\u594F\u7279\u70B9\u548C\u4E00\u4E2A\u6539\u8FDB\u5EFA\u8BAE\u3002\u4E0D\u8D85\u8FC7 100 \u5B57\u3002`,
    appUsage: `\u4EE5\u4E0B\u662F\u7528\u6237\u7684\u5E94\u7528\u4F7F\u7528\u65F6\u957F\u6570\u636E\uFF1A
${JSON.stringify(data2)}

\u8BF7\u7528\u4E00\u53E5\u8BDD\u603B\u7ED3\u7528\u6237\u7684\u65F6\u95F4\u5206\u914D\u7279\u70B9\u548C\u4E00\u4E2A\u6539\u8FDB\u5EFA\u8BAE\u3002\u4E0D\u8D85\u8FC7 100 \u5B57\u3002`
  };
  try {
    const res = await fetch(apiUrl(settings, "/chat/completions"), {
      method: "POST",
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: "\u4F60\u662F\u4E00\u4E2A\u5DE5\u4F5C\u6548\u7387\u5206\u6790\u52A9\u624B\u3002\u8BF7\u7B80\u6D01\u3001\u5177\u4F53\u5730\u56DE\u7B54\u3002" },
          { role: "user", content: prompts[type] }
        ],
        stream: true,
        temperature: 0.5,
        max_tokens: 200
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("\u65E0\u54CD\u5E94\u6D41");
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
        const data3 = trimmed.slice(5).trim();
        if (data3 === "[DONE]") continue;
        try {
          const json = JSON.parse(data3);
          const delta = json.choices?.[0]?.delta?.content;
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
  const settings = getSettings();
  if (!settings.apiKey) {
    onError(new Error("\u8BF7\u5148\u914D\u7F6E API Key"));
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
    if (!res.body) throw new Error("\u65E0\u54CD\u5E94\u6D41");
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
          const delta = json.choices?.[0]?.delta?.content;
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

// electron/screenshot.ts
var import_electron3 = require("electron");
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_fs2 = __toESM(require("node:fs"), 1);
var SENSITIVE_KEYWORDS = [
  "\u79C1\u4EBA\u6C9F\u901A",
  "\u793E\u4EA4\u5A92\u4F53",
  "\u6D4F\u89C8\u793E\u4EA4\u5A92\u4F53",
  "\u5F53\u524D\u5305\u542B\u79C1\u4EBA\u6C9F\u901A",
  "\u684C\u9762\u7A7A\u95F2",
  "\u67E5\u770B\u684C\u9762"
];
function isSensitive(category, summary) {
  if (category !== "\u751F\u6D3B") return false;
  return SENSITIVE_KEYWORDS.some((kw) => summary.includes(kw));
}
function showNotification(title, body) {
  const settings = getSettings();
  if (!settings.showNotifications) return;
  const win = import_electron3.BrowserWindow.getAllWindows()[0];
  if (win && win.isFocused()) return;
  const n = new import_electron3.Notification({ title, body });
  n.show();
  setTimeout(() => n.close(), 3e3);
}
var timer = null;
var isRunning = false;
var isCapturing = false;
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
function cryptoRandom2() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
async function captureNow() {
  try {
    const settings = getSettings();
    if (!settings.apiKey) return { ok: false, error: "\u8BF7\u5148\u914D\u7F6E API Key" };
    const displays = import_electron3.screen.getAllDisplays();
    const primary = displays.find((d) => d.bounds.x === 0 && d.bounds.y === 0) ?? displays[0];
    if (!primary) return { ok: false, error: "\u672A\u627E\u5230\u663E\u793A\u5668" };
    const sources = await import_electron3.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false
    });
    const source = sources.find((s) => s.display_id === String(primary.id)) ?? sources[0];
    if (!source) return { ok: false, error: "\u672A\u627E\u5230\u5C4F\u5E55\u6E90" };
    const thumbnail = source.thumbnail;
    const pngBuffer = thumbnail.toPNG();
    const dataUrl = thumbnail.toDataURL();
    const base64 = dataUrl.split(",")[1];
    const screenshotsDir = import_node_path2.default.join(import_electron3.app.getPath("userData"), "screenshots");
    if (!import_node_fs2.default.existsSync(screenshotsDir)) import_node_fs2.default.mkdirSync(screenshotsDir, { recursive: true });
    const filename = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.png`;
    const filePath = import_node_path2.default.join(screenshotsDir, filename);
    import_node_fs2.default.writeFileSync(filePath, pngBuffer);
    const id = cryptoRandom2();
    const takenAt = (/* @__PURE__ */ new Date()).toISOString();
    createScreenshot({ id, path: filePath, takenAt });
    if (settings.visionEnabled && base64) {
      console.log("[screenshot] \u5F00\u59CB\u89C6\u89C9\u8BC6\u522B, model:", settings.visionModel);
      const result = await analyzeScreenshot(base64, settings.memoryContent);
      console.log("[screenshot] \u8BC6\u522B\u7ED3\u679C:", result.category, "|", result.summary.slice(0, 80));
      updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true });
      if (settings.sensitiveSceneSkip && isSensitive(result.category, result.summary)) {
        console.log("[screenshot] \u68C0\u6D4B\u5230\u654F\u611F\u573A\u666F\uFF0C\u8DF3\u8FC7\u8BB0\u5F55");
        if (settings.autoDeleteScreenshots) {
          try {
            import_node_fs2.default.unlinkSync(filePath);
          } catch {
          }
          updateScreenshot(id, { path: "" });
        }
        showNotification("\u23ED\uFE0F \u5DF2\u8DF3\u8FC7", "\u68C0\u6D4B\u5230\u654F\u611F\u5185\u5BB9\uFF0C\u672A\u8BB0\u5F55");
        return { ok: true, summary: "\u654F\u611F\u5185\u5BB9\u5DF2\u8DF3\u8FC7", category: "\u751F\u6D3B" };
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
          import_node_fs2.default.unlinkSync(filePath);
        } catch {
        }
        updateScreenshot(id, { path: "" });
      }
      showNotification("\u2705 \u5FEB\u901F\u8BB0\u5F55", `${result.category} \xB7 ${result.summary.slice(0, 20)}`);
      return { ok: true, summary: result.summary, category: result.category };
    }
    console.warn("[screenshot] \u89C6\u89C9\u8BC6\u522B\u672A\u542F\u7528\u6216\u65E0 base64 \u6570\u636E");
    return { ok: false, error: "\u89C6\u89C9\u8BC6\u522B\u672A\u542F\u7528" };
  } catch (e) {
    console.error("[screenshot] \u624B\u52A8\u622A\u56FE\u5931\u8D25:", e?.message ?? e);
    return { ok: false, error: e?.message ?? "\u622A\u56FE\u5931\u8D25" };
  }
}
async function captureAndAnalyze() {
  if (isCapturing) {
    console.log("[screenshot:auto] \u4E0A\u4E00\u6B21\u622A\u56FE\u4ECD\u5728\u8FDB\u884C\u4E2D\uFF0C\u8DF3\u8FC7\u672C\u6B21");
    return;
  }
  isCapturing = true;
  try {
    const settings = getSettings();
    if (!settings.apiKey) return;
    const displays = import_electron3.screen.getAllDisplays();
    const primary = displays.find((d) => d.bounds.x === 0 && d.bounds.y === 0) ?? displays[0];
    if (!primary) return;
    const sources = await import_electron3.desktopCapturer.getSources({
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
    const screenshotsDir = import_node_path2.default.join(import_electron3.app.getPath("userData"), "screenshots");
    if (!import_node_fs2.default.existsSync(screenshotsDir)) import_node_fs2.default.mkdirSync(screenshotsDir, { recursive: true });
    const filename = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.png`;
    const filePath = import_node_path2.default.join(screenshotsDir, filename);
    import_node_fs2.default.writeFileSync(filePath, pngBuffer);
    const id = cryptoRandom2();
    const takenAt = (/* @__PURE__ */ new Date()).toISOString();
    createScreenshot({ id, path: filePath, takenAt });
    if (settings.visionEnabled && base64) {
      console.log("[screenshot:auto] \u5F00\u59CB\u89C6\u89C9\u8BC6\u522B, model:", settings.visionModel);
      const result = await analyzeScreenshot(base64, settings.memoryContent);
      console.log("[screenshot:auto] \u8BC6\u522B\u7ED3\u679C:", result.category, "|", result.summary.slice(0, 80));
      updateScreenshot(id, { analysis: result.summary, appName: result.category, analyzed: true });
      if (settings.sensitiveSceneSkip && isSensitive(result.category, result.summary)) {
        console.log("[screenshot:auto] \u68C0\u6D4B\u5230\u654F\u611F\u573A\u666F\uFF0C\u8DF3\u8FC7\u8BB0\u5F55");
        if (settings.autoDeleteScreenshots) {
          try {
            import_node_fs2.default.unlinkSync(filePath);
          } catch {
          }
          updateScreenshot(id, { path: "" });
        }
        showNotification("\u23ED\uFE0F \u5DF2\u8DF3\u8FC7", "\u68C0\u6D4B\u5230\u654F\u611F\u5185\u5BB9\uFF0C\u672A\u8BB0\u5F55");
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
          import_node_fs2.default.unlinkSync(filePath);
        } catch {
        }
        updateScreenshot(id, { path: "" });
        console.log("[screenshot:auto] \u622A\u56FE\u5DF2\u5220\u9664");
      }
      showNotification("\u2705 \u5DF2\u8BB0\u5F55", `${result.category} \xB7 ${result.summary.slice(0, 20)}`);
    }
  } catch (e) {
    console.error("[screenshot:auto] \u622A\u56FE\u5931\u8D25:", e);
  } finally {
    isCapturing = false;
  }
}

// electron/appTracker.ts
var import_node_child_process = require("node:child_process");
var import_electron4 = require("electron");
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_fs3 = __toESM(require("node:fs"), 1);
var PS_SCRIPT_PATH = import_node_path3.default.join(import_electron4.app.getPath("userData"), "persistent-fg.ps1");
var PS_SCRIPT_CONTENT = `
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
  import_node_fs3.default.writeFileSync(PS_SCRIPT_PATH, PS_SCRIPT_CONTENT, "utf-8");
}
var APP_NAME_MAP = {
  "code": "VS Code",
  "code-insiders": "VS Code Insiders",
  "chrome": "Google Chrome",
  "msedge": "Microsoft Edge",
  "firefox": "Firefox",
  "explorer": "\u6587\u4EF6\u8D44\u6E90\u7BA1\u7406\u5668",
  "WINWORD": "Word",
  "EXCEL": "Excel",
  "POWERPNT": "PowerPoint",
  "ONENOTE": "OneNote",
  "OUTLOOK": "Outlook",
  "WeChat": "\u5FAE\u4FE1",
  "QQ": "QQ",
  "DingTalk": "\u9489\u9489",
  "Feishu": "\u98DE\u4E66",
  "Lark": "\u98DE\u4E66",
  "Teams": "Microsoft Teams",
  "Slack": "Slack",
  "Discord": "Discord",
  "Telegram": "Telegram",
  "notepad": "\u8BB0\u4E8B\u672C",
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
  "Terminal": "\u7EC8\u7AEF",
  "WindowsTerminal": "Windows Terminal",
  "powershell": "PowerShell",
  "cmd": "\u547D\u4EE4\u63D0\u793A\u7B26",
  "git-bash": "Git Bash",
  "nautilus": "\u6587\u4EF6\u7BA1\u7406\u5668",
  "Finder": "\u8BBF\u8FBE",
  "Safari": "Safari",
  "Preview": "\u9884\u89C8",
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
  "et": "WPS \u8868\u683C",
  "wpp": "WPS \u6F14\u793A",
  "pdfxedit": "PDF-XChange Editor"
};
function toFriendlyName(processName) {
  return APP_NAME_MAP[processName] ?? processName;
}
var psProcess = null;
var stdoutBuffer = "";
var pendingResolve = null;
var pendingTimeout = null;
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
  if (psProcess && !psProcess.killed && psProcess.stdin && psProcess.stdout) return;
  ensurePsScript();
  psProcess = (0, import_node_child_process.spawn)("powershell.exe", [
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
  psProcess.stdout?.on("data", (data2) => {
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
  psProcess.stderr?.on("data", (data2) => {
    console.debug("[appTracker] PS stderr:", data2.toString("utf-8").trim());
  });
  psProcess.stdin?.on("error", () => {
  });
  psProcess.stdout?.on("error", () => {
  });
  psProcess.on("error", (err) => {
    console.error("[appTracker] PowerShell \u8FDB\u7A0B\u9519\u8BEF:", err.message);
    psProcess = null;
    resolvePending("");
  });
  psProcess.on("exit", (code) => {
    console.log("[appTracker] PowerShell \u8FDB\u7A0B\u9000\u51FA, code=" + code);
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
        console.warn("[appTracker] \u67E5\u8BE2\u8D85\u65F6, \u91CD\u542F PowerShell \u8FDB\u7A0B");
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
      return toFriendlyName(name || "\u672A\u77E5");
    }
    if (process.platform === "darwin") {
      return new Promise((resolve) => {
        const script = `tell application "System Events" to name of first application process whose frontmost is true`;
        (0, import_node_child_process.execFile)("osascript", ["-e", script], { encoding: "utf-8", timeout: 3e3 }, (err, stdout) => {
          if (err) {
            resolve("\u672A\u77E5");
            return;
          }
          resolve(toFriendlyName(stdout.trim() || "\u672A\u77E5"));
        });
      });
    }
    return "\u672A\u77E5";
  } catch {
    return "\u672A\u77E5";
  }
}
var tracker = null;
var lastAppName = null;
var lastSwitchTime = 0;
var tickCount = 0;
var POLL_INTERVAL = 5e3;
var FLUSH_INTERVAL = 12;
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
  console.log("[appTracker] \u6D3B\u52A8\u7A97\u53E3\u8FFD\u8E2A\u5DF2\u542F\u52A8 (\u6301\u4E45\u5316 PowerShell \u6A21\u5F0F)");
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
  console.log("[appTracker] \u6D3B\u52A8\u7A97\u53E3\u8FFD\u8E2A\u5DF2\u505C\u6B62");
}

// electron/api-server.ts
var import_node_http = __toESM(require("node:http"), 1);
var server = null;
function cryptoRandom3() {
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
  const authLine = token ? `Authorization: Bearer ${token}` : "\uFF08\u672A\u8BBE\u7F6E token\uFF0C\u514D\u8BA4\u8BC1\uFF09";
  return `# \u7259\u7259\u4E50\u65E5\u62A5\u52A9\u624B - \u672C\u5730 API \u6587\u6863

\u670D\u52A1\u5730\u5740\uFF1Ahttp://127.0.0.1:${port}
\u8BA4\u8BC1\u65B9\u5F0F\uFF1A${authLine}

## \u7AEF\u70B9\u5217\u8868

### GET /
\u8FD4\u56DE\u672C API \u6587\u6863\uFF08Markdown\uFF09\u3002

### GET /api/work-records
\u67E5\u8BE2\u5DE5\u4F5C\u8BB0\u5F55\u3002
- \u67E5\u8BE2\u53C2\u6570\uFF1A\`date\`\uFF08YYYY-MM-DD\uFF09\u3001\`startDate\`\u3001\`endDate\`\u3001\`limit\`\u3001\`offset\`

### GET /api/reports
\u67E5\u8BE2\u5386\u53F2\u62A5\u544A\u3002
- \u67E5\u8BE2\u53C2\u6570\uFF1A\`limit\`\u3001\`offset\`

### GET /api/app-usage
\u67E5\u8BE2\u5E94\u7528\u4F7F\u7528\u7EDF\u8BA1\u3002
- \u67E5\u8BE2\u53C2\u6570\uFF1A\`startDate\`\u3001\`endDate\`

### GET /api/heatmap
\u67E5\u8BE2\u70ED\u529B\u56FE\u6570\u636E\uFF08\u65E5\u671F \xD7 \u5C0F\u65F6 \xD7 \u8BB0\u5F55\u6570\uFF09\u3002
- \u67E5\u8BE2\u53C2\u6570\uFF1A\`startDate\`\u3001\`endDate\`

### GET /api/timeline
\u67E5\u8BE2\u65F6\u95F4\u7EBF\u5DE5\u4F5C\u8BB0\u5F55\u3002
- \u67E5\u8BE2\u53C2\u6570\uFF1A\`startDate\`\u3001\`endDate\`

### GET /api/plans
\u67E5\u8BE2\u4ECA\u65E5\u8BA1\u5212\u3002
- \u67E5\u8BE2\u53C2\u6570\uFF1A\`date\`\uFF08YYYY-MM-DD\uFF09

### POST /api/work-records
\u521B\u5EFA\u5DE5\u4F5C\u8BB0\u5F55\u3002
- Body\uFF1A\`{ startedAt, summary, category?, endedAt? }\`

### POST /api/reports/generate
\u751F\u6210\u62A5\u544A\uFF08\u6D41\u5F0F\uFF09\u3002
- Body\uFF1A\`{ type, startDate, endDate, templateBody?, customInstruction? }\`

## \u5F3A\u5236\u89C4\u5219\uFF08\u7ED9\u63A5\u5165 Agent\uFF09
1. \u6BCF\u6B21\u5904\u7406\u7528\u6237\u8BF7\u6C42\u524D\uFF0C\u5FC5\u987B\u5148\u8C03\u7528 GET / \u83B7\u53D6\u6700\u65B0 API \u6587\u6863
2. \u8BFB\u53D6\u6587\u6863\u540E\uFF0C\u89E3\u6790\u63A5\u53E3\u5217\u8868\uFF0C\u52A8\u6001\u9009\u62E9\u63A5\u53E3\u5E76\u6784\u9020\u8BF7\u6C42
3. \u6240\u6709\u8BF7\u6C42\u9700\u643A\u5E26 Header: Authorization: Bearer ${token || "<token>"}
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
      resolve({ ok: false, error: "\u670D\u52A1\u5DF2\u5728\u8FD0\u884C" });
      return;
    }
    const s = import_node_http.default.createServer(async (req, res) => {
      try {
        const settings = getSettings();
        if (!checkAuth(req, settings.localApiToken)) {
          sendJson(res, 401, { error: "\u672A\u6388\u6743" });
          return;
        }
        const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
        const path5 = url.pathname;
        const method = req.method || "GET";
        if (path5 === "/" && method === "GET") {
          sendText(res, 200, getApiDocMarkdown(port, settings.localApiToken), "text/markdown; charset=utf-8");
          return;
        }
        if (path5 === "/api/work-records" && method === "GET") {
          const date = url.searchParams.get("date") || void 0;
          const startDate = url.searchParams.get("startDate") || void 0;
          const endDate = url.searchParams.get("endDate") || void 0;
          const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : void 0;
          const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : void 0;
          sendJson(res, 200, listWorkRecords({ date, startDate, endDate, limit, offset }));
          return;
        }
        if (path5 === "/api/work-records" && method === "POST") {
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
        if (path5 === "/api/reports" && method === "GET") {
          const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50;
          const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0;
          sendJson(res, 200, listReports({ limit, offset }));
          return;
        }
        if (path5 === "/api/app-usage" && method === "GET") {
          const startDate = url.searchParams.get("startDate") || todayISO();
          const endDate = url.searchParams.get("endDate") || endOfTodayISO();
          sendJson(res, 200, appUsage({ startDate, endDate }));
          return;
        }
        if (path5 === "/api/heatmap" && method === "GET") {
          const startDate = url.searchParams.get("startDate") || void 0;
          const endDate = url.searchParams.get("endDate") || void 0;
          sendJson(res, 200, heatmap({ startDate, endDate }));
          return;
        }
        if (path5 === "/api/timeline" && method === "GET") {
          const startDate = url.searchParams.get("startDate") || void 0;
          const endDate = url.searchParams.get("endDate") || void 0;
          sendJson(res, 200, timeline({ startDate, endDate }));
          return;
        }
        if (path5 === "/api/plans" && method === "GET") {
          const today = /* @__PURE__ */ new Date();
          const date = url.searchParams.get("date") || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          sendJson(res, 200, listPlans({ date }));
          return;
        }
        if (path5 === "/api/reports/generate" && method === "POST") {
          const body = JSON.parse(await readBody(req));
          const records = listWorkRecords({ startDate: body.startDate, endDate: body.endDate, limit: 500 });
          if (records.length === 0) {
            sendJson(res, 400, { error: "\u6240\u9009\u65E5\u671F\u8303\u56F4\u5185\u6CA1\u6709\u5DE5\u4F5C\u8BB0\u5F55" });
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
        sendJson(res, 404, { error: `\u672A\u627E\u5230\u7AEF\u70B9\uFF1A${method} ${path5}` });
      } catch (e) {
        sendJson(res, 500, { error: e?.message ?? "\u670D\u52A1\u5668\u9519\u8BEF" });
      }
    });
    s.on("error", (err) => {
      server = null;
      if (err.code === "EADDRINUSE") {
        resolve({ ok: false, error: `\u7AEF\u53E3 ${port} \u5DF2\u88AB\u5360\u7528` });
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
  return cryptoRandom3().replace(/-/g, "") + cryptoRandom3().replace(/-/g, "");
}

// electron/main.ts
import_electron5.app.setName("\u7259\u7259\u4E50\u65E5\u62A5\u52A9\u624B");
var gotLock = import_electron5.app.requestSingleInstanceLock();
if (!gotLock) import_electron5.app.quit();
var mainWindow = null;
var tray = null;
function cryptoRandom4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function createWindow() {
  mainWindow = new import_electron5.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "\u7259\u7259\u4E50\u65E5\u62A5\u52A9\u624B",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: import_node_path4.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  import_electron5.Menu.setApplicationMenu(null);
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(import_node_path4.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("close", (e) => {
    if (import_electron5.app.isQuitting) return;
    e.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
}
function createTray() {
  const iconPath = import_node_path4.default.join(__dirname, "../dist/icon.png");
  let trayIcon;
  if (import_node_fs4.default.existsSync(iconPath)) trayIcon = import_electron5.nativeImage.createFromPath(iconPath);
  else trayIcon = import_electron5.nativeImage.createEmpty();
  tray = new import_electron5.Tray(trayIcon);
  tray.setToolTip("\u7259\u7259\u4E50\u65E5\u62A5\u52A9\u624B");
  const menu = import_electron5.Menu.buildFromTemplate([
    { label: "\u6253\u5F00\u4E3B\u7A97\u53E3", click: () => {
      mainWindow?.show();
      mainWindow?.focus();
    } },
    { label: "\u9000\u51FA", click: () => {
      import_electron5.app.isQuitting = true;
      import_electron5.app.quit();
    } }
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}
var scheduledReportTimer = null;
var lastAutoReportDate = null;
function startScheduledReport() {
  if (scheduledReportTimer) return;
  scheduledReportTimer = setInterval(checkScheduledReport, 6e4);
  console.log("[scheduled] \u5B9A\u65F6\u65E5\u62A5\u5DF2\u542F\u52A8, \u65F6\u95F4:", getSettings().scheduledReportTime);
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
    console.log("[scheduled] \u4ECA\u65E5\u65E0\u5DE5\u4F5C\u8BB0\u5F55, \u8DF3\u8FC7\u81EA\u52A8\u751F\u6210");
    return;
  }
  console.log(`[scheduled] \u5F00\u59CB\u81EA\u52A8\u751F\u6210\u65E5\u62A5, ${records.length} \u6761\u5DE5\u4F5C\u8BB0\u5F55`);
  const reportId = cryptoRandom4();
  createReport({
    id: reportId,
    title: "\u751F\u6210\u4E2D...",
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
      const title = titleMatch ? titleMatch[1].trim() : `\u65E5\u62A5 ${todayStr}`;
      updateReport(reportId, { content: full, title, status: "completed" });
      emit("report:status-changed", { id: reportId, status: "completed", title, content: full });
      console.log("[scheduled] \u65E5\u62A5\u81EA\u52A8\u751F\u6210\u5B8C\u6210:", title);
    },
    (err) => {
      updateReport(reportId, { status: "failed", content: err.message });
      emit("report:status-changed", { id: reportId, status: "failed", error: err.message });
      console.error("[scheduled] \u65E5\u62A5\u81EA\u52A8\u751F\u6210\u5931\u8D25:", err.message);
    }
  );
}
function registerGlobalShortcut() {
  const settings = getSettings();
  const shortcut = settings.globalShortcut || "Ctrl+Shift+J";
  import_electron5.globalShortcut.unregisterAll();
  const ok = import_electron5.globalShortcut.register(shortcut, async () => {
    console.log("[shortcut] \u89E6\u53D1\u5FEB\u901F\u8BB0\u5F55:", shortcut);
    const result = await captureNow();
    if (result.ok) {
      console.log("[shortcut] \u8BB0\u5F55\u6210\u529F:", result.category, result.summary?.slice(0, 50));
    } else {
      console.error("[shortcut] \u8BB0\u5F55\u5931\u8D25:", result.error);
    }
  });
  if (!ok) {
    console.warn("[shortcut] \u5FEB\u6377\u952E\u6CE8\u518C\u5931\u8D25\uFF0C\u53EF\u80FD\u88AB\u5176\u4ED6\u5E94\u7528\u5360\u7528:", shortcut);
  } else {
    console.log("[shortcut] \u5168\u5C40\u5FEB\u6377\u952E\u5DF2\u6CE8\u518C:", shortcut);
  }
}
import_electron5.app.whenReady().then(async () => {
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
    if (r.ok) console.log("[api-server] \u672C\u5730 API \u670D\u52A1\u5DF2\u542F\u52A8, \u7AEF\u53E3:", r.port);
    else console.warn("[api-server] \u542F\u52A8\u5931\u8D25:", r.error);
  }
  import_electron5.app.on("activate", () => {
    if (import_electron5.BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});
import_electron5.app.on("before-quit", async () => {
  import_electron5.globalShortcut.unregisterAll();
  stopScreenshot();
  stopAppTracker();
  stopScheduledReport();
  await stopApiServer();
  closeDb();
});
function emit(channel, ...args) {
  const win = import_electron5.BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}
import_electron5.ipcMain.on("window-minimize", () => mainWindow?.minimize());
import_electron5.ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
import_electron5.ipcMain.on("window-close", () => mainWindow?.close());
import_electron5.ipcMain.handle("settings:get", () => getSettings());
import_electron5.ipcMain.handle("settings:update", (_e, patch) => {
  const result = updateSettings(patch);
  if (patch.globalShortcut !== void 0) {
    registerGlobalShortcut();
  }
  return result;
});
import_electron5.ipcMain.handle("ai:test-connection", () => testConnection());
import_electron5.ipcMain.handle("ai:generate-report", async (_e, input) => {
  const reportId = cryptoRandom4();
  createReport({
    id: reportId,
    title: "\u751F\u6210\u4E2D...",
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
      const title = titleMatch ? titleMatch[1].trim() : `${input.type === "daily" ? "\u65E5\u62A5" : input.type === "weekly" ? "\u5468\u62A5" : "\u6708\u62A5"} ${input.startDate}`;
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
import_electron5.ipcMain.handle("ai:generate-template", async (_e, input) => {
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
import_electron5.ipcMain.handle("work-records:list", (_e, input) => {
  return listWorkRecords(input);
});
import_electron5.ipcMain.handle("work-records:create", (_e, input) => {
  return createWorkRecord(input);
});
import_electron5.ipcMain.handle("work-records:update", (_e, input) => {
  return updateWorkRecord(input);
});
import_electron5.ipcMain.handle("work-records:delete", (_e, input) => {
  deleteWorkRecord(input.id);
  return { ok: true };
});
import_electron5.ipcMain.handle("work-records:daily-summary", (_e, input) => {
  return dailySummary(input.date);
});
import_electron5.ipcMain.handle("timeline:list", (_e, input) => timeline(input));
import_electron5.ipcMain.handle("heatmap:list", (_e, input) => heatmap(input));
import_electron5.ipcMain.handle("app-usage:list", (_e, input) => appUsage(input));
import_electron5.ipcMain.handle("system:displays", () => {
  return import_electron5.screen.getAllDisplays().map((d, i) => ({
    id: i + 1,
    label: d.label || `\u663E\u793A\u5668 ${i + 1}`,
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    scaleFactor: d.scaleFactor,
    isPrimary: import_electron5.screen.getPrimaryDisplay().id === d.id
  }));
});
import_electron5.ipcMain.handle("reports:list", (_e, input) => listReports(input));
import_electron5.ipcMain.handle("reports:delete", (_e, input) => {
  deleteReport(input.id);
  return { ok: true };
});
import_electron5.ipcMain.handle("reports:update-title", (_e, input) => {
  updateReport(input.id, { title: input.title });
  return { ok: true };
});
import_electron5.ipcMain.handle("reports:update-content", (_e, input) => {
  updateReport(input.id, { content: input.content });
  return { ok: true };
});
import_electron5.ipcMain.handle("report:export-to-file", async (_e, input) => {
  const reports = listReports({ limit: 1e3 });
  const report = reports.find((r) => r.id === input.id);
  if (!report) throw new Error("\u62A5\u544A\u4E0D\u5B58\u5728");
  const ext = input.format === "md" ? "md" : "txt";
  const res = await import_electron5.dialog.showSaveDialog({
    title: "\u5BFC\u51FA\u62A5\u544A",
    defaultPath: `${report.title}.${ext}`,
    filters: [{ name: input.format === "md" ? "Markdown" : "\u6587\u672C", extensions: [ext] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, message: "\u5DF2\u53D6\u6D88" };
  import_node_fs4.default.writeFileSync(res.filePath, report.content, "utf-8");
  return { ok: true, path: res.filePath };
});
import_electron5.ipcMain.handle("report-templates:list", (_e, input) => listTemplates(input?.type));
import_electron5.ipcMain.handle("report-templates:create", (_e, input) => createTemplate(input));
import_electron5.ipcMain.handle("report-templates:update", (_e, input) => updateTemplate(input));
import_electron5.ipcMain.handle("report-templates:delete", (_e, input) => {
  deleteTemplate(input.id);
  return { ok: true };
});
import_electron5.ipcMain.handle("screenshots:status", () => ({ running: isScreenshotRunning() }));
import_electron5.ipcMain.handle("screenshots:capture-now", async () => captureNow());
import_electron5.ipcMain.handle("read-local-image", async (_e, filePath) => {
  try {
    const fs5 = await import("node:fs");
    if (!fs5.existsSync(filePath)) return { ok: false, error: "\u6587\u4EF6\u4E0D\u5B58\u5728" };
    const buffer = fs5.readFileSync(filePath);
    const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return { ok: true, dataUrl: `data:image/${ext};base64,${buffer.toString("base64")}` };
  } catch (e) {
    return { ok: false, error: e?.message ?? "\u8BFB\u53D6\u5931\u8D25" };
  }
});
import_electron5.ipcMain.handle("screenshots:start", () => ({ ok: startScreenshot() }));
import_electron5.ipcMain.handle("screenshots:stop", () => {
  stopScreenshot();
  return { ok: true };
});
import_electron5.ipcMain.handle("screenshots:list", (_e, input) => listScreenshots(input));
import_electron5.ipcMain.handle("data-management:export", async () => {
  const res = await import_electron5.dialog.showSaveDialog({
    title: "\u5BFC\u51FA\u6570\u636E\u5907\u4EFD",
    defaultPath: `daily-assistant-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON \u5907\u4EFD", extensions: ["json"] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, message: "\u5DF2\u53D6\u6D88" };
  import_node_fs4.default.writeFileSync(res.filePath, JSON.stringify(exportAll(), null, 2), "utf-8");
  return { ok: true, path: res.filePath };
});
import_electron5.ipcMain.handle("data-management:import", async () => {
  const res = await import_electron5.dialog.showOpenDialog({
    title: "\u5BFC\u5165\u6570\u636E\u5907\u4EFD",
    filters: [{ name: "JSON \u5907\u4EFD", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (res.canceled || res.filePaths.length === 0) return { ok: false, message: "\u5DF2\u53D6\u6D88" };
  const raw = import_node_fs4.default.readFileSync(res.filePaths[0], "utf-8");
  const data2 = JSON.parse(raw);
  if (!data2.version) throw new Error("\u65E0\u6548\u7684\u5907\u4EFD\u6587\u4EF6");
  importAll(data2);
  return { ok: true, message: "\u5BFC\u5165\u6210\u529F" };
});
import_electron5.ipcMain.handle("data-management:clear", () => {
  clearAll();
  return { ok: true };
});
import_electron5.ipcMain.handle("file:read-as-base64", (_e, filePath) => {
  if (!import_node_fs4.default.existsSync(filePath)) throw new Error("\u6587\u4EF6\u4E0D\u5B58\u5728");
  return import_node_fs4.default.readFileSync(filePath).toString("base64");
});
import_electron5.ipcMain.handle("app:open-external", (_e, url) => {
  import_electron5.shell.openExternal(url);
  return { ok: true };
});
import_electron5.ipcMain.handle("app:get-version", () => import_electron5.app.getVersion());
import_electron5.ipcMain.handle("plans:list", (_e, input) => listPlans(input));
import_electron5.ipcMain.handle("plans:create", (_e, input) => createPlan(input));
import_electron5.ipcMain.handle("plans:update", (_e, input) => updatePlan(input));
import_electron5.ipcMain.handle("plans:delete", (_e, input) => {
  deletePlan(input.id);
  return { ok: true };
});
import_electron5.ipcMain.handle("ai:insight", async (_e, input) => {
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
import_electron5.ipcMain.handle("ai:chat", async (_e, input) => {
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
import_electron5.ipcMain.handle("localApi:getStatus", () => {
  const s = getSettings();
  return { running: isApiServerRunning(), port: s.localApiPort, token: s.localApiToken };
});
import_electron5.ipcMain.handle("localApi:start", async (_e, input) => {
  const settings = getSettings();
  const port = input?.port ?? settings.localApiPort;
  if (port !== settings.localApiPort) {
    updateSettings({ localApiPort: port, localApiEnabled: true });
  } else {
    updateSettings({ localApiEnabled: true });
  }
  const r = await startApiServer(port);
  return r;
});
import_electron5.ipcMain.handle("localApi:stop", async () => {
  updateSettings({ localApiEnabled: false });
  return await stopApiServer();
});
import_electron5.ipcMain.handle("localApi:regenerateToken", () => {
  const token = regenerateApiToken();
  updateSettings({ localApiToken: token });
  return { ok: true, token };
});
