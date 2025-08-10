/**
 * Kiro Action Hooks 使用示例
 * 
 * 演示如何使用开发工作流程增强钩子和项目标准合规检查钩子
 */

import {
  initializeKiroHooks,
  cleanupKiroHooks,
  hookManager,
  HookContext,
  HookEvent
} from './index.js';

/**
 * 示例：文件编辑时触发工作流程增强钩子
 */
async function exampleFileEditTrigger(): Promise<void> {
  console.log('\n=== 示例：文件编辑触发工作流程增强 ===');

  const context: HookContext = {
    event: 'file.edit' as HookEvent,
    files: [
      'src/components/ChatInterface.tsx',
      'src/lib/api/fastgpt-client.ts',
      'tests/components/ChatInterface.test.tsx'
    ],
    metadata: {
      editor: 'vscode',
      branch: 'feature/chat-enhancement'
    },
    timestamp: new Date(),
    userId: 'developer-001',
    workingDirectory: process.cwd(),
    gitInfo: {
      branch: 'feature/chat-enhancement',
      author: 'Developer'
    }
  };

  try {
    console.log('📝 模拟文件编辑事件...');
    const results = await hookManager.executeHooksForEvent('file.edit', context);

    results.forEach((result, index) => {
      console.log(`\n钩子 ${index + 1} 执行结果:`);
      console.log(`  成功: ${result.success}`);
      console.log(`  消息: ${result.message}`);
      console.log(`  执行时间: ${result.executionTime}ms`);
      
      if (result.data?.recommendations) {
        console.log('  建议:');
        result.data.recommendations.forEach((rec: string) => {
          console.log(`    - ${rec}`);
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log('  错误:');
        result.errors.forEach(error => {
          console.log(`    - ${error}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ 文件编辑钩子执行失败:', error);
  }
}

/**
 * 示例：Git提交前触发合规检查钩子
 */
async function exampleGitCommitTrigger(): Promise<void> {
  console.log('\n=== 示例：Git提交前合规检查 ===');

  const context: HookContext = {
    event: 'git.beforeCommit' as HookEvent,
    files: [
      'src/components/ChatInterface.tsx',
      'src/lib/api/fastgpt-client.ts',
      'src/utils/validation.py',
      'tests/components/ChatInterface.test.tsx',
      'tests/lib/api/fastgpt-client.test.ts',
      'README.md',
      'package.json'
    ],
    metadata: {
      commitMessage: 'feat: enhance chat interface with new validation',
      stagedFiles: 7,
      branch: 'feature/chat-enhancement'
    },
    timestamp: new Date(),
    userId: 'developer-001',
    workingDirectory: process.cwd(),
    gitInfo: {
      branch: 'feature/chat-enhancement',
      author: 'Developer'
    }
  };

  try {
    console.log('📋 模拟Git提交前检查...');
    const results = await hookManager.executeHooksForEvent('git.beforeCommit', context);

    results.forEach((result, index) => {
      console.log(`\n钩子 ${index + 1} 执行结果:`);
      console.log(`  成功: ${result.success}`);
      console.log(`  消息: ${result.message}`);
      console.log(`  执行时间: ${result.executionTime}ms`);

      if (result.data?.summary) {
        const summary = result.data.summary;
        console.log('  合规检查摘要:');
        console.log(`    总检查项: ${summary.totalChecks}`);
        console.log(`    通过检查: ${summary.passedChecks}`);
        console.log(`    总问题数: ${summary.totalIssues}`);
        console.log(`    严重问题: ${summary.criticalIssues}`);
        console.log(`    高危问题: ${summary.highIssues}`);
        console.log(`    平均评分: ${summary.averageScore}/100`);
      }

      if (result.data?.recommendations) {
        console.log('  修复建议:');
        result.data.recommendations.forEach((rec: string) => {
          console.log(`    - ${rec}`);
        });
      }

      if (!result.success && result.errors) {
        console.log('  阻塞问题:');
        result.errors.forEach(error => {
          console.log(`    ❌ ${error}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Git提交前钩子执行失败:', error);
  }
}

/**
 * 示例：查看钩子统计信息
 */
function exampleHookStats(): void {
  console.log('\n=== 钩子统计信息 ===');

  const hooks = hookManager.listHooks();
  
  hooks.forEach(hook => {
    console.log(`\n钩子: ${hook.name} (${hook.id})`);
    console.log(`  描述: ${hook.description}`);
    console.log(`  版本: ${hook.version}`);
    console.log(`  状态: ${hookManager.getHookStatus(hook.id)}`);
    
    try {
      const stats = (hookManager as any).getHookStats(hook.id);
      console.log(`  执行次数: ${stats.executionCount}`);
      console.log(`  成功次数: ${stats.successCount}`);
      console.log(`  失败次数: ${stats.failureCount}`);
      console.log(`  成功率: ${stats.successRate}%`);
      if (stats.lastExecutedAt) {
        console.log(`  最后执行: ${stats.lastExecutedAt.toLocaleString()}`);
      }
    } catch (error) {
      console.log('  统计信息不可用');
    }

    console.log('  触发器:');
    hook.triggers.forEach(trigger => {
      console.log(`    事件: ${trigger.event}`);
      console.log(`    模式: ${trigger.patterns.join(', ')}`);
    });
  });
}

/**
 * 主函数：运行所有示例
 */
async function runExamples(): Promise<void> {
  console.log('🎯 Kiro Action Hooks 使用示例');
  console.log('=====================================');

  try {
    // 初始化钩子系统
    await initializeKiroHooks();

    // 运行示例
    await exampleFileEditTrigger();
    await exampleGitCommitTrigger();
    exampleHookStats();

  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  } finally {
    // 清理钩子系统
    await cleanupKiroHooks();
    console.log('\n🏁 示例运行完成');
  }
}

// 如果直接运行此文件，则执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  exampleFileEditTrigger,
  exampleGitCommitTrigger,
  exampleHookStats,
  runExamples
};