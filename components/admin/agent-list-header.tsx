import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, RefreshCw } from "lucide-react";

interface AgentListHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusChange: (value: "all" | "active" | "inactive") => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onAddAgent: () => void;
}

export function AgentListHeader({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onRefresh,
  isRefreshing,
  onAddAgent,
}: AgentListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">AI Agents</h2>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-full sm:w-64 bg-white/80 dark:bg-gray-800/80"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onRefresh} disabled={isRefreshing} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button onClick={onAddAgent} className="bg-[#6cb33f] hover:bg-green-600 transition-colors w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Agent
        </Button>
      </div>
    </div>
  );
}
