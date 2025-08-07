/**
 * @fileoverview Mock data for the chat application.
 * @file_zh-CN: 聊天应用的模拟数据。
 */

import type { Agent, Conversation } from "@/types/chat.d";

export const publishedAgents: Agent[] = [
  {
    id: "default",
    name: "ZKTeco 助手",
    avatar: "/images/clean-assistant-avatar.png",
    description: "通用AI助手，可以回答各种问题",
    status: "online",
    category: "general",
  },
  {
    id: "business",
    name: "商务顾问",
    avatar: "/images/clean-business-avatar.png",
    description: "专注于商业策略和市场分析",
    status: "online",
    category: "business",
  },
  {
    id: "creative",
    name: "创意助手",
    avatar: "/images/clean-creative-avatar.png",
    description: "帮助激发创意和设计灵感",
    status: "online",
    category: "creative",
  },
  {
    id: "tech",
    name: "技术专家",
    avatar: "/images/clean-tech-avatar.png",
    description: "解决技术问题和编程挑战",
    status: "online",
    category: "technical",
    isNew: true,
  },
  {
    id: "writer",
    name: "写作助手",
    avatar: "/images/clean-writer-avatar.png",
    description: "帮助撰写和编辑各类文本",
    status: "online",
    category: "creative",
  },
  {
    id: "analyst",
    name: "数据分析师",
    avatar: "/images/clean-analyst-avatar.png",
    description: "分析数据并提供洞察",
    status: "online",
    category: "business",
    isPremium: true,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv1",
    title: "关于AI技术的讨论",
    agentId: "default",
    messages: [
      {
        id: "msg1",
        role: "user",
        content: "你好，我想了解一下最新的AI技术发展趋势。",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: "msg2",
        role: "assistant",
        content:
          "您好！最近AI技术发展迅速，主要趋势包括大型语言模型的进步、多模态AI的发展、AI在特定领域的应用深化，以及更注重AI伦理和安全。您对哪个方面特别感兴趣？",
        timestamp: new Date(Date.now() - 1000 * 60 * 29),
      },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    pinned: true,
  },
  {
    id: "conv2",
    title: "市场策略分析",
    agentId: "business",
    messages: [
      {
        id: "msg3",
        role: "user",
        content: "我们的新产品应该如何定位市场？",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: "msg4",
        role: "assistant",
        content:
          "根据您的产品特点，我建议从以下几个方面考虑市场定位：1. 目标客户群体分析；2. 竞争对手优劣势分析；3. 产品差异化优势；4. 价格策略制定。您希望我详细展开哪个方面？",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 30),
      },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unread: 2,
  },
  {
    id: "conv3",
    title: "创意广告方案",
    agentId: "creative",
    messages: [
      {
        id: "msg5",
        role: "user",
        content: "我需要为一款环保产品设计创意广告方案。",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        id: "msg6",
        role: "assistant",
        content:
          "环保产品的创意广告可以从情感共鸣和社会责任感入手。我建议以下方向：1. 展示产品对环境的积极影响；2. 使用对比手法突显问题与解决方案；3. 讲述感人的环保故事；4. 互动式体验让用户参与环保行动。您更倾向于哪种风格？",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 30),
      },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
];
