import { useState } from "react";
import { format, isWithinInterval } from "date-fns";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { TaskRun } from "@/store/taskStore";
import { WeekConfig } from "@/types/unit";
import { Unit } from "@/types/unit";
import { useToast } from "@/hooks/use-toast";
import { ReportPreviewDialog } from "../unit-report-preview-dialog";
import { Badge } from "@/components/ui/badge";
import useUserStore from "@/store/userStore";
import { FAQWeeklyCard } from "./faq-weekly-card";
import { useUnitThreads } from "@/hooks/useUnitThreads";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

export function UnitWeeklyFAQ({ taskRuns, unit, onWeeklyReportStart, onWeeklyReportEnd }: UnitReportHistoryProps) {
  const { toast } = useToast();
  const { user } = useUserStore();
  const [selectedRun, setSelectedRun] = useState<TaskRun | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const {
    weeklyData,
    isLoading,
    isSyncing,
    handleSyncThreads,
  } = useUnitThreads(unit.id.toString(), unit.weeks || [], taskRuns);

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

  return (
    <>
      <div className="flex justify-end mb-4">
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
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {sortedWeeks.map((week) => {
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
                      />
                    </>
                  )}
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
