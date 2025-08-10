/**
 * Kiro Hooks 系统入口文件
 * 
 * 导出所有钩子和管理器，提供统一的使用接口
 */

// 导出核心组件
export { BaseHook } from './core/base-hook.js';
export { HookManagerImpl, hookManager } from './core/hook-manager.js';
export { MCPToolsManager, mcpToolsManager } from './core/mcp-tools-manager.js';

// 导出类型定义
export * from './types/index.js';

// 导出合规检查组件
export { ComplianceChecker } from './compliance/compliance-checker.js';
export { TestingSecurityChecker } from './compliance/testing-security-checker.js';
export { ProjectStandardsComplianceHook as ProjectStandardsComplianceHookImpl } from './compliance/project-standards-compliance-hook.js';

// 导出质量保证组件
export { QualityAssuranceEngine } from './quality-assurance/quality-assurance-engine.js';
export { QualityMetrics } from './quality-assurance/quality-metrics.js';
export { WorkQualityAssuranceHook } from './quality-assurance/work-quality-assurance-hook.js';

// 导出钩子注册函数
import { hookManager } from './core/hook-manager.js';
import { ProjectStandardsComplianceHook as ProjectStandardsComplianceHookImpl } from './compliance/project-standards-compliance-hook.js';
import { WorkQualityAssuranceHook } from './quality-assurance/work-quality-assurance-hook.js';

/**
 * 注册所有 Kiro Action Hooks
 */
export function registerKiroActionHooks(): void {
  console.log('🔗 注册 Kiro Action Hooks...');

  try {
    // 注册项目标准合规检查钩子
    const complianceHook = new ProjectStandardsComplianceHookImpl();
    hookManager.registerHook(complianceHook);
    console.log(`✅ 已注册: ${complianceHook.name}`);

    // 注册工作质量保证钩子
    const qualityAssuranceHook = new WorkQualityAssuranceHook();
    hookManager.registerHook(qualityAssuranceHook);
    console.log(`✅ 已注册: ${qualityAssuranceHook.name}`);

    console.log('🎉 所有 Kiro Action Hooks 注册完成');

  } catch (error) {
    console.error('❌ 钩子注册失败:', error);
    throw error;
  }
}

/**
 * 初始化 Kiro Hooks 系统
 */
export async function initializeKiroHooks(): Promise<void> {
  console.log('🚀 初始化 Kiro Hooks 系统...');

  try {
    // 注册所有钩子
    registerKiroActionHooks();

    // 验证钩子状态
    const hooks = hookManager.listHooks();
    console.log(`📊 已注册 ${hooks.length} 个钩子:`);
    
    hooks.forEach(hook => {
      const status = hookManager.getHookStatus(hook.id);
      console.log(`  - ${hook.name} (${hook.id}): ${status}`);
    });

    console.log('✅ Kiro Hooks 系统初始化完成');

  } catch (error) {
    console.error('❌ Kiro Hooks 系统初始化失败:', error);
    throw error;
  }
}

/**
 * 清理 Kiro Hooks 系统
 */
export async function cleanupKiroHooks(): Promise<void> {
  console.log('🧹 清理 Kiro Hooks 系统...');

  try {
    // 获取所有钩子
    const hooks = hookManager.listHooks();

    // 注销所有钩子
    for (const hook of hooks) {
      hookManager.unregisterHook(hook.id);
      console.log(`🗑️ 已注销: ${hook.name}`);
    }

    // 清理 MCP 工具管理器
    // mcpToolsManager.cleanup(); // 暂时注释，等待修复导入问题

    console.log('✅ Kiro Hooks 系统清理完成');

  } catch (error) {
    console.error('❌ Kiro Hooks 系统清理失败:', error);
    throw error;
  }
}