"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, History, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskStore } from "@/store/taskStore";
import { useToast } from "@/hooks/use-toast";
import { UnitSettings } from "@/components/unit/unit-settings";
import useUserStore from "@/store/userStore";
import { useUnitStore } from "@/store/unitStore";
import { UnitGenerateReportDialog } from "@/components/unit/unit-generate-report-dialog";
import { UnitReportHistory } from "@/components/unit/unit-report-history";

export default function UnitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const unitId = params.unitId as string;
  const { user } = useUserStore();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // State for UI
  const [activeTab, setActiveTab] = useState("current");
  const [progress, setProgress] = useState(0);
  const [reportContent, setReportContent] = useState<string>("");
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<string | null>(
    null
  );
  const [taskRunning, setTaskRunning] = useState(false);

  // Get unit data from store - memoized selector to avoid infinite loops
  const unit = useUnitStore((state) => state.unit);
  const unitLoading = useUnitStore((state) => state.isLoading);
  const unitError = useUnitStore((state) => state.error);
  const fetchUnit = useUnitStore((state) => state.fetchUnit);

  // Get task data from store - memoized selectors
  const taskRuns = useTaskStore((state) => state.taskRuns);
  const tasksLoading = useTaskStore((state) => state.loading);
  const taskError = useTaskStore((state) => state.error);
  const getTaskRuns = useTaskStore((state) => state.getTaskRuns);
  const getLatestTaskRun = useTaskStore((state) => state.getLatestTaskRun);
  const runTask = useTaskStore((state) => state.runTask);

  // Fetch unit data on mount
  useEffect(() => {
    fetchUnit(unitId);
  }, [unitId, fetchUnit]);

  // Fetch task history when unit and user are available
  useEffect(() => {
    if (unit && user) {
      getTaskRuns(unitId, user.id);
    }
  }, [unit, user, unitId, getTaskRuns]);

  // Redirect if unit not found after loading
  useEffect(() => {
    if (!unitLoading && !unit && unitError) {
      toast({
        title: "Unit Not Found",
        description: unitError || "The requested unit could not be found",
        variant: "destructive",
      });
      setTimeout(() => router.push("/dashboard/units"), 2000);
    }
  }, [unit, unitLoading, unitError, toast, router]);

  // Handle errors from TaskStore
  useEffect(() => {
    if (taskError) {
      toast({
        title: "Task Error",
        description: taskError,
        variant: "destructive",
      });
    }
  }, [taskError, toast]);

  // Handle errors from UnitStore
  useEffect(() => {
    if (unitError) {
      toast({
        title: "Unit Error",
        description: unitError,
        variant: "destructive",
      });
    }
  }, [unitError, toast]);

  // Setup polling when task is running
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let progressInterval: NodeJS.Timeout | undefined;

    if (taskRunning && user) {
      // Start progress animation
      setProgress(10);
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90)); // Cap at 90% until complete
      }, 3000);

      // Poll for updates
      interval = setInterval(async () => {
        const latestRun = await getLatestTaskRun(unitId, user.id);

        if (
          latestRun?.status === "completed" ||
          latestRun?.status === "failed"
        ) {
          setTaskRunning(false);
          clearInterval(interval);
          clearInterval(progressInterval);
          setProgress(latestRun.status === "completed" ? 100 : 0);

          // Update report content
          if (latestRun.result) {
            const resultContent =
              typeof latestRun.result === "string"
                ? latestRun.result
                : JSON.stringify(latestRun.result, null, 2);

            setReportContent(resultContent);
          }

          // Show completion message
          toast({
            title:
              latestRun.status === "completed"
                ? "Report Generated"
                : "Report Failed",
            description:
              latestRun.status === "completed"
                ? "Your report has been successfully generated."
                : `Error: ${latestRun.error_message || "Unknown error"}`,
            variant:
              latestRun.status === "completed" ? "default" : "destructive",
          });
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [taskRunning, unitId, user, getLatestTaskRun, toast]);

  // Handler for when task is started from the dialog
  const handleTaskStarted = () => {
    setActiveTab("current");
    setSelectedHistoryRun(null);
    setTaskRunning(true);
    setProgress(5);
  };

  // Handler for viewing a historical report
  const viewHistoricalReport = (run: any) => {
    if (!run || !run.result) return;

    setSelectedHistoryRun(run.id);
    const resultContent =
      typeof run.result === "string"
        ? run.result
        : JSON.stringify(run.result, null, 2);

    setReportContent(resultContent);
    setActiveTab("current");
  };

  // Show loading state
  if (unitLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loading unit...</h1>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  // Unit not found - don't redirect during render
  if (!unit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unit Not Found</h1>
          <p className="text-muted-foreground">Redirecting to units page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {unit.code}: {unit.name}
          </h1>
          <p className="text-muted-foreground">
            {unit.year} - {unit.session}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsReportDialogOpen(true)}
            disabled={taskRunning}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${taskRunning ? "animate-spin" : ""}`}
            />
            {taskRunning ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Report Generation Dialog */}
      <UnitGenerateReportDialog
        unitId={unitId}
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        onTaskStarted={handleTaskStarted}
      />

      <Tabs
        defaultValue="current"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="current">
            <Clock className="mr-2 h-4 w-4" />
            {selectedHistoryRun ? "Historical Report" : "Current Report"}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Report History ({taskRuns.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Unit Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4"></TabsContent>

        <TabsContent value="history" className="space-y-4">
          <UnitReportHistory taskRuns={taskRuns} unit={unit} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <UnitSettings unit={unit} unitId={unitId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
