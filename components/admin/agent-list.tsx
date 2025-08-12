"use client"

import { AnimatePresence,motion } from "framer-motion"
import {
  Edit,
  ExternalLink,
  Plus,
  Trash,
} from "lucide-react"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useAgentFilters } from "@/hooks/use-agent-filters"
import { useAgentManagement } from "@/hooks/use-agent-management"
import { useModelFetcher } from "@/hooks/use-model-fetcher"
import type { FastGPTApp } from "@/types/fastgpt"

import { AgentCard } from "./agent-card"
import { AgentForm } from "./agent-form"
import { AgentListHeader } from "./agent-list-header"

export function AgentList() {
  const {
    agents,
    isLoading,
    isRefreshing,
    handleAddAgent,
    handleEditAgent,
    handleDeleteAgent,
    handleToggleAgentStatus,
    handleRefresh,
  } = useAgentManagement()

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredAgents,
    resetFilters,
  } = useAgentFilters(agents)

  const { models, voiceModels, isLoadingModels } = useModelFetcher()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<FastGPTApp | null>(null)

  const handleTestAgent = (agent: FastGPTApp) => {
    window.open(`/diagnostics/fastgpt-connection?appId=${agent.id}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">AI Agents</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-900"
            >
              <CardContent className="pt-6">
                <Skeleton className="h-7 w-40 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex justify-end gap-2 mt-4">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!Array.isArray(agents)) {
      return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">AI Agents</h2>
        </div>
        <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-red-200 dark:border-red-900 shadow-md">
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-red-500 dark:text-red-400 mb-4">Error loading agents.</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
              The application list is not in the correct format. This might be due to an API error or network issue.
            </p>
            <Button
              variant="outline"
              onClick={() => handleRefresh()}
            >
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <AgentListHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onAddAgent={() => setIsAddDialogOpen(true)}
      />

      {agents.length === 0 ? (
        <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-green-200 dark:border-green-900 shadow-md">
          <CardContent className="flex flex-col items-center justify-center h-60 p-6">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Agents Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Create your first AI agent to start conversations.</p>
            <Button
              className="bg-[#6cb33f] hover:bg-green-600 transition-colors"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </CardContent>
        </Card>
      ) : filteredAgents.length === 0 ? (
        <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-green-200 dark:border-green-900 shadow-md">
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No matching agents found.</p>
            <Button
              variant="outline"
              onClick={resetFilters}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {filteredAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <AgentCard
                    agent={agent}
                    models={models}
                    onEdit={() => {
                      setCurrentAgent(agent)
                      setIsEditDialogOpen(true)
                    }}
                    onDelete={() => handleDeleteAgent(agent.id)}
                    onToggleStatus={(status: boolean) => handleToggleAgentStatus(agent.id, status ? 'active' : 'inactive')}
                    onTest={() => handleTestAgent(agent)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New AI Agent</DialogTitle>
          </DialogHeader>
          <AgentForm
            onSubmit={(agent) => {
              handleAddAgent(agent);
              setIsAddDialogOpen(false);
            }}
            onCancel={() => setIsAddDialogOpen(false)}
            models={models}
            voiceModels={voiceModels}
            isLoadingModels={isLoadingModels}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit AI Agent</DialogTitle>
          </DialogHeader>
          {currentAgent && (
            <AgentForm
              initialData={currentAgent}
              onSubmit={(agent) => {
                handleEditAgent(agent);
                setIsEditDialogOpen(false);
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              models={models}
              voiceModels={voiceModels}
              isLoadingModels={isLoadingModels}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
