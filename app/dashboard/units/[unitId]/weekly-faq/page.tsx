"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useTaskStore, TaskRunStatusResponse, isCompletedStatus } from "@/store/taskStore";
import { useUnitStore } from "@/store/unitStore";
import { UnitWeeklyFAQ } from "@/components/unit/faq-generator/unit-weekly-faq-tab";
import useUserStore from "@/store/userStore";
import { apiService } from "@/lib/api";
import { apiEndpoints } from "@/const/apiEndpoints";
import { useToast } from "@/hooks/use-toast";

export default function WeeklyFAQPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const { user } = useUserStore();
  const { toast } = useToast();
  
  // Local state for current task run
  const [currentTaskRun, setCurrentTaskRun] = useState<TaskRunStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActiveRef = useRef(false);

  // Get unit data from store
  const unit = useUnitStore((state) => state.unit);
  const unitLoading = useUnitStore((state) => state.isLoading);
  const fetchUnit = useUnitStore((state) => state.fetchUnit);

  // Get task data from store
  const taskRuns = useTaskStore((state) => state.taskRuns);
  const tasksLoading = useTaskStore((state) => state.loading);
  const getTaskRuns = useTaskStore((state) => state.getTaskRuns);
  const runTask = useTaskStore((state) => state.runTask);

  // Load current task run from local storage on component mount
  useEffect(() => {
    const savedTaskRun = localStorage.getItem(`currentTaskRun-${unitId}`);
    console.log("savedTaskRun", savedTaskRun);
    if (savedTaskRun) {
      try {
        const parsed = JSON.parse(savedTaskRun);
        console.log("parsed", parsed);
        setCurrentTaskRun(parsed);
        // If the task is not completed, start polling
        if (!isCompletedStatus(parsed.status)) {
          startPolling(parsed.transactionId);
        }
      } catch (error) {
        console.error("Error parsing saved task run:", error);
        localStorage.removeItem(`currentTaskRun-${unitId}`);
      }
    }
  }, [unitId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up polling");
      pollingActiveRef.current = false;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const saveCurrentTaskRun = (taskRun: TaskRunStatusResponse | null) => {
    if (taskRun) {
      localStorage.setItem(`currentTaskRun-${unitId}`, JSON.stringify(taskRun));
    } else {
      localStorage.removeItem(`currentTaskRun-${unitId}`);
    }
    setCurrentTaskRun(taskRun);
  };

  const startPolling = async (transactionId: string, intervalMs = 2000) => {
    console.log("Starting polling for transaction:", transactionId);
    setIsPolling(true);
    pollingActiveRef.current = true;
    const startTime = Date.now();
    const MAX_POLLING_DURATION = 2 * 60 * 1000; // 2 minutes

    const checkStatus = async () => {
      console.log("Checking status, polling active:", pollingActiveRef.current);
      if (!pollingActiveRef.current) {
        console.log("Polling stopped, exiting checkStatus");
        return;
      }

      if (Date.now() - startTime > MAX_POLLING_DURATION) {
        console.log("Polling timeout reached");
        setIsPolling(false);
        pollingActiveRef.current = false;
        toast({
          title: "Polling Timeout",
          description: "Task polling timed out after 2 minutes",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log("Fetching task status for:", transactionId);
        const response = await apiService.get<TaskRunStatusResponse>(
          apiEndpoints.tasks.getTaskStatus(transactionId)
        );
        console.log("Task status response:", response);

        saveCurrentTaskRun(response);

        if (isCompletedStatus(response.status)) {
          console.log("Task completed, stopping polling");
          setIsPolling(false);
          pollingActiveRef.current = false;
          if (pollingRef.current) {
            clearTimeout(pollingRef.current);
          }
          
          // Refresh task runs if completed
          if (response.status === "completed" || response.status === "success") {
            if (user) {
              getTaskRuns(unitId, user.id);
            }
          }
        } else {
          console.log("Task still running, scheduling next check in", intervalMs, "ms");
          pollingRef.current = setTimeout(checkStatus, intervalMs);
        }
      } catch (error) {
        console.error("Error polling task status:", error);
        setIsPolling(false);
        pollingActiveRef.current = false;
        toast({
          title: "Error",
          description: "Failed to poll task status",
          variant: "destructive",
        });
      }
    };

    checkStatus();
  };

  const stopPolling = () => {
    console.log("Stopping polling");
    setIsPolling(false);
    pollingActiveRef.current = false;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    saveCurrentTaskRun(null);
  };

  const handleCancelTask = async () => {
    if (!currentTaskRun) return;
    
    try {
      await apiService.post(apiEndpoints.tasks.cancelTask(currentTaskRun.transactionId));
      stopPolling();
      toast({
        title: "Task Cancelled",
        description: "The FAQ generation task has been cancelled.",
      });
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast({
        title: "Error",
        description: "Failed to cancel the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReportStart = (startDate: Date, endDate: Date) => {
    if (!user) return;
    
    try {
      runTask(unitId, user.id, startDate, endDate).then((response) => {
        saveCurrentTaskRun(response);
        startPolling(response.transactionId);
      });
    } catch (error) {
      console.error('Error starting weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to start weekly report generation",
        variant: "destructive",
      });
    }
  };

  const handleWeeklyReportEnd = () => {
    if (user) {
      getTaskRuns(unitId, user.id);
    }
  };

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

  if (unitLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Weekly FAQ Generator</h2>
        <p className="text-muted-foreground">
          Generate weekly FAQ templates based on categorized questions. This tool helps create structured responses to common student inquiries organized by topic. Make sure to sync threads first to get the latest questions before running the analysis.
        </p>
      </div>
      <UnitWeeklyFAQ
        taskRuns={taskRuns}
        unit={unit}
        currentTaskRun={currentTaskRun}
        isPolling={isPolling}
        onCancelTask={handleCancelTask}
        onStopPolling={stopPolling}
        onWeeklyReportStart={handleReportStart}
        onWeeklyReportEnd={handleWeeklyReportEnd}
      />
    </div>
  );
} 