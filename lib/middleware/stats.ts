export type MiddlewareStats = {
  requestCount: number
  errorCount: number
  errorRate: number
  startTime: number
}

const stats: MiddlewareStats = {
  requestCount: 0,
  errorCount: 0,
  errorRate: 0,
  startTime: Date.now(),
}

export function recordRequest(): void {
  stats.requestCount++
  recompute()
}

export function recordError(): void {
  stats.errorCount++
  recompute()
}

function recompute(): void {
  const { requestCount, errorCount } = stats
  stats.errorRate = requestCount > 0 ? errorCount / requestCount : 0
}

export function getMiddlewareStats(): MiddlewareStats {
  return { ...stats }
}
