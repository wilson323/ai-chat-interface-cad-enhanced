import { useState, useMemo } from 'react';
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
