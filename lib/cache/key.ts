export const DEFAULT_CACHE_NAMESPACE: string = `${process.env.CACHE_KEY_PREFIX ?? 'acx:'}cache:`

export const buildCacheKey = (scope: string, key: string): string => {
  const safeScope = String(scope ?? 'app').trim()
  const safeKey = String(key ?? '').trim()
  return `${safeScope}:${safeKey}`
}

export const buildFullCacheKey = (scope: string, key: string): string => {
  return `${DEFAULT_CACHE_NAMESPACE}${buildCacheKey(scope, key)}`
}
