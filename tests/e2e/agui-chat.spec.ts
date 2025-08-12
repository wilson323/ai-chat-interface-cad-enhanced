import { test, expect } from '@playwright/test'

// 基础流式对话用例（内部通路，需 FASTGPT_API_KEY）
test('ag-ui chat streaming basic (internal)', async ({ request }) => {
  test.skip(!process.env.FASTGPT_API_KEY, 'FASTGPT_API_KEY 未配置，跳过内部通路流式用例')
  const res = await request.post('/api/ag-ui/chat', {
    data: {
      appId: process.env.FASTGPT_APP_ID || 'demo-app-id',
      messages: [{ role: 'user', content: 'ping' }]
      // 不传 provider -> 使用内部 FastGPT 通路
    },
  })
  expect(res.status()).toBe(200)
  const contentType = res.headers()['content-type'] || ''
  expect(contentType.includes('text/event-stream')).toBeTruthy()
})

// 错误事件用例：传入非法 body 触发 400
 test('ag-ui chat invalid request emits 400', async ({ request }) => {
  const res = await request.post('/api/ag-ui/chat', {
    data: {
      // 缺少 appId 与 messages
      provider: 'dashscope'
    },
  })
  expect([400, 422]).toContain(res.status())
  const json = await res.json().catch(() => ({} as any))
  expect(json.error).toBeDefined()
})
