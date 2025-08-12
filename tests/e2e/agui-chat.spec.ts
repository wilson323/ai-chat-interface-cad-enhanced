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

// 外部厂商通路（DashScope OpenAI兼容）流式用例
// 需配置 EXTERNAL_AI_API_KEY，否则跳过
import { performance } from 'perf_hooks'

test('ag-ui chat streaming via external provider (dashscope compatible)', async ({ request }) => {
  test.skip(!process.env.EXTERNAL_AI_API_KEY, 'EXTERNAL_AI_API_KEY 未配置，跳过外部厂商通路流式用例')

  const start = performance.now()
  const res = await request.post('/api/ag-ui/chat', {
    data: {
      appId: 'qwen-plus-2025-01-12',
      provider: 'dashscope',
      model: 'qwen-plus-2025-01-12',
      messages: [{ role: 'user', content: '请用一句话自我介绍' }],
      streamConfig: { typewriterSpeed: 0 },
    },
  })

  expect(res.status()).toBe(200)
  const contentType = res.headers()['content-type'] || ''
  expect(contentType.includes('text/event-stream')).toBeTruthy()

  const firstChunkLatencyMs = performance.now() - start
  // 首块SSE返回应在5s内（网络环境差可适当放宽）
  expect(firstChunkLatencyMs).toBeLessThan(5000)

  // 读取一小段流文本验证数据返回（不校验具体事件内容，避免耦合）
  const text = await res.text()
  expect(text.length).toBeGreaterThan(0)
})
