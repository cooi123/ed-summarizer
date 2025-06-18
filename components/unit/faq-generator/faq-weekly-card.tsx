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
import { Download, Eye, FileText } from "lucide-react";
import { TaskRun, TaskRunStatusResponse, isCompletedStatus } from "@/store/taskStore";
import { WeekConfig } from "@/types/unit";
import { Unit } from "@/types/unit";
import { useToast } from "@/hooks/use-toast";
import { ReportPreviewDialog } from "../unit-report-preview-dialog";
import { downloadReport } from "@/util/shared";
import useUserStore from "@/store/userStore";
import { parseDate } from "@/util/shared";


interface FAQWeeklyCardProps {
  week: WeekConfig;
  threads: any[];
  reports: TaskRun[];
  unit: Unit;
  onReportStart?: (startDate: Date, endDate: Date) => void;
  onReportEnd?: () => void;
  currentTransaction: TaskRunStatusResponse | null;
}

export function FAQWeeklyCard({
  week,
  threads,
  reports,
  unit,
  onReportStart,
  onReportEnd,
  currentTransaction,
  
}: FAQWeeklyCardProps) {
  const { toast } = useToast();
  const { user } = useUserStore();
  const [selectedRun, setSelectedRun] = useState<TaskRun | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleRunReport = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    if (currentTransaction && !isCompletedStatus(currentTransaction.status)) {
      toast({
        title: "Report in Progress",
        description: "Please wait for the current report to complete before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startDate = parseDate(week.startDate);
      const endDate = parseDate(week.endDate);
      
      onReportStart?.(startDate, endDate);
      
      toast({
        title: "Report Generation Started",
        description: "Please wait while we generate your report.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
      onReportEnd?.();
    }
  };

  const handlePreviewReport = (run: TaskRun) => {
    setSelectedRun(run);
    setIsPreviewOpen(true);
  };

  const downloadReportHandler = (run: TaskRun) => {
    if (!run || !unit) return;

    const content = run.result.report;
    const startDate = run.input?.startDate;
    const formattedDate = startDate
      ? new Date(startDate).toISOString().split("T")[0]
      : new Date(run.created_at).toISOString().split("T")[0];

    const fileName = `${unit.code}-${unit.name
      .replace(/\s+/g, "-")
      .toLowerCase()}-report-${formattedDate}.md`;

    downloadReport(content, fileName);
    toast({
      title: "Download Started",
      description: `Downloading report: ${fileName}`,
    });
  };

  const answeredThreads = threads.filter((t) => t.is_answered).length;
  const unansweredThreads = threads.length - answeredThreads;
  const currentDate = new Date();
  const isFutureWeek = parseDate(week.startDate) > currentDate;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Thread Statistics</CardTitle>
              <CardDescription>
                {answeredThreads} answered, {unansweredThreads} unanswered
              </CardDescription>
            </div>
            <Button
              onClick={handleRunReport}
              disabled={isFutureWeek || (currentTransaction?.status ? !isCompletedStatus(currentTransaction.status) : false)}
              className="flex items-center gap-2"
            >
              <FileText className={`h-4 w-4 ${currentTransaction?.status && !isCompletedStatus(currentTransaction.status) ? 'animate-spin' : ''}`} />
              {currentTransaction?.weekId === week.weekId ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-medium">Generated Reports</h3>
              <div className="space-y-2">
                {reports.map((run) => (
                  <Card key={run.id} className="hover:bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium">{run.task_name || 'Generated Report'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseDate(run.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            run.status === "completed"
                              ? "text-green-500"
                              : run.status === "failed"
                              ? "text-red-500"
                              : "text-amber-500"
                          }`}
                        >
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        <div className="pt-2 flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewReport(run)}
                            disabled={run.status !== "completed"}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReportHandler(run)}
                            disabled={run.status !== "completed"}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No reports generated for this week yet.</p>
          )}
        </CardContent>
      </Card>

      {selectedRun && (
        <ReportPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          report={{
            content: selectedRun.result.report,
            createdAt: selectedRun.created_at,
            status: selectedRun.status,
            weekInfo: `Week ${week.teachingWeekNumber}`,
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