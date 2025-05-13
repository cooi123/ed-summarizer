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
import { useUnitThreads } from "@/hooks/useUnitThreads";

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
    const weekStart = parseDate(week.startDate);
    const weekEnd = parseDate(week.endDate);
    return isWithinInterval(currentDate, { start: weekStart, end: weekEnd });
  };

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
        </Button>
      </div>
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {weeklyData.map(({ week, threadCount, reports: weekReports }) => (
            <AccordionItem 
              key={week.weekNumber} 
              value={week.weekNumber.toString()} 
              className={`${isCurrentWeek(week) ? 'border-2 border-primary shadow-lg bg-primary/10 rounded-lg p-2 mb-2' : ''}`}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <span>Week {week.weekNumber}</span>
                  <Badge variant="outline">
                    {format(parseDate(week.startDate), 'dd/MM/yyyy')} -{" "}
                    {format(parseDate(week.endDate), 'dd/MM/yyyy')}
                  </Badge>
                  <Badge variant="secondary">{threadCount} threads</Badge>
                  {weekReports.length > 0 && (
                    <Badge variant="default">{weekReports.length} FAQ generated</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FAQWeeklyCard
                  week={week}
                  threads={[]}
                  reports={weekReports}
                  unit={unit}
                  onReportStart={onWeeklyReportStart}
                  onReportEnd={onWeeklyReportEnd}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
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
