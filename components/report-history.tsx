import { Download, Eye } from "lucide-react";
import type { TaskRun } from "@/store/taskStore";
import { Button } from "./ui/button";

export function ReportHistory({
  history,
  onViewReport,
  onDownloadReport,
}: {
  history: TaskRun[];
  onViewReport: (run: TaskRun) => void;
  onDownloadReport: (run: TaskRun) => void;
}) {
  // Filter to only completed tasks with results
  const completedRuns = history.filter(
    (run) => run.status === "completed" && run.result
  );

  if (completedRuns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No report history found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedRuns.map((run) => (
        <div
          key={run.id}
          className="p-4 border rounded-lg flex items-center justify-between"
        >
          <div>
            <div className="font-medium">
              Report from {new Date(run.startTime).toLocaleDateString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Generated at {new Date(run.startTime).toLocaleTimeString()}
              {run.endTime &&
                ` • Completed in ${Math.round(
                  (run.endTime - run.startTime) / 1000
                )}s`}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewReport(run)}
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            <Button
              size="sm"
              onClick={() => onDownloadReport(run)}
              disabled={!run.result}
            >
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
