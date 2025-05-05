"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TaskRun } from "@/lib/units"
import { TaskResult } from "@/components/task-result"

type TaskHistoryProps = {
  history: TaskRun[]
}

export function TaskHistory({ history }: TaskHistoryProps) {
  const [selectedRun, setSelectedRun] = useState<TaskRun | null>(null)

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task History</CardTitle>
          <CardDescription>No tasks have been run yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Run a task to see its history and results here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Task History</CardTitle>
          <CardDescription>View your task run history and results</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {history.map((run) => (
                <Card key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRun(run)}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{run.taskId.replace(/-\d+/g, "")}</CardTitle>
                      <Badge
                        variant={
                          run.status === "completed" ? "default" : run.status === "running" ? "outline" : "destructive"
                        }
                      >
                        {run.status}
                      </Badge>
                    </div>
                    <CardDescription>{new Date(run.timestamp).toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Progress value={run.progress} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedRun && selectedRun.result && (
        <TaskResult result={selectedRun.result} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  )
}
