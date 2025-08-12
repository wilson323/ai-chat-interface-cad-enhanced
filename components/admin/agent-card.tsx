"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from "@/components/ui/card"

interface AgentCardProps {
  agent: any
  models?: any[]
  onEdit?: () => void
  onDelete?: () => void
  onToggleStatus?: (next: boolean) => void
  onTest?: () => void
}

export function AgentCard({ agent, onEdit, onDelete, onToggleStatus, onTest }: AgentCardProps) {
  const isActive: boolean = !!(agent?.isActive ?? agent?.active)
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{agent?.name || '未命名智能体'}</CardTitle>
            <CardDescription className="mt-1">{agent?.description || '没有描述'}</CardDescription>
            <Badge variant="outline" className="mt-2">{agent?.type || 'unknown'}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>编辑</Button>
            <Button variant="outline" size="sm" onClick={onDelete}>删除</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">状态：{isActive ? '启用' : '禁用'}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onTest}>测试</Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus?.(!isActive)}
            >
              {isActive ? '禁用' : '启用'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


