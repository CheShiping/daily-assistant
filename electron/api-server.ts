// 本地 HTTP API 服务 - Agent 接入层
import http from 'node:http'
import { listWorkRecords, listReports, appUsage, heatmap, timeline, listPlans, createWorkRecord } from './db'
import { getSettings } from './settings'
import { generateReport, type GenerateReportInput } from './ai'

let server: http.Server | null = null

function cryptoRandom(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function todayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfTodayISO(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function checkAuth(req: http.IncomingMessage, token: string): boolean {
  if (!token) return true // 未设置 token 则不校验
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim() === token
  }
  return false
}

function getApiDocMarkdown(port: number, token: string): string {
  const authLine = token ? `Authorization: Bearer ${token}` : '（未设置 token，免认证）'
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
3. 所有请求需携带 Header: Authorization: Bearer ${token || '<token>'}
`
}

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

function sendText(res: http.ServerResponse, status: number, text: string, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(text)
  })
  res.end(text)
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

export function startApiServer(port: number): Promise<{ ok: boolean; error?: string; port?: number }> {
  return new Promise((resolve) => {
    if (server) {
      resolve({ ok: false, error: '服务已在运行' })
      return
    }
    const s = http.createServer(async (req, res) => {
      try {
        const settings = getSettings()
        if (!checkAuth(req, settings.localApiToken)) {
          sendJson(res, 401, { error: '未授权' })
          return
        }
        const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)
        const path = url.pathname
        const method = req.method || 'GET'

        if (path === '/' && method === 'GET') {
          sendText(res, 200, getApiDocMarkdown(port, settings.localApiToken), 'text/markdown; charset=utf-8')
          return
        }

        if (path === '/api/work-records' && method === 'GET') {
          const date = url.searchParams.get('date') || undefined
          const startDate = url.searchParams.get('startDate') || undefined
          const endDate = url.searchParams.get('endDate') || undefined
          const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined
          const offset = url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : undefined
          sendJson(res, 200, listWorkRecords({ date, startDate, endDate, limit, offset }))
          return
        }

        if (path === '/api/work-records' && method === 'POST') {
          const body = JSON.parse(await readBody(req))
          const rec = createWorkRecord({
            startedAt: body.startedAt || new Date().toISOString(),
            summary: body.summary,
            category: body.category,
            endedAt: body.endedAt
          })
          sendJson(res, 201, rec)
          return
        }

        if (path === '/api/reports' && method === 'GET') {
          const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 50
          const offset = url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : 0
          sendJson(res, 200, listReports({ limit, offset }))
          return
        }

        if (path === '/api/app-usage' && method === 'GET') {
          const startDate = url.searchParams.get('startDate') || todayISO()
          const endDate = url.searchParams.get('endDate') || endOfTodayISO()
          sendJson(res, 200, appUsage({ startDate, endDate }))
          return
        }

        if (path === '/api/heatmap' && method === 'GET') {
          const startDate = url.searchParams.get('startDate') || undefined
          const endDate = url.searchParams.get('endDate') || undefined
          sendJson(res, 200, heatmap({ startDate, endDate }))
          return
        }

        if (path === '/api/timeline' && method === 'GET') {
          const startDate = url.searchParams.get('startDate') || undefined
          const endDate = url.searchParams.get('endDate') || undefined
          sendJson(res, 200, timeline({ startDate, endDate }))
          return
        }

        if (path === '/api/plans' && method === 'GET') {
          const today = new Date()
          const date = url.searchParams.get('date') || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          sendJson(res, 200, listPlans({ date }))
          return
        }

        if (path === '/api/reports/generate' && method === 'POST') {
          const body = JSON.parse(await readBody(req))
          const records = listWorkRecords({ startDate: body.startDate, endDate: body.endDate, limit: 500 })
          if (records.length === 0) {
            sendJson(res, 400, { error: '所选日期范围内没有工作记录' })
            return
          }
          const input: GenerateReportInput = {
            type: body.type || 'daily',
            startDate: body.startDate,
            endDate: body.endDate,
            templateBody: body.templateBody,
            customInstruction: body.customInstruction,
            records: records.map(r => ({ startedAt: r.startedAt, summary: r.summary, category: r.category ?? undefined }))
          }
          let fullContent = ''
          // 流式收集后一次性返回（避免 SSE 复杂度）
          await new Promise<void>((resolveGen, rejectGen) => {
            generateReport(
              input,
              (chunk) => { fullContent += chunk },
              () => resolveGen(),
              (err) => rejectGen(err)
            )
          })
          sendJson(res, 200, { content: fullContent })
          return
        }

        sendJson(res, 404, { error: `未找到端点：${method} ${path}` })
      } catch (e: any) {
        sendJson(res, 500, { error: e?.message ?? '服务器错误' })
      }
    })

    s.on('error', (err: any) => {
      server = null
      if (err.code === 'EADDRINUSE') {
        resolve({ ok: false, error: `端口 ${port} 已被占用` })
      } else {
        resolve({ ok: false, error: err.message })
      }
    })

    s.listen(port, '127.0.0.1', () => {
      server = s
      resolve({ ok: true, port })
    })
  })
}

export function stopApiServer(): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    if (!server) {
      resolve({ ok: true })
      return
    }
    server.close(() => {
      server = null
      resolve({ ok: true })
    })
  })
}

export function isApiServerRunning(): boolean {
  return server !== null
}

export function regenerateApiToken(): string {
  return cryptoRandom().replace(/-/g, '') + cryptoRandom().replace(/-/g, '')
}
