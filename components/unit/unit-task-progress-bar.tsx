import { useTaskStore } from "@/store/taskStore";
import { Progress } from "@/components/ui/progress";
export function TaskProgressBar() {
  const { currentTaskRun, polling, loading } = useTaskStore();

  // Don't show anything if there's no active task or we're not polling/loading
  if (!currentTaskRun || (!polling && !loading)) {
    return null;
  }

  // Calculate percentage - use the progress value directly if available
  const progress = currentTaskRun.progress || 0;

  // Get status text to display
  const getStatusText = () => {
    if (currentTaskRun.status === "completed") return "Completed";
    if (currentTaskRun.status === "failed") return "Failed";
    if (currentTaskRun.status === "error") return "Error";
    return `Processing (${Math.round(progress)}%)`;
  };

  return (
    <div className="w-full">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-gray-500 mt-1">{getStatusText()}</p>
    </div>
  );
}
