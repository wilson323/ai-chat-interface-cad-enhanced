import { Observable,Subject } from 'rxjs';

// 角色类型
export type Role = 'user' | 'admin' | 'manager' | 'guest' | 'system';

// 权限类型
export type Permission = 
  | 'read:conversations'
  | 'write:conversations'
  | 'delete:conversations'
  | 'read:agents'
  | 'write:agents'
  | 'delete:agents'
  | 'read:users'
  | 'write:users'
  | 'manage:system'
  | 'access:analytics'
  | 'access:admin'
  | 'upload:files'
  | 'download:files'
  | 'generate:content'
  | 'use:cad'
  | 'use:poster'
  | 'use:chat'
  | string;

// 资源类型
export interface Resource {
  type: string;
  id: string;
  ownerId?: string;
}

// 权限规则
export interface PermissionRule {
  id: string;
  role: Role;
  permissions: Permission[];
  resources?: string[]; // 资源类型，如 'conversation', 'agent', 'user'
  conditions?: Record<string, unknown>; // 额外条件
  priority: number; // 优先级，用于解决冲突
}

// 速率限制配置
export interface RateLimitConfig {
  endpoint: string;
  method?: string;
  limit: number; // 最大请求数
  window: number; // 时间窗口（毫秒）
  cost?: number; // 消耗的令牌数
}

// 用户令牌桶
export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // 令牌/毫秒
}

// API请求记录
export interface ApiRequestLog {
  id: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

// 安全审计日志
export interface SecurityAuditLog {
  id: string;
  type: 'access' | 'permission' | 'authentication' | 'rate-limit' | 'error';
  userId?: string;
  action: string;
  resource?: Resource;
  result: 'success' | 'failure';
  reason?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 配置选项
export interface ApiSecurityConfig {
  defaultRoleRules: PermissionRule[];
  rateLimits: RateLimitConfig[];
  defaultTokenBucket: {
    capacity: number;
    refillRate: number;
  };
  auditEnabled: boolean;
  auditRetentionDays: number;
  ipBasedRateLimiting: boolean;
}

// 默认配置
const DEFAULT_CONFIG: ApiSecurityConfig = {
  defaultRoleRules: [
    {
      id: 'admin-all',
      role: 'admin',
      permissions: ['*'],
      priority: 100
    },
    {
      id: 'user-basic',
      role: 'user',
      permissions: [
        'read:conversations',
        'write:conversations',
        'read:agents',
        'upload:files',
        'download:files',
        'generate:content',
        'use:cad',
        'use:poster',
        'use:chat'
      ],
      priority: 50
    },
    {
      id: 'guest-limited',
      role: 'guest',
      permissions: [
        'read:conversations',
        'use:chat'
      ],
      priority: 10
    }
  ],
  rateLimits: [
    {
      endpoint: '/api/chat/stream',
      limit: 30,
      window: 60000 // 每分钟30次
    },
    {
      endpoint: '/api/cad/upload',
      limit: 10,
      window: 60000 // 每分钟10次
    },
    {
      endpoint: '/api/images/upload',
      limit: 20,
      window: 60000 // 每分钟20次
    },
    {
      endpoint: '*', // 全局限制
      limit: 300,
      window: 60000 // 每分钟300次
    }
  ],
  defaultTokenBucket: {
    capacity: 60,
    refillRate: 1 / 1000 // 每秒1个令牌
  },
  auditEnabled: true,
  auditRetentionDays: 30,
  ipBasedRateLimiting: true
};

export class ApiSecurityService {
  private static instance: ApiSecurityService;
  private config: ApiSecurityConfig;
  private permissionRules: PermissionRule[] = [];
  private tokenBuckets: Map<string, TokenBucket> = new Map();
  private requestLogs: ApiRequestLog[] = [];
  private auditLogs: SecurityAuditLog[] = [];
  private auditSubject = new Subject<SecurityAuditLog>();
  
  private constructor(config: Partial<ApiSecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.permissionRules = [...this.config.defaultRoleRules];
    
    // 清理过期日志的定时器
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupLogs(), 24 * 60 * 60 * 1000); // 每天清理一次
    }
  }
  
  public static getInstance(config?: Partial<ApiSecurityConfig>): ApiSecurityService {
    if (!ApiSecurityService.instance) {
      ApiSecurityService.instance = new ApiSecurityService(config);
    } else if (config) {
      // 更新配置
      ApiSecurityService.instance.updateConfig(config);
    }
    return ApiSecurityService.instance;
  }
  
  // 更新配置
  public updateConfig(config: Partial<ApiSecurityConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重置规则
    if (config.defaultRoleRules) {
      this.permissionRules = [...config.defaultRoleRules];
    }
  }
  
  // 检查用户是否有特定权限
  public hasPermission(
    userId: string,
    permission: Permission,
    resource?: Resource
  ): boolean {
    // 获取用户角色（实际应用中应从用户服务获取）
    const userRole = this.getUserRole(userId);
    
    // 查找匹配的规则
    const matchingRules = this.permissionRules
      .filter(rule => rule.role === userRole)
      .filter(rule => {
        // 检查资源条件
        if (resource && rule.resources) {
          return rule.resources.includes(resource.type);
        }
        return true;
      })
      .sort((a, b) => b.priority - a.priority); // 按优先级排序
    
    // 检查是否有规则授予了此权限
    for (const rule of matchingRules) {
      // 通配符权限
      if (rule.permissions.includes('*')) {
        this.logAudit({
          type: 'permission',
          userId,
          action: `check:${permission}`,
          resource,
          result: 'success',
          reason: 'wildcard permission',
          timestamp: Date.now()
        });
        return true;
      }
      
      // 特定权限
      if (rule.permissions.includes(permission)) {
        // 如果是资源拥有者，总是有权限
        if (resource && resource.ownerId === userId) {
          this.logAudit({
            type: 'permission',
            userId,
            action: `check:${permission}`,
            resource,
            result: 'success',
            reason: 'resource owner',
            timestamp: Date.now()
          });
          return true;
        }
        
        // 检查额外条件
        if (rule.conditions) {
          // 实现条件逻辑检查
          // ...
        }
        
        this.logAudit({
          type: 'permission',
          userId,
          action: `check:${permission}`,
          resource,
          result: 'success',
          reason: 'permission granted by rule',
          timestamp: Date.now()
        });
        return true;
      }
    }
    
    // 没有匹配的规则，拒绝访问
    this.logAudit({
      type: 'permission',
      userId,
      action: `check:${permission}`,
      resource,
      result: 'failure',
      reason: 'no matching permission rule',
      timestamp: Date.now()
    });
    return false;
  }
  
  // 添加权限规则
  public addPermissionRule(rule: PermissionRule): void {
    // 检查是否已存在相同ID的规则
    const existingIndex = this.permissionRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      // 替换已有规则
      this.permissionRules[existingIndex] = rule;
    } else {
      // 添加新规则
      this.permissionRules.push(rule);
    }
  }
  
  // 移除权限规则
  public removePermissionRule(ruleId: string): boolean {
    const initialLength = this.permissionRules.length;
    this.permissionRules = this.permissionRules.filter(rule => rule.id !== ruleId);
    return this.permissionRules.length < initialLength;
  }
  
  // 获取所有权限规则
  public getPermissionRules(): PermissionRule[] {
    return [...this.permissionRules];
  }
  
  // 速率限制检查
  public checkRateLimit(
    userId: string,
    endpoint: string,
    method: string = 'GET'
  ): { allowed: boolean; remainingTokens: number; resetTime: number } {
    const key = `${userId}:${endpoint}`;
    
    // 获取匹配的速率限制配置
    const rateLimit = this.findRateLimitConfig(endpoint, method);
    if (!rateLimit) {
      // 没有速率限制配置，允许请求
      return { allowed: true, remainingTokens: Infinity, resetTime: 0 };
    }
    
    // 获取或创建令牌桶
    let bucket = this.tokenBuckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.config.defaultTokenBucket.capacity,
        lastRefill: Date.now(),
        capacity: this.config.defaultTokenBucket.capacity,
        refillRate: this.config.defaultTokenBucket.refillRate
      };
      this.tokenBuckets.set(key, bucket);
    }
    
    // 刷新令牌
    this.refillTokenBucket(bucket);
    
    // 计算消耗的令牌数
    const cost = rateLimit.cost || 1;
    
    // 检查是否有足够的令牌
    if (bucket.tokens >= cost) {
      // 消耗令牌
      bucket.tokens -= cost;
      
      // 计算重置时间
      const resetTime = Date.now() + Math.ceil((bucket.capacity - bucket.tokens) / bucket.refillRate);
      
      return { allowed: true, remainingTokens: bucket.tokens, resetTime };
    } else {
      // 计算重置时间
      const resetTime = Date.now() + Math.ceil((cost - bucket.tokens) / bucket.refillRate);
      
      // 记录速率限制事件
      this.logAudit({
        type: 'rate-limit',
        userId,
        action: `${method}:${endpoint}`,
        result: 'failure',
        reason: `rate limit exceeded: ${bucket.tokens}/${cost}`,
        timestamp: Date.now(),
        metadata: { resetTime }
      });
      
      return { allowed: false, remainingTokens: bucket.tokens, resetTime };
    }
  }
  
  // 记录API请求
  public logApiRequest(log: Omit<ApiRequestLog, 'id'>): string {
    const id = crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fullLog: ApiRequestLog = {
      ...log,
      id
    };
    
    this.requestLogs.push(fullLog);
    
    // 如果发生错误，记录到审计日志
    if (!fullLog.success) {
      this.logAudit({
        type: 'error',
        userId: fullLog.userId,
        action: `${fullLog.method}:${fullLog.endpoint}`,
        result: 'failure',
        reason: fullLog.error,
        timestamp: fullLog.timestamp
      });
    }
    
    return id;
  }
  
  // 获取API请求日志
  public getApiRequestLogs(
    filter?: {
      userId?: string;
      endpoint?: string;
      startTime?: number;
      endTime?: number;
      success?: boolean;
    }
  ): ApiRequestLog[] {
    let filtered = [...this.requestLogs];
    
    if (filter) {
      if (typeof filter.userId === 'string') {
        filtered = filtered.filter(log => log.userId === filter.userId);
      }
      
      if (typeof filter.endpoint === 'string' && filter.endpoint.length > 0) {
        const ep = filter.endpoint as string;
        filtered = filtered.filter(log => (log.endpoint ?? "").includes(ep));
      }
      
      if (typeof filter.startTime === 'number') {
        const startTimeValue = filter.startTime;
        filtered = filtered.filter(log => log.timestamp >= startTimeValue);
      }
      
      if (typeof filter.endTime === 'number') {
        const endTimeValue = filter.endTime;
        filtered = filtered.filter(log => log.timestamp <= endTimeValue);
      }
      
      if (filter.success !== undefined) {
        filtered = filtered.filter(log => log.success === filter.success);
      }
    }
    
    return filtered;
  }
  
  // 获取审计日志流
  public getAuditStream(): Observable<SecurityAuditLog> {
    return this.auditSubject.asObservable();
  }
  
  // 获取审计日志
  public getAuditLogs(
    filter?: {
      type?: string;
      userId?: string;
      startTime?: number;
      endTime?: number;
      result?: 'success' | 'failure';
    }
  ): SecurityAuditLog[] {
    let filtered = [...this.auditLogs];
    
    if (filter) {
      if (typeof filter.type === 'string') {
        filtered = filtered.filter(log => log.type === filter.type);
      }
      
      if (typeof filter.userId === 'string') {
        filtered = filtered.filter(log => log.userId === filter.userId);
      }
      
      if (typeof filter.startTime === 'number') {
        const startTimeValue = filter.startTime;
        filtered = filtered.filter(log => log.timestamp >= startTimeValue);
      }
      
      if (typeof filter.endTime === 'number') {
        const endTimeValue = filter.endTime;
        filtered = filtered.filter(log => log.timestamp <= endTimeValue);
      }
      
      if (filter.result) {
        filtered = filtered.filter(log => log.result === filter.result);
      }
    }
    
    return filtered;
  }
  
  // 添加中间件到Next.js应用
  public createMiddleware() {
    return async (req: unknown, res: unknown, next: () => void | Promise<void>) => {
      const startTime = Date.now();
      const reqObj = req as {
        headers?: Record<string, unknown>;
        url?: string;
        method?: string;
        connection?: { remoteAddress?: string };
      };
      const resObj = res as {
        setHeader?: (name: string, value: number | string) => void;
        status?: (code: number) => typeof resObj;
        json?: (body: unknown) => void;
        statusCode?: number;
        end?: (chunk?: unknown) => void;
      };

      // 获取用户ID
      const headerValue = reqObj.headers?.['user-id'];
      const userId = Array.isArray(headerValue)
        ? (typeof headerValue[0] === 'string' ? headerValue[0] : 'anonymous')
        : (typeof headerValue === 'string' ? headerValue : 'anonymous');
      
      // 检查速率限制
      const rateCheckResult = this.checkRateLimit(userId, reqObj.url ?? '', reqObj.method ?? 'GET');
      
      if (!rateCheckResult.allowed) {
        // 设置速率限制响应头
        if (typeof resObj.setHeader === 'function') {
          resObj.setHeader('X-RateLimit-Limit', this.findRateLimitConfig(reqObj.url ?? '', reqObj.method ?? 'GET')?.limit || 0);
          resObj.setHeader('X-RateLimit-Remaining', rateCheckResult.remainingTokens);
          resObj.setHeader('X-RateLimit-Reset', rateCheckResult.resetTime);
        }
        
        // 返回 429 Too Many Requests
        if (typeof resObj.status === 'function') {
          resObj.status(429);
        }
        if (typeof resObj.json === 'function') {
          resObj.json({
            error: 'Too Many Requests',
            message: 'API rate limit exceeded',
            resetAt: new Date(rateCheckResult.resetTime).toISOString()
          });
        } else {
          if (typeof resObj.end === 'function') {
            resObj.statusCode = 429;
            resObj.end(JSON.stringify({
              error: 'Too Many Requests',
              message: 'API rate limit exceeded',
              resetAt: new Date(rateCheckResult.resetTime).toISOString()
            }));
          }
        }
        
        // 记录请求
        this.logApiRequest({
          userId,
          endpoint: reqObj.url ?? '',
          method: reqObj.method ?? 'GET',
          statusCode: 429,
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          ip: (reqObj.headers?.['x-forwarded-for'] as string | undefined) || reqObj.connection?.remoteAddress,
          userAgent: reqObj.headers?.['user-agent'] as string | undefined,
          success: false,
          error: 'Rate limit exceeded'
        });
        
        return;
      }
      
      // 继续处理请求
      try {
        // 继续中间件链
        await next();
        
        // 记录成功请求
        this.logApiRequest({
          userId,
          endpoint: reqObj.url ?? '',
          method: reqObj.method ?? 'GET',
          statusCode: (resObj.statusCode ?? 200),
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          ip: (reqObj.headers?.['x-forwarded-for'] as string | undefined) || reqObj.connection?.remoteAddress,
          userAgent: reqObj.headers?.['user-agent'] as string | undefined,
          success: (resObj.statusCode ?? 200) < 400
        });
      } catch (error) {
        // 记录失败请求
        this.logApiRequest({
          userId,
          endpoint: reqObj.url ?? '',
          method: reqObj.method ?? 'GET',
          statusCode: (resObj.statusCode ?? 500),
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          ip: (reqObj.headers?.['x-forwarded-for'] as string | undefined) || reqObj.connection?.remoteAddress,
          userAgent: reqObj.headers?.['user-agent'] as string | undefined,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // 重新抛出错误，让错误处理中间件处理
        throw error;
      }
    };
  }
  
  // 记录审计日志
  private logAudit(log: Omit<SecurityAuditLog, 'id'>): void {
    if (!this.config.auditEnabled) return;
    
    const id = crypto.randomUUID ? crypto.randomUUID() : `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fullLog: SecurityAuditLog = {
      ...log,
      id
    };
    
    // 添加到日志
    this.auditLogs.push(fullLog);
    
    // 发布事件
    this.auditSubject.next(fullLog);
  }
  
  // 清理过期日志
  private cleanupLogs(): void {
    const cutoffTime = Date.now() - (this.config.auditRetentionDays * 24 * 60 * 60 * 1000);
    
    // 清理API请求日志
    this.requestLogs = this.requestLogs.filter(log => log.timestamp >= cutoffTime);
    
    // 清理审计日志
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= cutoffTime);
  }
  
  // 刷新令牌桶
  private refillTokenBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    
    if (timePassed > 0) {
      // 计算新增令牌
      const newTokens = timePassed * bucket.refillRate;
      
      // 更新令牌数，不超过容量
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + newTokens);
      bucket.lastRefill = now;
    }
  }
  
  // 查找速率限制配置
  private findRateLimitConfig(endpoint: string, method: string): RateLimitConfig | undefined {
    // 首先查找精确匹配
    let config = this.config.rateLimits.find(
      limit => limit.endpoint === endpoint && (!limit.method || limit.method === method)
    );
    
    // 如果没有精确匹配，查找全局配置
    if (!config) {
      config = this.config.rateLimits.find(
        limit => limit.endpoint === '*' && (!limit.method || limit.method === method)
      );
    }
    
    return config;
  }
  
  // 获取用户角色（示例实现，实际应用中应从用户服务获取）
  private getUserRole(userId: string): Role {
    // 模拟角色映射
    const roleMap: Record<string, Role> = {
      'admin-user': 'admin',
      'manager-user': 'manager',
      'guest-user': 'guest'
    };
    
    return roleMap[userId] || 'user';
  }
} 