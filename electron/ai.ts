// AI Service - OpenAI 兼容 API，支持流式 + 视觉
import { type AppSettings, getSettings } from './settings'
import { BrowserWindow } from 'electron'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >
}

const SYSTEM_PROMPTS = {
  report: '你是一位工作日报生成助手。请严格基于用户提供的工作记录生成报告，不得编造、夸大或遗漏。保持专业、简洁、客观的职场表达。直接输出报告正文，不要添加额外解释、总结或元评论。',
  classify: '你是一个工作活动分类助手。根据工作描述判断所属类别，只输出类别名称，不要输出其他内容。',
  template: '你是一位资深职场报告写作专家。请基于用户提供的参考报告和自定义需求，生成一个高质量、可复用的报告模板。\n\n严格使用 Markdown 格式，第一行必须是 `# 模板标题`，正文使用 `{{占位符}}` 格式表示可变内容。只输出最终模板内容。',
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
  test: '请只回复 OK，用于测试连接。'
}

const CATEGORIES = ['开发', '会议', '文档', '测试', '沟通', '设计', '运维', '数据分析', '学习', '管理', '产品', '生活', '其他']

// 关键词分类表，避免每次截图都额外调一次 AI
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '开发': ['代码', '编程', '开发', 'IDE', 'vscode', 'vs code', 'git', 'github', 'gitlab', '调试', 'debug', 'api', '函数', 'bug', '编译', '终端', 'terminal', 'npm', 'python', 'java', 'javascript', 'typescript', 'go', 'rust', 'react', 'vue', 'node', 'docker', 'k8s', '部署', '前端', '后端', '框架', '重构', '提交', 'commit', 'merge', '分支', 'branch', '栈', '堆栈', '报错', '异常', '接口', '联调'],
  '会议': ['会议', '开会', '讨论', 'zoom', '腾讯会议', '钉钉', '飞书', '视频会议', '评审', '站会', '周会', '例会', '需求评审', '技术评审', '头脑风暴', 'brainstorm', '同步', '对齐', '拉齐'],
  '文档': ['文档', 'word', 'excel', 'ppt', 'powerpoint', '写文档', '笔记', 'markdown', 'notion', '语雀', 'confluence', 'wiki', '整理文档', '文档编写', '说明文档', '设计文档', '技术文档'],
  '测试': ['测试', 'test', 'qa', '验收', '回归', '测试用例', '自动化测试', '单元测试', '集成测试', '压测', '性能测试', 'jenkins', 'ci/cd', '缺陷', 'bug修复', '验证'],
  '沟通': ['聊天', '微信', '邮件', 'email', 'slack', '沟通', '回复', '消息', 'discord', 'telegram', '企业微信', '即时通讯', '交流', '协商'],
  '设计': ['设计', 'figma', 'sketch', 'ui', 'ux', '原型', '设计稿', '切图', '标注', 'photoshop', 'ps', 'ai', 'illustrator', '交互设计', '视觉设计', '组件库'],
  '运维': ['运维', '服务器', 'server', 'docker', 'kubernetes', 'k8s', '部署', '监控', '日志', 'log', 'nginx', 'linux', 'shell', '脚本', '巡检', '告警', '故障', '恢复', '扩容'],
  '数据分析': ['数据', '分析', '报表', '统计', 'bi', '数据库', 'sql', 'mysql', 'redis', 'elasticsearch', '数据清洗', '数据可视化', '指标', 'dashboard', '埋点', 'etl'],
  '学习': ['学习', '课程', '教程', '视频', '阅读', '看书', '文档', '博客', 'stackoverflow', 'b站', 'coursera', 'udemy', '技术文章', '研究', '调研'],
  '管理': ['管理', '计划', '排期', '任务', 'jira', '项目管理', 'teambition', 'tapd', '看板', '敏捷', 'scrum', '分配', '跟进', '协调', '汇报', '审批'],
  '产品': ['产品', '需求', '原型', 'prd', '用户', '竞品', 'axure', '产品规划', '路线图', '功能', '版本', '迭代', '用户调研', '反馈'],
  '生活': ['休息', '吃饭', '浏览', '购物', '音乐', '视频', '新闻', '社交媒体', '微博', '抖音', '小红书', '快手', 'b站', '哔哩哔哩', 'twitter', 'instagram', 'facebook', '知乎', 'youtube', 'netflix', '游戏', '闲聊', '桌面']
}

export function classifyByKeywords(summary: string): string {
  const lower = summary.toLowerCase()
  let bestMatch = '其他'
  let bestScore = 0
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k.toLowerCase())).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = cat
    }
  }
  return bestMatch
}

function authHeaders(settings: AppSettings): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`
  }
}

function apiUrl(settings: AppSettings, path: string): string {
  const base = settings.baseUrl.replace(/\/$/, '')
  return `${base}${path}`
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const settings = getSettings()
  if (!settings.apiKey) return { ok: false, message: '请先配置 API Key' }
  try {
    const res = await fetch(apiUrl(settings, '/chat/completions'), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: SYSTEM_PROMPTS.test }],
        max_tokens: 10
      })
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, message: `HTTP ${res.status}: ${txt.slice(0, 200)}` }
    }
    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content ?? ''
    return { ok: true, message: `连接成功，模型回复：${reply}` }
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
}

export async function classifySummary(summary: string): Promise<string> {
  const settings = getSettings()
  const prompt = `已有分类：${CATEGORIES.join('、')}\n工作描述：${summary}\n类型：`
  const res = await fetch(apiUrl(settings, '/chat/completions'), {
    method: 'POST',
    headers: authHeaders(settings),
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.classify },
        { role: 'user', content: prompt }
      ],
      max_tokens: 20,
      temperature: 0
    })
  })
  if (!res.ok) throw new Error(`分类失败: HTTP ${res.status}`)
  const data = await res.json()
  const reply: string = (data.choices?.[0]?.message?.content ?? '').trim()
  // 找到匹配的类别
  const found = CATEGORIES.find(c => reply.includes(c))
  return found ?? '其他'
}

export async function analyzeScreenshot(imageBase64: string, memoryContent?: string): Promise<{ category: string; summary: string }> {
  const settings = getSettings()
  if (!settings.apiKey) throw new Error('请先配置 API Key')
  const systemContent = memoryContent
    ? `${SYSTEM_PROMPTS.vision}\n\n个人工作记忆：\n${memoryContent}`
    : SYSTEM_PROMPTS.vision
  const res = await fetch(apiUrl(settings, '/chat/completions'), {
    method: 'POST',
    headers: authHeaders(settings),
    body: JSON.stringify({
      model: settings.visionModel,
      messages: [
        { role: 'system', content: systemContent },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张截图中的工作活动。' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    })
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`视觉识别失败: HTTP ${res.status} ${txt.slice(0, 500)}`)
  }
  const data = await res.json()
  console.log('[vision] 完整返回:', JSON.stringify(data).slice(0, 800))
  const msg = data.choices?.[0]?.message
  const reply: string = (msg?.content ?? msg?.reasoning_content ?? '').trim()
  console.log('[vision] AI 返回内容:', reply.slice(0, 300))

  // 多策略解析 JSON
  let parsed: { category?: string; summary?: string } | null = null

  // 策略 1：直接 parse
  try {
    parsed = JSON.parse(reply)
  } catch {}

  // 策略 2：提取 ```json 代码块
  if (!parsed) {
    const codeBlock = reply.match(/```json\s*([\s\S]*?)```/)
    if (codeBlock) {
      try { parsed = JSON.parse(codeBlock[1].trim()) } catch {}
    }
  }

  // 策略 3：用正则提取 JSON 对象（宽松匹配，兼容字段顺序不同）
  if (!parsed) {
    const jsonMatch = reply.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch {}
    }
  }

  if (parsed && parsed.category) {
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : '其他'
    const summary = String(parsed.summary ?? '').trim() || '当前屏幕无明确工作活动'
    return { category, summary }
  }

  // 兜底：如果 reply 有内容但不是标准 JSON，尝试用正则提取字段
  if (reply) {
    const sumMatch = reply.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    if (sumMatch && sumMatch[1]) {
      const extracted = sumMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()
      const catMatch = reply.match(/"category"\s*:\s*"([^"]*)"/)
      const category = catMatch && CATEGORIES.includes(catMatch[1]) ? catMatch[1] : classifyByKeywords(reply)
      return { category, summary: extracted || '当前屏幕无明确工作活动' }
    }
    // 确实不是 JSON，用关键词分类 + reply 当 summary（去掉可能的代码块标记）
    let cleanReply = reply
    if (cleanReply.startsWith('```')) cleanReply = cleanReply.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    return { category: classifyByKeywords(cleanReply), summary: cleanReply.slice(0, 200) }
  }

  // 最后兜底：reply 为空
  return { category: '生活', summary: '当前屏幕内容未能识别，请手动确认。' }
}

export interface GenerateReportInput {
  type: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate: string
  templateBody?: string
  customInstruction?: string
  memoryContent?: string
  records: Array<{ startedAt: string; summary: string; category?: string }>
  appUsageSummary?: Array<{ appName: string; durationMinutes: number }>
}

export async function generateReport(
  input: GenerateReportInput,
  onChunk: (chunk: string) => void,
  onDone: (full: string) => void,
  onError: (err: Error) => void
): Promise<void> {
  const settings = getSettings()
  if (!settings.apiKey) {
    onError(new Error('请先配置 API Key'))
    return
  }
  const typeLabel = input.type === 'daily' ? '日报' : input.type === 'weekly' ? '周报' : '月报'
  const lines: string[] = []
  lines.push(`【报告类型】${typeLabel}`)
  lines.push(`【日期范围】${input.startDate} 至 ${input.endDate}`)
  if (input.appUsageSummary && input.appUsageSummary.length > 0) {
    lines.push('【应用使用时长参考】')
    for (const a of input.appUsageSummary) {
      lines.push(`- ${a.appName}: ${a.durationMinutes} 分钟`)
    }
  }
  if (input.templateBody) {
    lines.push(`【报告模板】（仅作为排版格式参考，不要照抄内容）`)
    lines.push(input.templateBody)
  }
  if (input.customInstruction) {
    lines.push(`【自定义指令】${input.customInstruction}`)
  }
  if (input.memoryContent) {
    lines.push(`【个人工作记忆】${input.memoryContent}`)
  }
  lines.push(`【工作记录】`)
  for (const r of input.records) {
    const cat = r.category ? `[${r.category}]` : ''
    lines.push(`- ${r.startedAt} ${cat} ${r.summary}`)
  }
  lines.push('')
  lines.push(`请基于以上工作记录生成一篇中文${typeLabel}。请使用中文生成整篇报告。直接输出报告正文，按 Markdown 格式。`)

  const userPrompt = lines.join('\n')

  try {
    const res = await fetch(apiUrl(settings, '/chat/completions'), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.report },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: 0.7
      })
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`生成失败: HTTP ${res.status} ${txt.slice(0, 200)}`)
    }
    if (!res.body) throw new Error('无响应流')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const eventLines = buffer.split('\n')
      buffer = eventLines.pop() ?? ''
      for (const line of eventLines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            onChunk(delta)
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    onDone(full)
  } catch (e) {
    onError(e as Error)
  }
}

export async function generateTemplate(
  reference: string,
  requirements: string,
  type: 'daily' | 'weekly' | 'monthly',
  onChunk: (chunk: string) => void,
  onDone: (full: string) => void,
  onError: (err: Error) => void
): Promise<void> {
  const settings = getSettings()
  if (!settings.apiKey) {
    onError(new Error('请先配置 API Key'))
    return
  }
  const typeLabel = type === 'daily' ? '日报' : type === 'weekly' ? '周报' : '月报'
  const userPrompt = `参考报告：\n${reference || '无'}\n\n自定义需求：\n${requirements || '无'}\n\n我要你给我生成一份${typeLabel}模板。`
  try {
    const res = await fetch(apiUrl(settings, '/chat/completions'), {
      method: 'POST',
      headers: authHeaders(settings),
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.template },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: 0.5
      })
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`模板生成失败: HTTP ${res.status} ${txt.slice(0, 200)}`)
    }
    if (!res.body) throw new Error('无响应流')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const eventLines = buffer.split('\n')
      buffer = eventLines.pop() ?? ''
      for (const line of eventLines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            onChunk(delta)
          }
        } catch {
          // ignore
        }
      }
    }
    onDone(full)
  } catch (e) {
    onError(e as Error)
  }
}

// 通知渲染进程
export function emitToRenderer(channel: string, ...args: unknown[]) {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}
