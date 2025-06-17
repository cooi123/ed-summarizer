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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/units/${unitId}/weekly-faq`)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Weekly Thread Analytics
            </CardTitle>
            <CardDescription>
              Generate weekly FAQ templates based on categorized questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {taskRuns.length} reports generated
              </Badge>
              <Button variant="ghost" size="sm">
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/units/${unitId}/question-clusters`)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Question Clusters
            </CardTitle>
            <CardDescription>
              View and analyze clusters of questions grouped by common themes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {unit.weeks?.length || 0} weeks analyzed
              </Badge>
              <Button variant="ghost" size="sm">
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/units/${unitId}/analysis`)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Unit Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of unit assessments and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                View Insights
              </Badge>
              <Button variant="ghost" size="sm">
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>

      <SemesterSelectionDialog
        isOpen={showSemesterDialog}
        onOpenChange={setShowSemesterDialog}
        unitId={unitId}
        onWeeksGenerated={handleWeeksGenerated}
      />
    </div>
  );
}
