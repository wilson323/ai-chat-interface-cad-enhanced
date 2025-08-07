/**
 * @fileoverview useAgentManagement.ts
 * @description This file contains a custom hook for managing AI agents, including CRUD operations and status toggling.
 * @description 此文件包含用于管理AI智能体的自定义钩子，包括CRUD操作和状态切换。
 */

import { useCallback, useState } from 'react';
import { useFastGPT } from '@/contexts/FastGPTContext';
import { useToast } from '@/hooks/use-toast';
import type { FastGPTApp } from '@/types/fastgpt';
import { generateAvatarColor } from '@/lib/utils/avatar-utils';
import { STORAGE_KEYS } from '@/lib/utils';

export function useAgentManagement() {
  const { applications, fetchApplications, isLoading } = useFastGPT();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const safeApplications = Array.isArray(applications) ? applications : [];

  const checkAuthentication = () => {
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userJson) {
      console.warn("User not found in localStorage");
      return false;
    }
    try {
      const user = JSON.parse(userJson);
      return !!user;
    } catch (e) {
      console.error("Error parsing user data:", e);
      return false;
    }
  };

  const handleAddAgent = useCallback(async (agent: Omit<FastGPTApp, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add an agent",
          variant: "destructive",
        });
        return;
      }

      const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS);
      const agents = agentsStr ? JSON.parse(agentsStr) : [];

      if (!agent.config.avatarColor) {
        agent.config.avatarColor = generateAvatarColor(agent.name);
      }

      const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();
      const newAgent = { ...agent, id, createdAt: now, updatedAt: now };

      agents.push(newAgent);
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));

      const adminAgentsStr = localStorage.getItem("admin_agents");
      const adminAgents = adminAgentsStr ? JSON.parse(adminAgentsStr) : [];
      adminAgents.push(newAgent);
      localStorage.setItem("admin_agents", JSON.stringify(adminAgents));

      await fetchApplications();
      toast({
        title: "Agent Created",
        description: `${agent.name} has been successfully added.`,
      });
    } catch (error) {
      console.error("Failed to add agent:", error);
      toast({
        title: "Failed to Add Agent",
        description: "Could not create the new agent. Please try again later.",
        variant: "destructive",
      });
    }
  }, [fetchApplications, toast]);

  const handleEditAgent = useCallback(async (updatedAgent: FastGPTApp) => {
    try {
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to edit an agent",
          variant: "destructive",
        });
        return;
      }

      const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS);
      const agents = agentsStr ? JSON.parse(agentsStr) : [];

      if (!updatedAgent.config.avatarColor) {
        updatedAgent.config.avatarColor = generateAvatarColor(updatedAgent.name);
      }

      const index = agents.findIndex((a: FastGPTApp) => a.id === updatedAgent.id);
      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          ...updatedAgent,
          config: {
            ...agents[index].config,
            ...updatedAgent.config,
          },
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
      }

      const adminAgentsStr = localStorage.getItem("admin_agents");
      const adminAgents = adminAgentsStr ? JSON.parse(adminAgentsStr) : [];
      const adminIndex = adminAgents.findIndex((a: FastGPTApp) => a.id === updatedAgent.id);
      if (adminIndex !== -1) {
          adminAgents[adminIndex] = { ...agents[index] };
      } else {
          adminAgents.push({ ...agents[index] });
      }
      localStorage.setItem("admin_agents", JSON.stringify(adminAgents));

      await fetchApplications();
      toast({
        title: "Agent Updated",
        description: `${updatedAgent.name} has been successfully updated.`,
      });
    } catch (error) {
      console.error("Failed to update agent:", error);
      toast({
        title: "Failed to Update Agent",
        description: "Could not update the agent's information. Please try again later.",
        variant: "destructive",
      });
    }
  }, [fetchApplications, toast]);

  const handleDeleteAgent = useCallback(async (id: string) => {
    try {
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to delete an agent",
          variant: "destructive",
        });
        return;
      }

      const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS);
      const agents = agentsStr ? JSON.parse(agentsStr) : [];
      const filteredAgents = agents.filter((agent: FastGPTApp) => agent.id !== id);
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(filteredAgents));

      const adminAgentsStr = localStorage.getItem("admin_agents");
      if (adminAgentsStr) {
        const adminAgents = JSON.parse(adminAgentsStr);
        const filteredAdminAgents = adminAgents.filter((agent: FastGPTApp) => agent.id !== id);
        localStorage.setItem("admin_agents", JSON.stringify(filteredAdminAgents));
      }

      await fetchApplications();
      toast({
        title: "Agent Deleted",
        description: "The agent has been successfully removed.",
      });
    } catch (error) {
      console.error("Failed to delete agent:", error);
      toast({
        title: "Failed to Delete Agent",
        description: "Could not delete the agent. Please try again later.",
        variant: "destructive",
      });
    }
  }, [fetchApplications, toast]);

  const handleToggleAgentStatus = useCallback(async (id: string, status: "active" | "inactive") => {
    const agent = safeApplications.find((app) => app.id === id);
    if (!agent) return;

    try {
      const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS);
      const agents = agentsStr ? JSON.parse(agentsStr) : [];
      const index = agents.findIndex((a: FastGPTApp) => a.id === id);

      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          status,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
      }

      await fetchApplications();
      toast({
        title: status === "active" ? "Agent Enabled" : "Agent Disabled",
        description: status === "active" ? "The agent is now available to users." : "The agent has been disabled and is not accessible to users.",
      });
    } catch (error) {
      console.error("Failed to update agent status:", error);
      toast({
        title: "Failed to Update Status",
        description: "Could not update the agent's status. Please try again later.",
        variant: "destructive",
      });
    }
  }, [safeApplications, fetchApplications, toast]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      if (!checkAuthentication()) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access this feature",
          variant: "destructive",
        });
        return;
      }
      await fetchApplications();
      toast({
        title: "Refresh Successful",
        description: "Agent list has been updated",
      });
    } catch (error) {
      console.error("Failed to refresh agent list:", error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh agent list. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchApplications, toast]);

  return {
    agents: safeApplications,
    isLoading,
    isRefreshing,
    handleAddAgent,
    handleEditAgent,
    handleDeleteAgent,
    handleToggleAgentStatus,
    handleRefresh,
  };
}
