/**
 * 同步管理器 - 负责客户端和服务器之间的数据同步
 * Sync Manager - Responsible for data synchronization between client and server
 */
import { BehaviorSubject, type Observable, Subject, debounceTime, filter } from "rxjs"
import { v4 as uuidv4 } from "uuid"
import { ConversationTreeManager } from '@/lib/conversation/conversation-tree'

// 同步状态
export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline"

// 同步项
export interface SyncItem {
  id: string
  type: string
  data: any
  timestamp: number
  priority: number
  retries: number
  status: SyncStatus
}

// 同步管理器配置
export interface SyncManagerConfig {
  endpoint: string
  debounceTime: number
  maxRetries: number
  batchSize: number
  syncInterval: number
  offlineStorage: boolean
  apiKey?: string
}

// 默认配置
const DEFAULT_CONFIG: SyncManagerConfig = {
  endpoint: "/api/sync",
  debounceTime: 500,
  maxRetries: 5,
  batchSize: 10,
  syncInterval: 5000,
  offlineStorage: true,
}

interface SyncOptions {
  syncInterval?: number; // 同步间隔，毫秒
  autoBackup?: boolean; // 是否自动备份
  backupInterval?: number; // 备份间隔，毫秒
  maxBackupCount?: number; // 最大备份数量
  remoteEnabled?: boolean; // 是否启用远程同步
  remoteUrl?: string; // 远程同步 URL
  remoteApiKey?: string; // 远程 API 密钥
}

export interface SyncRecord {
  id: string;
  timestamp: number;
  status: 'pending' | 'success' | 'error';
  type: 'backup' | 'restore' | 'sync';
  details?: string;
  metadata?: Record<string, any>;
}

export interface BackupRecord {
  id: string;
  timestamp: number;
  size: number;
  conversationCount: number;
  messageCount: number;
  name: string;
  data?: string; // 序列化的备份数据
}

// 同步事件类型
export type SyncEvent = 
  | { type: 'sync:started', syncId: string }
  | { type: 'sync:completed', syncId: string, details: any }
  | { type: 'sync:failed', syncId: string, error: any }
  | { type: 'backup:started', backupId: string }
  | { type: 'backup:completed', backupId: string, record: BackupRecord }
  | { type: 'backup:failed', backupId: string, error: any }
  | { type: 'restore:started', backupId: string }
  | { type: 'restore:completed', backupId: string, details: any }
  | { type: 'restore:failed', backupId: string, error: any };

export class SyncManager {
  private static instance: SyncManager;
  private config: SyncManagerConfig
  private queue: SyncItem[] = []
  private statusSubject = new BehaviorSubject<SyncStatus>("idle")
  private syncSubject = new Subject<SyncItem[]>()
  private intervalId: NodeJS.Timeout | null = null
  private isOnline = true
  private pendingChanges = new BehaviorSubject<number>(0)
  private options: SyncOptions;
  private syncTimer: NodeJS.Timeout | null = null;
  private backupTimer: NodeJS.Timeout | null = null;
  private syncing = false;
  private backups: BackupRecord[] = [];
  private syncHistory: SyncRecord[] = [];
  private listeners: Array<(event: SyncEvent) => void> = [];
  private conversationManager: ConversationTreeManager;

  private constructor(config: Partial<SyncManagerConfig> = {}, options: SyncOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.options = {
      syncInterval: 60000, // 1分钟
      autoBackup: true,
      backupInterval: 3600000, // 1小时
      maxBackupCount: 10,
      remoteEnabled: false,
      ...options
    };

    this.conversationManager = ConversationTreeManager.getInstance();
    
    // 加载本地存储的备份记录
    this.loadBackupRecords();
    
    // 如果启用了自动同步，启动定时器
    if (this.options.syncInterval && this.options.syncInterval > 0) {
      this.startSyncTimer();
    }
    
    // 如果启用了自动备份，启动定时器
    if (this.options.autoBackup && this.options.backupInterval && this.options.backupInterval > 0) {
      this.startBackupTimer();
    }

    // 设置自动同步
    this.syncSubject
      .pipe(
        debounceTime(this.config.debounceTime),
        filter(() => this.isOnline),
      )
      .subscribe(async (items) => {
        await this.processBatch(items)
      })

    // 监听在线状态
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)
      this.isOnline = navigator.onLine
    }

    // 启动定时同步
    this.startSyncInterval()
  }

  public static getInstance(config?: Partial<SyncManagerConfig>, options?: SyncOptions): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(config, options);
    } else if (config) {
      // 更新选项
      SyncManager.instance.updateOptions(config);
    }
    return SyncManager.instance;
  }

  // 更新同步选项
  public updateOptions(options: Partial<SyncOptions>): void {
    const prevOptions = { ...this.options };
    this.options = { ...this.options, ...options };
    
    // 如果同步间隔变化，重启定时器
    if (options.syncInterval !== undefined && options.syncInterval !== prevOptions.syncInterval) {
      this.stopSyncTimer();
      if (options.syncInterval > 0) {
        this.startSyncTimer();
      }
    }
    
    // 如果备份选项变化，重启定时器
    if (
      (options.autoBackup !== undefined && options.autoBackup !== prevOptions.autoBackup) ||
      (options.backupInterval !== undefined && options.backupInterval !== prevOptions.backupInterval)
    ) {
      this.stopBackupTimer();
      if (this.options.autoBackup && this.options.backupInterval && this.options.backupInterval > 0) {
        this.startBackupTimer();
      }
    }
    
    // 将更新的选项保存到本地存储
    this.saveOptions();
  }

  // 获取同步状态
  public getStatus(): Observable<SyncStatus> {
    return this.statusSubject.asObservable()
  }

  // 获取待同步项数量
  public getPendingCount(): Observable<number> {
    return this.pendingChanges.asObservable()
  }

  // 添加同步项
  public addItem(type: string, data: any, priority = 1): string {
    const id = uuidv4()
    const item: SyncItem = {
      id,
      type,
      data,
      timestamp: Date.now(),
      priority,
      retries: 0,
      status: "idle",
    }

    this.queue.push(item)
    this.pendingChanges.next(this.queue.length)

    // 如果启用了离线存储，保存到本地
    if (this.config.offlineStorage && typeof localStorage !== "undefined") {
      this.saveToLocalStorage()
    }

    // 触发同步
    this.triggerSync()

    return id
  }

  // 触发同步
  private triggerSync(): void {
    if (this.queue.length === 0) return

    // 按优先级和时间戳排序
    const sortedItems = [...this.queue]
      .sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp)
      .slice(0, this.config.batchSize)

    this.syncSubject.next(sortedItems)
  }

  // 处理批量同步
  private async processBatch(items: SyncItem[]): Promise<void> {
    if (items.length === 0) return

    this.statusSubject.next("syncing")

    try {
      const itemIds = items.map((item) => item.id)
      const payload = {
        items: items.map(({ id, type, data, timestamp }) => ({
          id,
          type,
          data,
          timestamp,
        })),
      }

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()

      // 处理成功同步的项
      if (result.success) {
        // 从队列中移除已同步的项
        this.queue = this.queue.filter((item) => !itemIds.includes(item.id))
        this.pendingChanges.next(this.queue.length)

        // 更新本地存储
        if (this.config.offlineStorage && typeof localStorage !== "undefined") {
          this.saveToLocalStorage()
        }

        this.statusSubject.next("success")
      } else {
        // 增加重试次数
        this.queue = this.queue.map((item) => {
          if (itemIds.includes(item.id)) {
            return {
              ...item,
              retries: item.retries + 1,
              status: item.retries >= this.config.maxRetries ? "error" : "idle",
            }
          }
          return item
        })

        this.statusSubject.next("error")
      }
    } catch (error) {
      console.error("Sync error:", error)

      // 增加重试次数
      this.queue = this.queue.map((item) => {
        if (items.find((i) => i.id === item.id)) {
          return {
            ...item,
            retries: item.retries + 1,
            status: item.retries >= this.config.maxRetries ? "error" : "idle",
          }
        }
        return item
      })

      this.statusSubject.next("error")
    }

    // 如果队列中还有项，继续同步
    if (this.queue.length > 0) {
      this.triggerSync()
    }
  }

  // 启动定时同步
  private startSyncInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.triggerSync()
      }
    }, this.config.syncInterval)
  }

  // 停止定时同步
  public stopSyncInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // 处理在线状态变化
  private handleOnline = (): void => {
    this.isOnline = true
    this.statusSubject.next("idle")

    // 恢复在线后立即同步
    if (this.queue.length > 0) {
      this.triggerSync()
    }
  }

  // 处理离线状态变化
  private handleOffline = (): void => {
    this.isOnline = false
    this.statusSubject.next("offline")
  }

  // 保存到本地存储
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem("sync_queue", JSON.stringify(this.queue))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }

  // 从本地存储加载
  public loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem("sync_queue")
      if (stored) {
        this.queue = JSON.parse(stored)
        this.pendingChanges.next(this.queue.length)

        // 过滤掉已达到最大重试次数的项
        this.queue = this.queue.filter((item) => item.retries < this.config.maxRetries)
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }

  // 清理资源
  public dispose(): void {
    this.stopSyncInterval()

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline)
      window.removeEventListener("offline", this.handleOffline)
    }
  }

  // 开始同步定时器
  private startSyncTimer(): void {
    this.stopSyncTimer();
    this.syncTimer = setInterval(() => {
      this.sync().catch(error => {
        console.error('自动同步失败:', error);
      });
    }, this.options.syncInterval);
  }

  // 停止同步定时器
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // 开始备份定时器
  private startBackupTimer(): void {
    this.stopBackupTimer();
    this.backupTimer = setInterval(() => {
      this.createBackup(`自动备份 ${new Date().toLocaleString()}`).catch(error => {
        console.error('自动备份失败:', error);
      });
    }, this.options.backupInterval);
  }

  // 停止备份定时器
  private stopBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // 同步数据
  public async sync(): Promise<SyncRecord> {
    if (this.syncing) {
      throw new Error('同步已经在进行中');
    }
    
    this.syncing = true;
    const syncId = uuidv4();
    const record: SyncRecord = {
      id: syncId,
      timestamp: Date.now(),
      status: 'pending',
      type: 'sync'
    };
    
    // 添加到历史记录
    this.syncHistory.push(record);
    
    // 触发同步开始事件
    this.notifyListeners({
      type: 'sync:started',
      syncId
    });
    
    try {
      // 如果启用远程同步
      if (this.options.remoteEnabled && this.options.remoteUrl) {
        await this.syncWithRemote();
      } else {
        // 本地同步逻辑 - 保存到 localStorage
        this.saveToLocalStorage();
      }
      
      // 更新记录状态
      record.status = 'success';
      record.timestamp = Date.now();
      
      // 触发同步完成事件
      this.notifyListeners({
        type: 'sync:completed',
        syncId,
        details: { timestamp: record.timestamp }
      });
      
      return record;
    } catch (error) {
      // 更新记录状态
      record.status = 'error';
      record.details = error instanceof Error ? error.message : String(error);
      
      // 触发同步失败事件
      this.notifyListeners({
        type: 'sync:failed',
        syncId,
        error
      });
      
      throw error;
    } finally {
      this.syncing = false;
      
      // 保存同步历史
      this.saveSyncHistory();
    }
  }

  // 与远程服务器同步
  private async syncWithRemote(): Promise<void> {
    if (!this.options.remoteUrl) {
      throw new Error('未配置远程同步 URL');
    }
    
    // 获取所有对话
    const conversationSnapshots = this.conversationManager.getConversationsSnapshot();
    const conversationIds = conversationSnapshots.map(snapshot => snapshot.id);
    
    // 准备同步数据
    const syncData = {
      clientId: this.getClientId(),
      timestamp: Date.now(),
      conversations: conversationIds.map(id => {
        const serialized = this.conversationManager.serializeConversation(id);
        return { id, data: serialized };
      })
    };
    
    // 发送到远程服务器
    const response = await fetch(this.options.remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.options.remoteApiKey ? { 'Authorization': `Bearer ${this.options.remoteApiKey}` } : {})
      },
      body: JSON.stringify(syncData)
    });
    
    if (!response.ok) {
      throw new Error(`远程同步失败: ${response.status} ${response.statusText}`);
    }
    
    // 处理响应
    const result = await response.json();
    
    // 如果服务器返回了需要更新的对话
    if (result.updates && Array.isArray(result.updates)) {
      for (const update of result.updates) {
        try {
          this.conversationManager.deserializeConversation(update.data);
        } catch (error) {
          console.error(`更新对话 ${update.id} 失败:`, error);
        }
      }
    }
  }

  // 创建备份
  public async createBackup(name: string): Promise<BackupRecord> {
    const backupId = uuidv4();
    
    // 触发备份开始事件
    this.notifyListeners({
      type: 'backup:started',
      backupId
    });
    
    try {
      // 获取所有对话
      const conversationSnapshots = this.conversationManager.getConversationsSnapshot();
      const conversationIds = conversationSnapshots.map(snapshot => snapshot.id);
      
      // 统计消息数量
      const messageCount = conversationSnapshots.reduce((sum, snapshot) => sum + snapshot.messagesCount, 0);
      
      // 准备备份数据
      const backupData = {
        version: '1.0',
        timestamp: Date.now(),
        conversations: conversationIds.map(id => {
          const serialized = this.conversationManager.serializeConversation(id);
          return { id, data: serialized };
        })
      };
      
      // 序列化备份数据
      const serializedData = JSON.stringify(backupData);
      
      // 创建备份记录
      const record: BackupRecord = {
        id: backupId,
        timestamp: Date.now(),
        size: serializedData.length,
        conversationCount: conversationIds.length,
        messageCount,
        name,
        data: serializedData
      };
      
      // 添加到备份列表
      this.backups.push(record);
      
      // 如果超过最大备份数，删除最旧的
      if (this.options.maxBackupCount && this.backups.length > this.options.maxBackupCount) {
        this.backups.sort((a, b) => b.timestamp - a.timestamp);
        this.backups = this.backups.slice(0, this.options.maxBackupCount);
      }
      
      // 保存备份记录
      this.saveBackupRecords();
      
      // 触发备份完成事件
      this.notifyListeners({
        type: 'backup:completed',
        backupId,
        record
      });
      
      return record;
    } catch (error) {
      // 触发备份失败事件
      this.notifyListeners({
        type: 'backup:failed',
        backupId,
        error
      });
      
      throw error;
    }
  }

  // 从备份恢复
  public async restoreFromBackup(backupId: string): Promise<void> {
    const backup = this.backups.find(b => b.id === backupId);
    if (!backup || !backup.data) {
      throw new Error(`备份不存在或数据为空: ${backupId}`);
    }
    
    // 触发恢复开始事件
    this.notifyListeners({
      type: 'restore:started',
      backupId
    });
    
    try {
      // 解析备份数据
      const backupData = JSON.parse(backup.data);
      
      // 恢复对话
      for (const conversation of backupData.conversations) {
        try {
          this.conversationManager.deserializeConversation(conversation.data);
        } catch (error) {
          console.error(`恢复对话 ${conversation.id} 失败:`, error);
        }
      }
      
      // 触发恢复完成事件
      this.notifyListeners({
        type: 'restore:completed',
        backupId,
        details: {
          timestamp: Date.now(),
          conversationCount: backupData.conversations.length
        }
      });
    } catch (error) {
      // 触发恢复失败事件
      this.notifyListeners({
        type: 'restore:failed',
        backupId,
        error
      });
      
      throw error;
    }
  }

  // 导出备份
  public exportBackup(backupId: string): string {
    const backup = this.backups.find(b => b.id === backupId);
    if (!backup || !backup.data) {
      throw new Error(`备份不存在或数据为空: ${backupId}`);
    }
    
    return backup.data;
  }

  // 导入备份
  public importBackup(backupData: string, name: string): BackupRecord {
    try {
      // 验证备份数据
      const parsed = JSON.parse(backupData);
      if (!parsed.version || !parsed.timestamp || !Array.isArray(parsed.conversations)) {
        throw new Error('无效的备份数据格式');
      }
      
      // 创建新的备份记录
      const backupId = uuidv4();
      const record: BackupRecord = {
        id: backupId,
        timestamp: Date.now(),
        size: backupData.length,
        conversationCount: parsed.conversations.length,
        messageCount: parsed.conversations.reduce((sum: number, conv: any) => {
          try {
            const convData = JSON.parse(conv.data);
            return sum + Object.values(convData.nodes).reduce(
              (nodeSum: number, node: any) => nodeSum + (node.messages?.length || 0), 0
            );
          } catch {
            return sum;
          }
        }, 0),
        name: name || `导入的备份 ${new Date().toLocaleString()}`,
        data: backupData
      };
      
      // 添加到备份列表
      this.backups.push(record);
      
      // 保存备份记录
      this.saveBackupRecords();
      
      return record;
    } catch (error) {
      throw new Error(`导入备份失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取所有备份
  public getBackups(): BackupRecord[] {
    return this.backups.map((backup) => {
      const { data, ...rest } = backup as any
      return rest as BackupRecord
    })
  }

  // 删除备份
  public deleteBackup(backupId: string): boolean {
    const index = this.backups.findIndex(b => b.id === backupId);
    if (index === -1) {
      return false;
    }
    
    this.backups.splice(index, 1);
    this.saveBackupRecords();
    return true;
  }

  // 获取同步历史
  public getSyncHistory(): SyncRecord[] {
    return [...this.syncHistory];
  }

  // 清除同步历史
  public clearSyncHistory(): void {
    this.syncHistory = [];
    this.saveSyncHistory();
  }

  // 获取客户端标识
  private getClientId(): string {
    let clientId = localStorage.getItem('sync_client_id');
    if (!clientId) {
      clientId = uuidv4();
      localStorage.setItem('sync_client_id', clientId);
    }
    return clientId;
  }

  // 保存选项
  private saveOptions(): void {
    localStorage.setItem('sync_options', JSON.stringify(this.options));
  }

  // 加载选项
  private loadOptions(): void {
    try {
      const optionsStr = localStorage.getItem('sync_options');
      if (optionsStr) {
        this.options = { ...this.options, ...JSON.parse(optionsStr) };
      }
    } catch (error) {
      console.error('加载同步选项失败:', error);
    }
  }

  // 保存备份记录
  private saveBackupRecords(): void {
    try {
      // 只保存记录，不保存实际数据
      const records = this.backups.map(backup => ({
        ...backup,
        data: undefined
      }));
      
      localStorage.setItem('backup_records', JSON.stringify(records));
      
      // 单独保存每个备份的数据
      for (const backup of this.backups) {
        if (backup.data) {
          localStorage.setItem(`backup_data_${backup.id}`, backup.data);
        }
      }
    } catch (error) {
      console.error('保存备份记录失败:', error);
    }
  }

  // 加载备份记录
  private loadBackupRecords(): void {
    try {
      const recordsStr = localStorage.getItem('backup_records');
      if (recordsStr) {
        const records = JSON.parse(recordsStr) as BackupRecord[];
        
        // 加载每个备份的数据
        this.backups = records.map(record => {
          try {
            const data = localStorage.getItem(`backup_data_${record.id}`);
            return { ...record, data };
          } catch {
            return record;
          }
        });
      }
    } catch (error) {
      console.error('加载备份记录失败:', error);
    }
  }

  // 保存同步历史
  private saveSyncHistory(): void {
    try {
      localStorage.setItem('sync_history', JSON.stringify(this.syncHistory));
    } catch (error) {
      console.error('保存同步历史失败:', error);
    }
  }

  // 加载同步历史
  private loadSyncHistory(): void {
    try {
      const historyStr = localStorage.getItem('sync_history');
      if (historyStr) {
        this.syncHistory = JSON.parse(historyStr);
      }
    } catch (error) {
      console.error('加载同步历史失败:', error);
    }
  }

  // 订阅事件
  public subscribe(listener: (event: SyncEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(event: SyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('同步事件监听器错误:', error);
      }
    });
  }
}

// 创建单例实例
let syncManagerInstance: SyncManager | null = null

export function getSyncManager(config?: Partial<SyncManagerConfig>, options?: SyncOptions): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = SyncManager.getInstance(config, options)
  } else if (config || options) {
    // 允许更新选项
    if (options) {
      syncManagerInstance.updateOptions(options)
    }
  }
  return syncManagerInstance as SyncManager
}
