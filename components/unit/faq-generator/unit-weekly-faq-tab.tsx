import { useState, useEffect } from "react";
import { format, isWithinInterval } from "date-fns";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, History } from "lucide-react";
import { TaskRun, useTaskStore, TaskRunStatusResponse } from "@/store/taskStore";
import { WeekConfig } from "@/types/unit";
import { Unit } from "@/types/unit";
import { useToast } from "@/hooks/use-toast";
import { ReportPreviewDialog } from "../unit-report-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { FAQWeeklyCard } from "./faq-weekly-card";
import { useUnitThreads } from "@/hooks/useUnitThreads";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiService } from "@/lib/api";
import { apiEndpoints } from "@/const/apiEndpoints";
import { isCompletedStatus } from "@/store/taskStore";

interface UnitReportHistoryProps {
  taskRuns: TaskRun[];
  unit: Unit;
  onWeeklyReportStart?: () => void;
  onWeeklyReportEnd?: () => void;
}

interface WeekData {
  weekId: number;
  teachingWeekNumber: number;
  weekType: string;
  startDate: string;
  endDate: string;
  content: string;
  threadCount: number;
  faqReports: TaskRun[];
  categoryCounts?: Record<string, number>;
}

interface UnitWeekData {
  unit_id: string;
  unit_name: string;
  weeks: WeekData[];
}

type ViewMode = "current" | "all"

export function UnitWeeklyFAQ({ taskRuns, unit, onWeeklyReportStart, onWeeklyReportEnd }: UnitReportHistoryProps) {
  const { toast } = useToast();
  const [selectedRun, setSelectedRun] = useState<TaskRun | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const { currentTaskRun, stopPolling } = useTaskStore();

  const {
    weeklyData,
    isLoading,
    isSyncing,
    handleSyncThreads,
  } = useUnitThreads(unit.id.toString(), unit.weeks || [], taskRuns);

  const isValidStatus = (status: string): status is TaskRunStatusResponse["status"] => {
    return ["received", "pending", "completed", "success", "failure", "error"].includes(status);
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

  const getBreakLabel = (weekType: string) => {
    switch (weekType) {
      case 'midsem':
        return 'MID-SEMESTER BREAK';
      case 'swotvac':
        return 'SWOT VAC';
      default:
        return 'BREAK';
    }
  };

  const getBreakStyles = (weekType: string) => {
    switch (weekType) {
      case 'midsem':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300';
      case 'swotvac':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-muted border-muted-foreground/20 text-muted-foreground';
    }
  };



  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Weekly FAQ Data...</CardTitle>
          <CardDescription>Please wait while we fetch the data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!unit.weeks || unit.weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Weekly Data Available</CardTitle>
          <CardDescription>
            No weeks have been configured for this unit yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isCurrentWeek = (week: WeekConfig) => {
    const currentDate = new Date();
    const weekStart = new Date(week.startDate);
    const weekEnd = new Date(week.endDate);
    
    // Set all times to midnight for accurate date comparison
    currentDate.setHours(0, 0, 0, 0);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999); // End of day for end date
    
    return isWithinInterval(currentDate, { start: weekStart, end: weekEnd });
  };

  // Sort weeks by start date
  const sortedWeeks = [...unit.weeks].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // Find current week
  const currentWeek = sortedWeeks.find(week => isCurrentWeek(week));

  // Filter weeks based on view mode
  const getFilteredWeeks = () => {
    switch (viewMode) {
      case "current":
        return currentWeek ? [currentWeek] : [];
      case "all":
        return sortedWeeks;
      default:
        return [];
    }
  };

  const filteredWeeks = getFilteredWeeks();

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList>
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Current Week
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              All Weeks
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          onClick={handleSyncThreads}
          disabled={isSyncing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Threads'}
          {unit.last_sync_at && !isSyncing && (
            <span className="text-xs text-muted-foreground ml-2">
              Last sync: {format(new Date(unit.last_sync_at), 'MMM d, h:mm a')}
            </span>
          )}
        </Button>
      </div>

      {currentTaskRun && (
        <Card className="border-2 border-blue-500 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  {!isCompletedStatus(currentTaskRun.status) && (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  )}
                  <span className="text-lg font-medium">
                    {isCompletedStatus(currentTaskRun.status) 
                      ? `Report for ${currentTaskRun.name} ${currentTaskRun.status.toLowerCase()}`
                      : `Generating Report for ${currentTaskRun.name}...`}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {!isCompletedStatus(currentTaskRun.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelTask}
                      className="text-red-500 hover:text-red-700"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopPolling}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <div className="w-full max-w-md">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      currentTaskRun.status === "completed" || currentTaskRun.status === "success"
                        ? "bg-green-500"
                        : currentTaskRun.status === "failure" || currentTaskRun.status === "error"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${currentTaskRun.progress}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-center text-sm text-gray-600">
                  {currentTaskRun.status === "completed" || currentTaskRun.status === "success"
                    ? "Completed"
                    : currentTaskRun.status === "failure"
                    ? "Failed"
                    : currentTaskRun.status === "error"
                    ? "Error"
                    : currentTaskRun.status === "received"
                    ? "Received"
                    : currentTaskRun.status === "pending"
                    ? `Processing (${Math.round(currentTaskRun.progress)}%)`
                    : `${currentTaskRun.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} (${Math.round(currentTaskRun.progress)}%)`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {viewMode === "current" && !currentWeek ? (
          <Card>
            <CardHeader>
              <CardTitle>No Current Week</CardTitle>
              <CardDescription>
                There is no active teaching week at the moment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredWeeks.map((week) => {
              const weekData = weeklyData.find(w => w.weekId === week.weekId);
              const isBreak = week.weekType === 'midsem' || week.weekType === 'swotvac';
              
              return (
                <AccordionItem 
                  key={week.weekId} 
                  value={week.weekId.toString()} 
                  className={`${isCurrentWeek(week) ? 'border-2 border-primary shadow-lg bg-primary/10 rounded-lg p-2 mb-2' : ''} ${isBreak ? getBreakStyles(week.weekType) : ''}`}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      {isBreak ? (
                        <div className={`px-2 py-1 rounded-md text-xs ${getBreakStyles(week.weekType)}`}>
                          {getBreakLabel(week.weekType)}
                        </div>
                      ) : (
                        <span>Week {week.teachingWeekNumber}</span>
                      )}
                      <Badge variant="outline">
                        {format(new Date(week.startDate), 'dd/MM/yyyy')} -{" "}
                        {format(new Date(week.endDate), 'dd/MM/yyyy')}
                      </Badge>
                      {weekData && (
                        <>
                          <Badge variant="secondary">{weekData.threadCount} threads</Badge>
                          {weekData.faqReports.length > 0 && (
                            <Badge variant="default">{weekData.faqReports.length} FAQ generated</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {weekData && (
                      <>
                        {weekData.categoryCounts && Object.entries(weekData.categoryCounts).length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Category Distribution:</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(weekData.categoryCounts).map(([category, count]) => (
                                <Badge key={category} variant="outline" className="flex items-center gap-1">
                                  <span>{category}:</span>
                                  <span className="font-semibold">{count}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <FAQWeeklyCard
                          week={week}
                          threads={[]}
                          reports={weekData.faqReports}
                          unit={unit}
                          onReportStart={onWeeklyReportStart}
                          onReportEnd={onWeeklyReportEnd}
                          currentTransaction={currentTaskRun}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {selectedRun && (
        <ReportPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          report={{
            content: selectedRun.result.report,
            createdAt: selectedRun.created_at,
            status: selectedRun.status,
            weekInfo: (() => {
              if (selectedRun.input?.startDate && selectedRun.input?.endDate) {
                const startDate = new Date(selectedRun.input.startDate);
                const endDate = new Date(selectedRun.input.endDate);
                const matchingWeek = unit.weeks?.find(
                  (week) =>
                    (startDate >= new Date(week.startDate) && startDate <= new Date(week.endDate)) ||
                    (endDate >= new Date(week.startDate) && endDate <= new Date(week.endDate)) ||
                    (startDate <= new Date(week.startDate) && endDate >= new Date(week.endDate))
                );
                return matchingWeek ? `Week ${matchingWeek.teachingWeekNumber}` : "N/A";
              }
              return "N/A";
            })(),
          }}
          unitName={`${unit.code}: ${unit.name}`}
          fileName={`${unit.code}-${unit.name
            .replace(/\s+/g, "-")
            .toLowerCase()}-report-${
            new Date(selectedRun.created_at).toISOString().split("T")[0]
          }.md`}
        />
      )}
    </>
  );
}
