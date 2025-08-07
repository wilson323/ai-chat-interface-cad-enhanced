/**
 * @fileoverview useAgentFilters.ts
 * @description This file contains a custom hook for filtering the list of AI agents based on search query and status.
 * @description 此文件包含用于根据搜索查询和状态筛选AI智能体列表的自定义钩子。
 */

import { useMemo, useState } from 'react';
import type { FastGPTApp } from '@/types/fastgpt';

export function useAgentFilters(agents: FastGPTApp[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredAgents = useMemo(() => {
    if (!Array.isArray(agents)) {
      return [];
    }
    return agents
      .filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .filter((app) =>
        statusFilter === "all" ? true : statusFilter === "active" ? app.status === "active" : app.status === "inactive"
      );
  }, [agents, searchQuery, statusFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredAgents,
    resetFilters,
  };
}
