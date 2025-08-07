/**
 * @fileoverview Provides the main layout structure for the chat interface.
 * @file_zh-CN: 提供聊天界面的主布局结构。
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  agentSelector: React.ReactNode;
  children: React.ReactNode;
  isDarkMode: boolean;
}

export function ChatLayout({ header, sidebar, agentSelector, children, isDarkMode }: ChatLayoutProps) {
  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800",
        isDarkMode && "dark"
      )}
    >
      {header}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50">
          {children}
        </main>
      </div>
      {sidebar}
      {agentSelector}
    </div>
  );
}
