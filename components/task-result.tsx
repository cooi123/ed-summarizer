"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import ReactMarkdown from "react-markdown"

type TaskResultProps = {
  result: string
  onClose: () => void
}

export function TaskResult({ result, onClose }: TaskResultProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Task Result</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
