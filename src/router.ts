import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/today' },
    { path: '/today', name: 'today', component: () => import('@/views/Today.vue'), meta: { title: '今日工作' } },
    { path: '/generate', name: 'generate', component: () => import('@/views/Reports.vue'), meta: { title: '生成报告' } },
    { path: '/timeline', name: 'timeline', component: () => import('@/views/Timeline.vue'), meta: { title: '工作时间线' } },
    { path: '/heatmap', name: 'heatmap', component: () => import('@/views/Heatmap.vue'), meta: { title: '时段热力图' } },
    { path: '/app-usage', name: 'app-usage', component: () => import('@/views/AppUsage.vue'), meta: { title: '应用记录' } },
    { path: '/history', name: 'history', component: () => import('@/views/ReportHistory.vue'), meta: { title: '历史报告' } },
<<<<<<< HEAD
    { path: '/agent', name: 'agent', component: () => import('@/views/Agent.vue'), meta: { title: 'Agent' } },
    { path: '/records', name: 'records', component: () => import('@/views/WorkRecords.vue'), meta: { title: '工作记录' } },
    { path: '/templates', name: 'templates', component: () => import('@/views/ReportTemplates.vue'), meta: { title: '模板' } },
    { path: '/subscription', name: 'subscription', component: () => import('@/views/Subscription.vue'), meta: { title: '订阅' } },
    { path: '/invite', name: 'invite', component: () => import('@/views/Invite.vue'), meta: { title: '邀请有礼' } },
    { path: '/privacy', name: 'privacy', component: () => import('@/views/Privacy.vue'), meta: { title: '隐私保护' } },
    { path: '/help', name: 'help', component: () => import('@/views/Help.vue'), meta: { title: '帮助' } },
=======
    { path: '/agent', name: 'agent', component: () => import('@/views/Agent.vue'), meta: { title: '接入 Agent' } },
    { path: '/records', name: 'records', component: () => import('@/views/WorkRecords.vue'), meta: { title: '工作记录' } },
    { path: '/templates', name: 'templates', component: () => import('@/views/ReportTemplates.vue'), meta: { title: '模板' } },
>>>>>>> b49573f6224ac59a40f76a658d30cf27cdcad869
    { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue'), meta: { title: '设置' } }
  ]
})

export default router
