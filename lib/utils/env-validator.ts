/**
 * 环境验证和依赖兼容性检查模块
 * Environment Validator & Dependency Compatibility Checker
 */

interface DependencyCheck {
  name: string;
  expectedVersion: string;
  actualVersion?: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}

interface EnvironmentValidationResult {
  isValid: boolean;
  checks: DependencyCheck[];
  errors: string[];
  warnings: string[];
}

/**
 * 检查关键依赖版本
 */
export function validateCriticalDependencies(): EnvironmentValidationResult {
  const checks: DependencyCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查React版本兼容性
  try {
    // 使用可选的动态 import 风格以规避 require 限制
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = (global as any).__react || (await (async () => null)());
    const reactPkg = (() => {
      try { return require('react'); } catch { return null as any }
    })();
    const reactVersion = reactPkg?.version ?? 'unknown';
    checks.push({
      name: 'React',
      expectedVersion: '18.3.1',
      actualVersion: reactVersion,
      status: reactVersion.startsWith('18.3') ? 'ok' : 'error',
      message: reactVersion.startsWith('18.3') ? 'Version compatible' : 'Version mismatch'
    });
    
    if (!reactVersion.startsWith('18.3')) {
      errors.push(`React version mismatch: expected 18.3.x, got ${reactVersion}`);
    }
  } catch (error) {
    errors.push('React not found or failed to load');
    checks.push({
      name: 'React',
      expectedVersion: '18.3.1',
      status: 'error',
      message: 'Module not found'
    });
  }

  // 检查Three.js版本兼容性
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const THREE = (() => { try { return require('three') } catch { return {} as any } })();
    const threeVersion = THREE.REVISION ? `0.${THREE.REVISION}.0` : 'unknown';
    const isCompatible = THREE.REVISION === 149;
    
    checks.push({
      name: 'Three.js',
      expectedVersion: '0.149.0',
      actualVersion: threeVersion,
      status: isCompatible ? 'ok' : 'error',
      message: isCompatible ? 'Version compatible' : 'Version incompatible with web-ifc-three'
    });
    
    if (!isCompatible) {
      errors.push(`Three.js version incompatible: expected r149, got r${THREE.REVISION}`);
    }
  } catch (error) {
    errors.push('Three.js not found or failed to load');
    checks.push({
      name: 'Three.js',
      expectedVersion: '0.149.0',
      status: 'error',
      message: 'Module not found'
    });
  }

  // 检查Next.js版本兼容性
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nextPackage = (() => { try { return require('next/package.json') } catch { return { version: 'unknown' } } })();
    const nextVersion = nextPackage.version;
    const isCompatible = nextVersion.startsWith('15.3');
    
    checks.push({
      name: 'Next.js',
      expectedVersion: '15.3.2',
      actualVersion: nextVersion,
      status: isCompatible ? 'ok' : 'warning',
      message: isCompatible ? 'Version compatible' : 'Minor version difference'
    });
    
    if (!isCompatible) {
      warnings.push(`Next.js version difference: expected 15.3.x, got ${nextVersion}`);
    }
  } catch (error) {
    errors.push('Next.js not found or failed to load');
    checks.push({
      name: 'Next.js',
      expectedVersion: '15.3.2',
      status: 'error',
      message: 'Module not found'
    });
  }

  // 检查UUID模块
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { v4 } = (() => { try { return require('uuid') } catch { return {} as any } })();
    if (typeof v4 === 'function') {
      checks.push({
        name: 'UUID',
        expectedVersion: '9.0.1',
        status: 'ok',
        message: 'Module available'
      });
    } else {
      throw new Error('UUID v4 function not available');
    }
  } catch (error) {
    errors.push('UUID module not available');
    checks.push({
      name: 'UUID',
      expectedVersion: '9.0.1',
      status: 'error',
      message: 'Module not found or malformed'
    });
  }

  // 检查CAD相关依赖
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const okIfc = (() => { try { return require('web-ifc') } catch { return null } })();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const okIfcThree = (() => { try { return require('web-ifc-three') } catch { return null } })();
    if (!okIfc || !okIfcThree) { throw new Error('cad deps missing') }
    checks.push({
      name: 'CAD Dependencies',
      expectedVersion: 'web-ifc@0.0.46, web-ifc-three@0.0.125',
      status: 'ok',
      message: 'CAD modules available'
    });
  } catch (error) {
    errors.push('CAD dependencies not available');
    checks.push({
      name: 'CAD Dependencies',
      expectedVersion: 'web-ifc@0.0.46, web-ifc-three@0.0.125',
      status: 'error',
      message: 'CAD modules not found'
    });
  }

  return {
    isValid: errors.length === 0,
    checks,
    errors,
    warnings
  };
}

/**
 * 初始化CAD依赖兼容性检查
 */
export function initializeCADCompatibility(): void {
  try {
    // 检查Three.js和web-ifc-three兼容性
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const THREE = (() => { try { return require('three') } catch { return {} as any } })();
    if (THREE.REVISION !== 149) {
      console.warn('⚠️ Three.js版本警告: 当前版本可能与CAD解析器不兼容');
    }

    // 检查WebIFC可用性
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WebIFC = (() => { try { return require('web-ifc') } catch { return {} as any } })();
    if (typeof WebIFC.IfcAPI !== 'function') {
      throw new Error('WebIFC API不可用');
    }

    console.log('✅ CAD依赖兼容性检查通过');
  } catch (error) {
    console.error('❌ CAD依赖兼容性检查失败:', error);
    throw new Error('CAD环境初始化失败，请检查依赖安装');
  }
}

/**
 * 运行时环境检查
 */
export function runtimeEnvironmentCheck(): boolean {
  try {
    // 检查浏览器环境
    if (typeof window !== 'undefined') {
      // WebGL支持检查
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('⚠️ WebGL不支持，3D功能可能无法正常工作');
        return false;
      }

      // 检查Web Workers支持
      if (typeof Worker === 'undefined') {
        console.warn('⚠️ Web Workers不支持，性能可能受影响');
      }
    }

    // 检查Node.js环境
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const nodeVersion = process.versions.node;
      const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
      if (majorVersion < 18) {
        console.error('❌ Node.js版本过低，要求18.0.0或更高版本');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ 运行时环境检查失败:', error);
    return false;
  }
}

/**
 * 生成环境报告
 */
export function generateEnvironmentReport(): string {
  const validation = validateCriticalDependencies();
  const runtimeOk = runtimeEnvironmentCheck();

  let report = '=== AI Chat Interface 环境报告 ===\n\n';
  
  report += `整体状态: ${validation.isValid && runtimeOk ? '✅ 正常' : '❌ 异常'}\n\n`;
  
  report += '=== 依赖检查 ===\n';
  validation.checks.forEach(check => {
    const status = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    report += `${status} ${check.name}: ${check.actualVersion || 'N/A'} (期望: ${check.expectedVersion})\n`;
    if (check.message) {
      report += `   ${check.message}\n`;
    }
  });

  if (validation.errors.length > 0) {
    report += '\n=== 错误 ===\n';
    validation.errors.forEach(error => {
      report += `❌ ${error}\n`;
    });
  }

  if (validation.warnings.length > 0) {
    report += '\n=== 警告 ===\n';
    validation.warnings.forEach(warning => {
      report += `⚠️ ${warning}\n`;
    });
  }

  report += `\n=== 运行时环境 ===\n`;
  report += `浏览器兼容性: ${runtimeOk ? '✅ 支持' : '❌ 不支持'}\n`;

  return report;
} 