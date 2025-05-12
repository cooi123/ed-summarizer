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
import { Download, Eye, MessageSquare, RefreshCw, FileText } from "lucide-react";
import { TaskRun } from "@/store/taskStore";
import { WeekConfig } from "@/types/unit";
import { Unit } from "@/types/unit";
import { useToast } from "@/hooks/use-toast";
import { ReportPreviewDialog } from "../unit-report-preview-dialog";
import { downloadReport } from "@/util/shared";
import { apiService } from "@/lib/api";
import { apiEndpoints } from "@/const/apiEndpoints";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import useUserStore from "@/store/userStore";
import { useTaskStore } from "@/store/taskStore";
import { FAQWeeklyCard } from "./faq-weekly-card";
import { parseDate } from "@/util/shared";

interface UnitReportHistoryProps {
  taskRuns: TaskRun[];
  unit: Unit;
  onWeeklyReportStart?: () => void;
  onWeeklyReportEnd?: () => void;
}

interface Thread {
  id: string;
  created_at: string;
  is_answered: boolean;
}

interface ThreadData {
  unit_id: string;
  unit_name: string;
  threads: Thread[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

interface WeeklyData {
  week: WeekConfig;
  threads: Thread[];
  reports: TaskRun[];
}

export function UnitWeeklyFAQ({ taskRuns, unit, onWeeklyReportStart, onWeeklyReportEnd }: UnitReportHistoryProps) {
  const { toast } = useToast();
  const { user } = useUserStore();
  const [selectedRun, setSelectedRun] = useState<TaskRun | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [weeks] = useState<WeekConfig[]>(unit.weeks || []);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);

  // Get sorted weeks for consistent week numbering
  const sortedWeeks = [...weeks].sort(
    (a, b) =>
      parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
  );

  const handleSyncThreads = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);
      const response = await apiService.get<ThreadData>(
        apiEndpoints.units.getThreads(unit.id.toString())
      );
      setThreads(response.threads);
      await fetchThreads(); // Refresh thread data after sync
      toast({
        title: "Success",
        description: "Threads synchronized successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync threads",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchThreads = async () => {
    try {
      setLoading(true);
      let allThreads: Thread[] = [];
      let currentPage = 1;
      let hasNext = true;

      // Fetch all pages of threads
      while (hasNext) {
        const threadData = await apiService.get<ThreadData>(
          `${apiEndpoints.units.getThreads(unit.id.toString())}?page=${currentPage}`
        );
        allThreads = [...allThreads, ...threadData.threads];
        hasNext = threadData.pagination.has_next;
        currentPage++;
      }



      // Initialize weekly data structure
      const weeklyDataMap = new Map<number, WeeklyData>();
      sortedWeeks.forEach((week) => {
        weeklyDataMap.set(week.weekNumber, {
          week,
          threads: [],
          reports: [],
        });
      });

      // Assign threads to weeks
      allThreads.forEach((thread: Thread) => {
        const threadDate = new Date(thread.created_at);

        let assignedWeekNumber: number | null = null;

        // Find matching week based on date range
        const matchingWeek = sortedWeeks.find((week) => {
          const weekStart = parseDate(week.startDate);
          const weekEnd = parseDate(week.endDate);
          const isInWeek = isWithinInterval(threadDate, { start: weekStart, end: weekEnd });

          return isInWeek;
        });

        if (matchingWeek) {
          assignedWeekNumber = matchingWeek.weekNumber;
        } else {
          // If no direct match, find the latest preceding week (handle gaps)
          const priorWeek = sortedWeeks.reduce((latestPrior, currentWeek) => {
            const currentEnd = parseDate(currentWeek.endDate);
            if (currentEnd < threadDate) {
              if (!latestPrior || currentEnd > parseDate(latestPrior.endDate)) {
                return currentWeek;
              }
            }
            return latestPrior;
          }, null as WeekConfig | null);

          if (priorWeek) {
            assignedWeekNumber = priorWeek.weekNumber;
          } 
        }

        // Add thread to the assigned week's data
        if (assignedWeekNumber !== null) {
          const weekData = weeklyDataMap.get(assignedWeekNumber);
          if (weekData) {
            weekData.threads.push(thread);
          }
        }
      });

      // Assign reports to weeks (existing logic)
      taskRuns.forEach((run) => {
        if (run.input?.startDate && run.input?.endDate) {
          const startDate = new Date(run.input.startDate);
          const endDate = new Date(run.input.endDate);
          
          sortedWeeks.forEach((week) => {
            const weekStart = parseDate(week.startDate);
            const weekEnd = parseDate(week.endDate);
            const isOverlapping = (
              (startDate >= weekStart && startDate <= weekEnd) ||
              (endDate >= weekStart && endDate <= weekEnd) ||
              (startDate <= weekStart && endDate >= weekEnd)
            );

            if (isOverlapping) {
              const weekData = weeklyDataMap.get(week.weekNumber);
              if (weekData) {
                // Avoid duplicate report entries if it spans multiple weeks
                if (!weekData.reports.some(r => r.id === run.id)) {
                    weekData.reports.push(run);
                }
              }
            }
          });
        }
      });

      const finalWeeklyData = Array.from(weeklyDataMap.values());
      console.log('Final weekly data:', finalWeeklyData);
      setWeeklyData(finalWeeklyData);
      setThreads(allThreads); // Keep the full list for filtering in render
    } catch (error) {
      console.error('Error in fetchThreads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch thread data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [unit.id]);

  if (loading) {
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
    const weekStart = parseDate(week.startDate);
    const weekEnd = parseDate(week.endDate);
    return isWithinInterval(currentDate, { start: weekStart, end: weekEnd });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleSyncThreads}
          disabled={syncing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Threads'}
        </Button>
      </div>
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {weeklyData.map(({ week, threads: weekThreads, reports: weekReports }) => {
            return (
              <AccordionItem 
                key={week.weekNumber} 
                value={week.weekNumber.toString()} 
                className={`${ isCurrentWeek(week) ? 'border-2 border-primary shadow-lg bg-primary/10 rounded-lg p-2 mb-2' : ''}`}
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-4">
                    <span>Week {week.weekNumber}</span>
                    <Badge variant="outline">
                      {format(parseDate(week.startDate), 'dd/MM/yyyy')} -{" "}
                      {format(parseDate(week.endDate), 'dd/MM/yyyy')}
                    </Badge>
                    <Badge variant="secondary">{weekThreads.length} threads</Badge>
                    {weekReports.length > 0 && (
                      <Badge variant="default">{weekReports.length} FAQ generated</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <FAQWeeklyCard
                    week={week}
                    threads={weekThreads}
                    reports={weekReports}
                    unit={unit}
                    onReportStart={onWeeklyReportStart}
                    onReportEnd={onWeeklyReportEnd}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
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
                const matchingWeek = sortedWeeks.find(
                  (week) =>
                    (startDate >= parseDate(week.startDate) && startDate <= parseDate(week.endDate)) ||
                    (endDate >= parseDate(week.startDate) && endDate <= parseDate(week.endDate)) ||
                    (startDate <= parseDate(week.startDate) && endDate >= parseDate(week.endDate))
                );
                return matchingWeek ? `Week ${matchingWeek.weekNumber}` : "N/A";
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
