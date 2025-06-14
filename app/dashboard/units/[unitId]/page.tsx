"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {  Settings, MessageSquare, HelpCircle, BarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskStore } from "@/store/taskStore";
import { useToast } from "@/hooks/use-toast";
import { UnitSettings } from "@/components/unit/unit-settings";
import useUserStore from "@/store/userStore";
import { useUnitStore } from "@/store/unitStore";
import { UnitWeeklyFAQ } from "@/components/unit/faq-generator/unit-weekly-faq-tab";
import { TaskProgressBar } from "@/components/unit/unit-task-progress-bar";
import { QuestionClusterGroup } from "@/components/unit/question-cluster/question-cluster-group";
import { SemesterSelectionDialog } from "@/components/unit/semester-selection-dialog";
import { WeekConfig } from "@/types/unit";
import { UnitAnalysisTab } from "@/components/unit/unit-analysis/unit-analysis-tab";

export default function UnitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const unitId = params.unitId as string;
  const { user } = useUserStore();

  const [activeTab, setActiveTab] = useState("weekly-faq");
  const [showSemesterDialog, setShowSemesterDialog] = useState(false);
 
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
  const polling = useTaskStore((state) => state.polling);

  // Show semester dialog if unit has no weeks
  useEffect(() => {
    if (unit && (!unit.weeks || unit.weeks.length === 0)) {
      setShowSemesterDialog(true);
    }
  }, [unit]);

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

  const handleWeeksGenerated = (weeks: WeekConfig[]) => {
    // Refresh unit data to get the updated weeks
    fetchUnit(unitId);
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
      </div>

      {polling && <TaskProgressBar />}
      <Tabs
        defaultValue="current"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
        <TabsTrigger
            value="weekly-faq"
          >
            <HelpCircle className="h-5 w-5" />
            Weekly Thread Analytics
          </TabsTrigger>
          <TabsTrigger
            value="question-clusters" 
          >
            <MessageSquare className="h-5 w-5" />
            Question Clusters
          </TabsTrigger>

          <TabsTrigger value="analysis">
            <BarChart className="h-5 w-5" />
            Unit Analysis
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Unit Settings
          </TabsTrigger>
        </TabsList>



        <TabsContent value="weekly-faq" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Weekly FAQ Generator</h2>
            <p className="text-muted-foreground">Generate weekly FAQ templates based on categorized questions. This tool helps create structured responses to common student inquiries organized by topic. Make sure to sync threads first to get the latest questions before running the analysis</p>
          </div>
          <UnitWeeklyFAQ
            taskRuns={taskRuns}
            unit={unit}
          />
        </TabsContent>

        <TabsContent value="question-clusters" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Question Clusters</h2>
            <p className="text-muted-foreground">View and analyze clusters of questions grouped by common themes, filtered by weeks. This helps identify patterns and recurring topics in student questions.</p>
          </div>
          <QuestionClusterGroup unit={unit} />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Unit Analysis</h2>
            <p className="text-muted-foreground">Comprehensive analysis of unit assessments, including common questions, misconceptions, and recommendations per assessment. Gain insights into student performance and learning patterns.</p>
          </div>
          <UnitAnalysisTab unit={unit} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Unit Settings</h2>
            <p className="text-muted-foreground">Configure and manage unit parameters, including semester details, assessment settings, and other unit-specific configurations.</p>
          </div>
          <UnitSettings unit={unit} unitId={unitId} />
        </TabsContent>
      </Tabs>

      <SemesterSelectionDialog
        isOpen={showSemesterDialog}
        onOpenChange={setShowSemesterDialog}
        unitId={unitId}
        onWeeksGenerated={handleWeeksGenerated}
      />
    </div>
  );
}
