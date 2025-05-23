import { v4 as uuidv4 } from 'uuid';
import { Message, Role } from '@/lib/protocol/ag-ui-client';

export interface ConversationNode {
  id: string;
  parentId: string | null;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
  childrenIds: string[];
}

export interface Conversation {
  id: string;
  title: string;
  rootNodeId: string;
  activeNodeId: string;
  createdAt: number;
  updatedAt: number;
  agentId: string;
  metadata: Record<string, any>;
  nodes: Record<string, ConversationNode>;
}

export type ConversationSnapshot = Omit<Conversation, 'nodes'> & {
  nodesCount: number;
  messagesCount: number;
  lastMessage?: Message;
};

export class ConversationTreeManager {
  private static instance: ConversationTreeManager;
  private conversations: Record<string, Conversation> = {};
  private listeners: Array<(event: string, data: any) => void> = [];

  private constructor() {}

  public static getInstance(): ConversationTreeManager {
    if (!this.instance) {
      this.instance = new ConversationTreeManager();
    }
    return this.instance;
  }

  // 创建新的对话
  public createConversation(agentId: string, initialMessage?: string): string {
    const rootNodeId = uuidv4();
    const conversationId = uuidv4();
    const now = Date.now();
    
    const initialMessages: Message[] = initialMessage 
      ? [{
          id: uuidv4(),
          role: 'system',
          content: initialMessage,
          createdAt: now
        }] 
      : [];

    const rootNode: ConversationNode = {
      id: rootNodeId,
      parentId: null,
      messages: initialMessages,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      childrenIds: []
    };

    const conversation: Conversation = {
      id: conversationId,
      title: `对话 ${new Date(now).toLocaleString()}`,
      rootNodeId,
      activeNodeId: rootNodeId,
      createdAt: now,
      updatedAt: now,
      agentId,
      metadata: {},
      nodes: {
        [rootNodeId]: rootNode
      }
    };

    this.conversations[conversationId] = conversation;
    this.notifyListeners('conversation:created', { conversationId });
    return conversationId;
  }

  // 添加消息到活动节点
  public addMessage(conversationId: string, message: Omit<Message, 'id'>): string {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    const activeNode = conversation.nodes[conversation.activeNodeId];
    if (!activeNode) {
      throw new Error(`活动节点不存在: ${conversation.activeNodeId}`);
    }

    // 创建消息ID
    const messageId = uuidv4();
    const now = Date.now();
    
    // 创建完整消息
    const fullMessage: Message = {
      ...message,
      id: messageId,
      createdAt: now
    };

    // 添加消息到活动节点
    activeNode.messages.push(fullMessage);
    activeNode.updatedAt = now;
    conversation.updatedAt = now;

    // 如果是用户的第一条消息，更新对话标题
    if (message.role === 'user' && activeNode.id === conversation.rootNodeId && activeNode.messages.filter(m => m.role === 'user').length === 1) {
      const titleText = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
      conversation.title = titleText;
    }

    this.notifyListeners('message:added', { conversationId, nodeId: activeNode.id, messageId });
    return messageId;
  }

  // 在指定节点创建分支
  public createBranch(conversationId: string, fromNodeId: string, fromMessageIndex: number): string {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    const fromNode = conversation.nodes[fromNodeId];
    if (!fromNode) {
      throw new Error(`源节点不存在: ${fromNodeId}`);
    }

    if (fromMessageIndex < 0 || fromMessageIndex >= fromNode.messages.length) {
      throw new Error(`消息索引超出范围: ${fromMessageIndex}`);
    }

    const now = Date.now();
    const newNodeId = uuidv4();

    // 复制直到指定索引的消息
    const baseMessages = fromNode.messages.slice(0, fromMessageIndex + 1).map(msg => ({...msg}));

    // 创建新节点
    const newNode: ConversationNode = {
      id: newNodeId,
      parentId: fromNodeId,
      messages: baseMessages,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      childrenIds: []
    };

    // 更新父节点
    fromNode.childrenIds.push(newNodeId);
    
    // 添加到对话中
    conversation.nodes[newNodeId] = newNode;
    
    // 更新活动节点
    conversation.activeNodeId = newNodeId;
    conversation.updatedAt = now;

    this.notifyListeners('branch:created', { 
      conversationId, 
      parentNodeId: fromNodeId, 
      newNodeId,
      fromMessageIndex
    });
    
    return newNodeId;
  }

  // 切换活动节点
  public setActiveNode(conversationId: string, nodeId: string): void {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    if (!conversation.nodes[nodeId]) {
      throw new Error(`节点不存在: ${nodeId}`);
    }

    conversation.activeNodeId = nodeId;
    conversation.updatedAt = Date.now();

    this.notifyListeners('node:activated', { conversationId, nodeId });
  }

  // 更新对话标题
  public updateTitle(conversationId: string, title: string): void {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    conversation.title = title;
    conversation.updatedAt = Date.now();

    this.notifyListeners('conversation:updated', { conversationId });
  }

  // 获取特定对话
  public getConversation(conversationId: string): Conversation | null {
    return this.conversations[conversationId] || null;
  }

  // 获取特定节点的消息
  public getNodeMessages(conversationId: string, nodeId: string): Message[] {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    const node = conversation.nodes[nodeId];
    if (!node) {
      throw new Error(`节点不存在: ${nodeId}`);
    }

    return [...node.messages];
  }

  // 获取活动节点的消息
  public getActiveNodeMessages(conversationId: string): Message[] {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    return this.getNodeMessages(conversationId, conversation.activeNodeId);
  }

  // 获取节点的完整上下文（包括所有父节点的消息）
  public getNodeContext(conversationId: string, nodeId: string): Message[] {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    const messages: Message[] = [];
    let currentNodeId = nodeId;

    // 追踪已访问的节点，防止循环依赖
    const visitedNodes = new Set<string>();

    while (currentNodeId && !visitedNodes.has(currentNodeId)) {
      visitedNodes.add(currentNodeId);
      
      const node = conversation.nodes[currentNodeId];
      if (!node) break;
      
      // 合并消息（根节点消息放在前面）
      if (node.parentId === null) {
        // 根节点，添加所有消息
        messages.unshift(...node.messages);
      } else {
        // 非根节点，仅添加不在父节点中的消息
        const parentNode = conversation.nodes[node.parentId];
        const parentMessageCount = parentNode ? parentNode.messages.length : 0;
        
        // 添加此节点独有的消息
        const uniqueMessages = node.messages.slice(parentMessageCount);
        messages.unshift(...uniqueMessages);
      }
      
      // 移动到父节点
      currentNodeId = node.parentId || '';
    }

    return messages;
  }

  // 获取所有对话的快照
  public getConversationsSnapshot(): ConversationSnapshot[] {
    return Object.values(this.conversations).map(conversation => {
      const messagesCount = Object.values(conversation.nodes).reduce(
        (count, node) => count + node.messages.length, 0
      );
      
      const activeNode = conversation.nodes[conversation.activeNodeId];
      const lastMessage = activeNode.messages[activeNode.messages.length - 1];
      
      return {
        id: conversation.id,
        title: conversation.title,
        rootNodeId: conversation.rootNodeId,
        activeNodeId: conversation.activeNodeId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        agentId: conversation.agentId,
        metadata: conversation.metadata,
        nodesCount: Object.keys(conversation.nodes).length,
        messagesCount,
        lastMessage
      };
    });
  }

  // 删除对话
  public deleteConversation(conversationId: string): boolean {
    if (!this.conversations[conversationId]) {
      return false;
    }

    delete this.conversations[conversationId];
    this.notifyListeners('conversation:deleted', { conversationId });
    return true;
  }

  // 获取节点的所有子节点
  public getChildNodes(conversationId: string, nodeId: string): ConversationNode[] {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    const node = conversation.nodes[nodeId];
    if (!node) {
      throw new Error(`节点不存在: ${nodeId}`);
    }

    return node.childrenIds.map(id => conversation.nodes[id]).filter(Boolean);
  }

  // 序列化对话数据（用于持久化）
  public serializeConversation(conversationId: string): string {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    return JSON.stringify(conversation);
  }

  // 反序列化对话数据
  public deserializeConversation(serializedData: string): string {
    try {
      const conversation = JSON.parse(serializedData) as Conversation;
      
      // 验证必要字段
      if (!conversation.id || !conversation.rootNodeId || !conversation.nodes) {
        throw new Error('无效的对话数据');
      }
      
      this.conversations[conversation.id] = conversation;
      this.notifyListeners('conversation:imported', { conversationId: conversation.id });
      
      return conversation.id;
    } catch (error) {
      throw new Error(`反序列化对话失败: ${error}`);
    }
  }

  // 订阅事件
  public subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('事件监听器错误:', error);
      }
    });
  }
} 