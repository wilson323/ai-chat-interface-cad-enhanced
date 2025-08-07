/**
 * @fileoverview Chat-related type definitions.
 * @file_zh-CN: 聊天相关的类型定义。
 */

export type Agent = {
  id: string;
  name: string;
  avatar: string;
  description: string;
  status: "online" | "offline";
  category: "general" | "business" | "creative" | "technical";
  isNew?: boolean;
  isPremium?: boolean;
  personality?: string;
  capabilities?: string[];
  model?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isRead?: boolean;
  isFavorite?: boolean;
  attachments?: Array<{
    id: string;
    type: "image" | "file" | "audio" | "video";
    url: string;
    name: string;
    size?: number;
    thumbnail?: string;
  }>;
};

export type Conversation = {
  id: string;
  title: string;
  agentId: string;
  messages: Message[];
  timestamp: Date;
  pinned?: boolean;
  unread?: number;
  tags?: string[];
};
