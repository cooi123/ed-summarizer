"use client"

import { useState } from "react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { saveTaskRun, updateTaskRun } from "@/lib/units"

type TaskItemProps = {
  unitId: string
  task: {
    id: string
    name: string
    description: string
  }
}

export function TaskItem({ unitId, task }: TaskItemProps) {
  const [isRunning, setIsRunning] = useState(false)
  const { toast } = useToast()

  const runTask = async () => {
    setIsRunning(true)

    // Create a unique ID for this task run
    const taskRunId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Create initial task run record
    const taskRun = {
      id: taskRunId,
      taskId: task.id,
      unitId: unitId,
      timestamp: Date.now(),
      status: "running" as const,
      progress: 0,
    }

    // Save initial state
    saveTaskRun(taskRun)

    toast({
      title: "Task started",
      description: `Running: ${task.name}`,
    })

    // Simulate task progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10

      // Update progress
      updateTaskRun(taskRunId, { progress })

      if (progress >= 100) {
        clearInterval(interval)

        // Generate a mock result in markdown format
        const result = `
# Task Result: ${task.name}

## Summary
Task completed successfully at ${new Date().toLocaleString()}

## Details
- Task ID: ${task.id}
- Unit ID: ${unitId}
- Execution Time: ${Math.floor(Math.random() * 5) + 2} seconds

## Output
Successfully processed the requested operation.

\`\`\`json
{
  "status": "success",
  "timestamp": "${new Date().toISOString()}",
  "metrics": {
    "accuracy": ${(Math.random() * 0.2 + 0.8).toFixed(2)},
    "processingTime": ${Math.floor(Math.random() * 500) + 100}
  }
}
\`\`\`
`

        // Update task run with completed status and result
        updateTaskRun(taskRunId, {
          status: "completed",
          progress: 100,
          result,
        })

        toast({
          title: "Task completed",
          description: `${task.name} finished successfully`,
        })

        setIsRunning(false)
      }
    }, 500)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{task.name}</CardTitle>
        <CardDescription>{task.description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={runTask} disabled={isRunning} className="w-full">
          {isRunning ? "Running..." : "Run Task"}
        </Button>
      </CardFooter>
    </Card>
  )
}
