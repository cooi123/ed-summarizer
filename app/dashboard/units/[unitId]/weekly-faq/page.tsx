"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTaskStore } from "@/store/taskStore";
import { useUnitStore } from "@/store/unitStore";
import { UnitWeeklyFAQ } from "@/components/unit/faq-generator/unit-weekly-faq-tab";
import useUserStore from "@/store/userStore";

export default function WeeklyFAQPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const { user } = useUserStore();

  // Get unit data from store
  const unit = useUnitStore((state) => state.unit);
  const unitLoading = useUnitStore((state) => state.isLoading);
  const fetchUnit = useUnitStore((state) => state.fetchUnit);

  // Get task data from store
  const taskRuns = useTaskStore((state) => state.taskRuns);
  const tasksLoading = useTaskStore((state) => state.loading);
  const getTaskRuns = useTaskStore((state) => state.getTaskRuns);

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
      />
    </div>
  );
} 