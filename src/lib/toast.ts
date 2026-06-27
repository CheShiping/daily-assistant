// 轻量 toast 提示器 · 基于 Quasar Notify
// 特点：背景与文字色严格跟随状态（success/error/warning/info），
//       覆盖 Quasar 默认的 positive/negative 等白底深字预设
// 用法：
//   import { toast } from '@/lib/toast'
//   toast.success('保存成功')
//   toast.error('网络异常')

import { Notify } from 'quasar'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  message: string
  type?: ToastType
  /** 停留毫秒，默认 2400 */
  timeout?: number
  position?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'center'
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
  /** caption 行（第二行说明） */
  caption?: string
  /** 是否可点击关闭 */
  closeBtn?: boolean
}

// 每种状态的色卡：bg 柔和背景 + fg 深色文字 + accent 图标/进度条
const colorMap: Record<ToastType, { icon: string; bg: string; fg: string; accent: string; border: string }> = {
  success: {
    icon: 'check_circle',
    bg: 'hsl(142 55% 96%)',
    fg: 'hsl(142 60% 22%)',
    accent: 'hsl(142 60% 42%)',
    border: 'hsl(142 40% 80%)'
  },
  error: {
    icon: 'error',
    bg: 'hsl(16 80% 96%)',
    fg: 'hsl(16 75% 32%)',
    accent: 'hsl(16 70% 50%)',
    border: 'hsl(16 50% 84%)'
  },
  warning: {
    icon: 'warning',
    bg: 'hsl(38 92% 94%)',
    fg: 'hsl(28 80% 28%)',
    accent: 'hsl(28 80% 45%)',
    border: 'hsl(38 70% 82%)'
  },
  info: {
    icon: 'info',
    bg: 'hsl(204 90% 95%)',
    fg: 'hsl(204 70% 26%)',
    accent: 'hsl(204 70% 45%)',
    border: 'hsl(204 60% 82%)'
  }
}

function show(opts: ToastOptions) {
  const type: ToastType = opts.type ?? 'info'
  const c = colorMap[type]
  Notify.create({
    message: opts.message,
    caption: opts.caption,
    // 关键：不用 type（避免 Quasar 内置预设的 bg-positive 覆盖），
    // 直接用 color 传 HSL 背景色 + textColor 传 HSL 文字色
    color: c.bg,
    textColor: c.fg,
    icon: c.icon,
    iconColor: c.accent,
    timeout: opts.timeout ?? 2400,
    position: opts.position ?? 'top',
    progressClass: 'ya-toast-progress',
    classes: `ya-toast ya-toast-${type}`,
    actions: opts.closeBtn
      ? [{ icon: 'close', color: c.fg, round: true, size: 'sm' }]
      : undefined,
    html: false
  })
}

export const toast = {
  success: (msg: string, opts?: Partial<ToastOptions>) => show({ message: msg, type: 'success', ...opts }),
  error: (msg: string, opts?: Partial<ToastOptions>) => show({ message: msg, type: 'error', ...opts }),
  warning: (msg: string, opts?: Partial<ToastOptions>) => show({ message: msg, type: 'warning', ...opts }),
  info: (msg: string, opts?: Partial<ToastOptions>) => show({ message: msg, type: 'info', ...opts })
}
