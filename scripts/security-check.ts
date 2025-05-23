import { getSecurityConfig } from "@/config/security"

function validateProdSecurity() {
  const config = getSecurityConfig(true)
  
  if (config.csp.includes('unsafe-eval')) {
    console.warn('生产环境CSP包含unsafe-eval，建议移除！')
  }
  
  // 添加更多安全检查...
}

validateProdSecurity() 