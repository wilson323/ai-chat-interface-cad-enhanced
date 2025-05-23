interface SecurityConfig {
  csp: string
  permissionsPolicy: string
  featurePolicy: string
}

export const getSecurityConfig = (isProd: boolean): SecurityConfig => ({
  csp: isProd ? 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.trusted-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;" :
    "default-src * 'unsafe-inline' 'unsafe-eval'; script-src *; style-src * 'unsafe-inline';",
  
  permissionsPolicy: "camera=(), microphone=(), geolocation=()",
  featurePolicy: "vibrate 'none'; fullscreen 'self'"
}) 