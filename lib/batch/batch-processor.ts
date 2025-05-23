/**
 * 智能批处理系统 - 合并相似请求以减少API调用
 * Smart Batch Processing System - Merge similar requests to reduce API calls
 */
import { getFastGPTOptimizer, RequestPriority } from "../api/fastgpt-optimizer"
import { getCacheManager } from "../cache/cache-manager"
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

// 批处理任务状态
export type BatchTaskStatus = 
  | 'pending'   // 等待中
  | 'running'   // 运行中
  | 'completed' // 已完成
  | 'failed'    // 失败
  | 'canceled'  // 已取消
  | 'paused';   // 已暂停

// 单个批处理任务
export interface BatchTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  result?: R;
  error?: string;
  status: BatchTaskStatus;
  progress: number;
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  maxAttempts: number;
  retryDelay: number;
  metadata?: Record<string, any>;
}

// 批处理作业
export interface BatchJob<T = any, R = any> {
  id: string;
  name: string;
  description?: string;
  tasks: BatchTask<T, R>[];
  status: BatchTaskStatus;
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  concurrency: number;
  metadata?: Record<string, any>;
}

// 批处理器配置
export interface BatchProcessorConfig {
  maxConcurrentJobs: number;
  maxConcurrentTasksPerJob: number;
  defaultPriority: number;
  defaultMaxAttempts: number;
  defaultRetryDelay: number;
}

// 默认配置
const DEFAULT_CONFIG: BatchProcessorConfig = {
  maxConcurrentJobs: 3,
  maxConcurrentTasksPerJob: 5,
  defaultPriority: 1,
  defaultMaxAttempts: 3,
  defaultRetryDelay: 5000, // 5秒
};

// 处理器函数
export type BatchTaskProcessor<T = any, R = any> = (
  task: BatchTask<T, R>,
  updateProgress: (progress: number) => void
) => Promise<R>;

// 批处理事件
export type BatchEvent = 
  | { type: 'job:created', jobId: string }
  | { type: 'job:started', jobId: string }
  | { type: 'job:completed', jobId: string }
  | { type: 'job:failed', jobId: string, error: string }
  | { type: 'job:canceled', jobId: string }
  | { type: 'job:paused', jobId: string }
  | { type: 'job:resumed', jobId: string }
  | { type: 'task:started', jobId: string, taskId: string }
  | { type: 'task:completed', jobId: string, taskId: string, result: any }
  | { type: 'task:failed', jobId: string, taskId: string, error: string }
  | { type: 'task:retrying', jobId: string, taskId: string, attempt: number }
  | { type: 'task:progress', jobId: string, taskId: string, progress: number };

export class BatchProcessor {
  private static instance: BatchProcessor;
  private config: BatchProcessorConfig;
  private jobs: Record<string, BatchJob> = {};
  private processors: Record<string, BatchTaskProcessor> = {};
  private runningJobs: Set<string> = new Set();
  private runningTasks: Map<string, Set<string>> = new Map();
  private jobsSubject = new BehaviorSubject<Record<string, BatchJob>>({});
  private eventsSubject = new Subject<BatchEvent>();
  private stopped = false;
  
  private constructor(config: Partial<BatchProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  public static getInstance(config?: Partial<BatchProcessorConfig>): BatchProcessor {
    if (!BatchProcessor.instance) {
      BatchProcessor.instance = new BatchProcessor(config);
    } else if (config) {
      // 更新配置
      BatchProcessor.instance.updateConfig(config);
    }
    return BatchProcessor.instance;
  }
  
  // 更新配置
  public updateConfig(config: Partial<BatchProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  // 注册任务处理器
  public registerProcessor<T = any, R = any>(
    taskType: string,
    processor: BatchTaskProcessor<T, R>
  ): void {
    this.processors[taskType] = processor as BatchTaskProcessor;
  }
  
  // 创建批处理作业
  public createJob<T = any, R = any>(
    name: string,
    tasks: Array<{ type: string; data: T; priority?: number; metadata?: Record<string, any> }>,
    options: {
      description?: string;
      concurrency?: number;
      metadata?: Record<string, any>;
    } = {}
  ): string {
    const jobId = uuidv4();
    const now = Date.now();
    
    // 创建批处理任务
    const batchTasks: BatchTask<T, R>[] = tasks.map(task => ({
      id: uuidv4(),
      type: task.type,
      data: task.data,
      status: 'pending',
      progress: 0,
      priority: task.priority || this.config.defaultPriority,
      createdAt: now,
      attempts: 0,
      maxAttempts: this.config.defaultMaxAttempts,
      retryDelay: this.config.defaultRetryDelay,
      metadata: task.metadata
    }));
    
    // 创建批处理作业
    const job: BatchJob<T, R> = {
      id: jobId,
      name,
      description: options.description,
      tasks: batchTasks,
      status: 'pending',
      progress: 0,
      createdAt: now,
      concurrency: options.concurrency || this.config.maxConcurrentTasksPerJob,
      metadata: options.metadata
    };
    
    // 保存作业
    this.jobs[jobId] = job;
    this.runningTasks.set(jobId, new Set());
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 触发事件
    this.eventsSubject.next({
      type: 'job:created',
      jobId
    });
    
    // 如果处理器未停止，自动启动作业
    if (!this.stopped && this.runningJobs.size < this.config.maxConcurrentJobs) {
      this.startJob(jobId);
    }
    
    return jobId;
  }
  
  // 启动作业
  public startJob(jobId: string): boolean {
    const job = this.jobs[jobId];
    if (!job || job.status !== 'pending' && job.status !== 'paused') {
      return false;
    }
    
    // 如果已经达到最大并发作业数，不启动
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      return false;
    }
    
    // 更新作业状态
    job.status = 'running';
    job.startedAt = Date.now();
    this.runningJobs.add(jobId);
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 触发事件
    this.eventsSubject.next({
      type: 'job:started',
      jobId
    });
    
    // 开始处理任务
    this.processTasks(jobId);
    
    return true;
  }
  
  // 暂停作业
  public pauseJob(jobId: string): boolean {
    const job = this.jobs[jobId];
    if (!job || job.status !== 'running') {
      return false;
    }
    
    // 更新作业状态
    job.status = 'paused';
    this.runningJobs.delete(jobId);
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 触发事件
    this.eventsSubject.next({
      type: 'job:paused',
      jobId
    });
    
    return true;
  }
  
  // 恢复作业
  public resumeJob(jobId: string): boolean {
    const job = this.jobs[jobId];
    if (!job || job.status !== 'paused') {
      return false;
    }
    
    // 如果已经达到最大并发作业数，不恢复
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      return false;
    }
    
    // 更新作业状态
    job.status = 'running';
    this.runningJobs.add(jobId);
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 触发事件
    this.eventsSubject.next({
      type: 'job:resumed',
      jobId
    });
    
    // 继续处理任务
    this.processTasks(jobId);
    
    return true;
  }
  
  // 取消作业
  public cancelJob(jobId: string): boolean {
    const job = this.jobs[jobId];
    if (!job || job.status === 'completed' || job.status === 'canceled') {
      return false;
    }
    
    // 更新作业状态
    job.status = 'canceled';
    this.runningJobs.delete(jobId);
    
    // 更新所有未完成任务的状态
    job.tasks.forEach(task => {
      if (task.status === 'pending' || task.status === 'running') {
        task.status = 'canceled';
      }
    });
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 触发事件
    this.eventsSubject.next({
      type: 'job:canceled',
      jobId
    });
    
    // 检查是否有等待的作业可以启动
    this.checkPendingJobs();
    
    return true;
  }
  
  // 删除作业
  public deleteJob(jobId: string): boolean {
    const job = this.jobs[jobId];
    if (!job || job.status === 'running') {
      return false;
    }
    
    // 删除作业
    delete this.jobs[jobId];
    this.runningTasks.delete(jobId);
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    return true;
  }
  
  // 获取作业
  public getJob<T = any, R = any>(jobId: string): BatchJob<T, R> | null {
    return this.jobs[jobId] as BatchJob<T, R> || null;
  }
  
  // 获取所有作业
  public getJobs(): Record<string, BatchJob> {
    return { ...this.jobs };
  }
  
  // 获取作业流
  public getJobsStream(): Observable<Record<string, BatchJob>> {
    return this.jobsSubject.asObservable();
  }
  
  // 获取事件流
  public getEventsStream(): Observable<BatchEvent> {
    return this.eventsSubject.asObservable();
  }
  
  // 停止批处理器
  public stop(): void {
    this.stopped = true;
  }
  
  // 启动批处理器
  public start(): void {
    this.stopped = false;
    this.checkPendingJobs();
  }
  
  // 获取作业进度汇总
  public getJobSummary(jobId: string): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
    runningTasks: number;
    progress: number;
  } {
    const job = this.jobs[jobId];
    if (!job) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        runningTasks: 0,
        progress: 0
      };
    }
    
    const totalTasks = job.tasks.length;
    const completedTasks = job.tasks.filter(t => t.status === 'completed').length;
    const failedTasks = job.tasks.filter(t => t.status === 'failed').length;
    const pendingTasks = job.tasks.filter(t => t.status === 'pending').length;
    const runningTasks = job.tasks.filter(t => t.status === 'running').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      failedTasks,
      pendingTasks,
      runningTasks,
      progress
    };
  }
  
  // 处理任务
  private async processTasks(jobId: string): Promise<void> {
    const job = this.jobs[jobId];
    if (!job || job.status !== 'running') {
      return;
    }
    
    // 获取当前正在运行的任务集合
    const runningTasksSet = this.runningTasks.get(jobId) || new Set<string>();
    
    // 检查是否可以启动更多任务
    const canStartMoreTasks = runningTasksSet.size < job.concurrency;
    
    if (canStartMoreTasks) {
      // 获取待处理的任务
      const pendingTasks = job.tasks
        .filter(task => task.status === 'pending')
        .sort((a, b) => b.priority - a.priority); // 按优先级排序
      
      // 确定要启动的任务数量
      const tasksToStart = Math.min(
        job.concurrency - runningTasksSet.size,
        pendingTasks.length
      );
      
      // 启动任务
      for (let i = 0; i < tasksToStart; i++) {
        const task = pendingTasks[i];
        this.startTask(jobId, task.id);
      }
    }
    
    // 检查作业是否完成
    this.checkJobCompletion(jobId);
  }
  
  // 启动任务
  private async startTask(jobId: string, taskId: string): Promise<void> {
    const job = this.jobs[jobId];
    if (!job) return;
    
    const taskIndex = job.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = job.tasks[taskIndex];
    if (task.status !== 'pending') return;
    
    // 获取处理器
    const processor = this.processors[task.type];
    if (!processor) {
      // 处理器不存在，标记任务失败
      task.status = 'failed';
      task.error = `No processor registered for task type: ${task.type}`;
      
      // 触发事件
      this.eventsSubject.next({
        type: 'task:failed',
        jobId,
        taskId,
        error: task.error
      });
      
      // 检查作业完成
      this.checkJobCompletion(jobId);
      return;
    }
    
    // 更新任务状态
    task.status = 'running';
    task.startedAt = Date.now();
    task.attempts++;
    
    // 添加到运行中的任务集合
    const runningTasksSet = this.runningTasks.get(jobId) || new Set<string>();
    runningTasksSet.add(taskId);
    this.runningTasks.set(jobId, runningTasksSet);
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 触发事件
    this.eventsSubject.next({
      type: 'task:started',
      jobId,
      taskId
    });
    
    // 创建进度更新函数
    const updateProgress = (progress: number) => {
      // 确保进度在0-100之间
      const safeProgress = Math.max(0, Math.min(100, progress));
      
      // 更新任务进度
      task.progress = safeProgress;
      
      // 计算作业总进度
      this.updateJobProgress(jobId);
      
      // 触发进度事件
      this.eventsSubject.next({
        type: 'task:progress',
        jobId,
        taskId,
        progress: safeProgress
      });
      
      // 通知订阅者
      this.jobsSubject.next({ ...this.jobs });
    };
    
    try {
      // 执行处理器
      const result = await processor(task, updateProgress);
      
      // 更新任务状态
      task.status = 'completed';
      task.result = result;
      task.completedAt = Date.now();
      task.progress = 100;
      
      // 从运行中的任务集合中移除
      runningTasksSet.delete(taskId);
      
      // 触发事件
      this.eventsSubject.next({
        type: 'task:completed',
        jobId,
        taskId,
        result
      });
    } catch (error) {
      // 处理任务失败
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 检查是否需要重试
      if (task.attempts < task.maxAttempts) {
        // 标记为等待重试
        task.status = 'pending';
        task.error = errorMessage;
        
        // 触发重试事件
        this.eventsSubject.next({
          type: 'task:retrying',
          jobId,
          taskId,
          attempt: task.attempts
        });
        
        // 从运行中的任务集合中移除
        runningTasksSet.delete(taskId);
        
        // 设置延迟重试
          setTimeout(() => {
          // 确保作业还在运行
          if (job.status === 'running') {
            this.startTask(jobId, taskId);
          }
        }, task.retryDelay);
      } else {
        // 超过最大重试次数，标记为失败
        task.status = 'failed';
        task.error = errorMessage;
        
        // 从运行中的任务集合中移除
        runningTasksSet.delete(taskId);
        
        // 触发失败事件
        this.eventsSubject.next({
          type: 'task:failed',
          jobId,
          taskId,
          error: errorMessage
        });
      }
    }
    
    // 通知订阅者
    this.jobsSubject.next({ ...this.jobs });
    
    // 处理下一批任务
    this.processTasks(jobId);
  }
  
  // 检查作业是否完成
  private checkJobCompletion(jobId: string): void {
    const job = this.jobs[jobId];
    if (!job || job.status !== 'running') return;
    
    // 检查是否所有任务都已完成或失败
    const allTasksFinished = job.tasks.every(
      task => ['completed', 'failed', 'canceled'].includes(task.status)
    );
    
    if (allTasksFinished) {
      // 检查是否有失败的任务
      const hasFailedTasks = job.tasks.some(task => task.status === 'failed');
      
      // 更新作业状态
      job.status = hasFailedTasks ? 'failed' : 'completed';
      job.completedAt = Date.now();
      this.runningJobs.delete(jobId);
      
      // 清理运行中的任务集合
      this.runningTasks.delete(jobId);
      
      // 更新进度
      this.updateJobProgress(jobId);
      
      // 通知订阅者
      this.jobsSubject.next({ ...this.jobs });
      
      // 触发事件
      if (hasFailedTasks) {
        this.eventsSubject.next({
          type: 'job:failed',
          jobId,
          error: 'One or more tasks failed'
        });
      } else {
        this.eventsSubject.next({
          type: 'job:completed',
          jobId
        });
      }
      
      // 检查是否有等待的作业可以启动
      this.checkPendingJobs();
    }
  }
  
  // 更新作业进度
  private updateJobProgress(jobId: string): void {
    const job = this.jobs[jobId];
    if (!job) return;
    
    // 计算作业总进度
    const totalTasks = job.tasks.length;
    if (totalTasks === 0) {
      job.progress = 0;
      return;
    }
    
    // 计算所有任务的进度总和
    const totalProgress = job.tasks.reduce((sum, task) => sum + task.progress, 0);
    
    // 计算平均进度
    job.progress = Math.round(totalProgress / totalTasks);
  }
  
  // 检查是否有等待的作业可以启动
  private checkPendingJobs(): void {
    if (this.stopped) return;
    
    // 如果未达到最大并发作业数，检查是否有待处理的作业
    if (this.runningJobs.size < this.config.maxConcurrentJobs) {
      // 获取所有待处理的作业
      const pendingJobs = Object.values(this.jobs)
        .filter(job => job.status === 'pending')
        .sort((a, b) => a.createdAt - b.createdAt); // 按创建时间排序
      
      // 启动待处理的作业
      for (const job of pendingJobs) {
        if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
          break;
        }
        
        this.startJob(job.id);
      }
    }
  }
}

// 创建单例实例
let batchProcessorInstance: BatchProcessor | null = null

export function getBatchProcessor(config?: Partial<BatchProcessorConfig>): BatchProcessor {
  if (!batchProcessorInstance) {
    batchProcessorInstance = new BatchProcessor(config)
  } else if (config) {
    // 如果提供了新配置，销毁旧实例并创建新实例
    batchProcessorInstance.dispose()
    batchProcessorInstance = new BatchProcessor(config)
  }

  return batchProcessorInstance
}
