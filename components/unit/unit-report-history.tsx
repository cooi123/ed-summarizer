import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Copy } from "lucide-react";
import { TaskRun } from "@/store/taskStore";
import { WeekConfig } from "@/types/unit";
import { Unit } from "@/types/unit";
import { useToast } from "@/hooks/use-toast";
import { ReportPreviewDialog } from "./unit-report-preview-dialog";
import { downloadReport } from "@/util/shared";

interface UnitReportHistoryProps {
  taskRuns: TaskRun[];
  unit: Unit;
}

export function UnitReportHistory({ taskRuns, unit }: UnitReportHistoryProps) {
  const { toast } = useToast();
  const [selectedRun, setSelectedRun] = useState<TaskRun | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [weeks] = useState<WeekConfig[]>(unit.weeks || []);

  // Helper function to safely parse dates
  const parseDate = (dateInput: any): Date => {
    if (dateInput instanceof Date) return dateInput;

    try {
      if (typeof dateInput === "string") {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (e) {
      console.error("Failed to parse date:", dateInput);
    }

    return new Date();
  };

  // Get sorted weeks for consistent week numbering
  const sortedWeeks = [...weeks].sort(
    (a, b) =>
      parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
  );

  // Function to find week number(s) for a given date range
  const findWeekNumbers = (startDate: Date, endDate: Date) => {
    const start = parseDate(startDate).getTime();
    const end = parseDate(endDate).getTime();

    const matchingWeeks = sortedWeeks.filter((week) => {
      const weekStart = parseDate(week.startDate).getTime();
      const weekEnd = parseDate(week.endDate).getTime();

      // Consider overlapping date ranges
      return (
        (start >= weekStart && start <= weekEnd) || // Start date falls within week
        (end >= weekStart && end <= weekEnd) || // End date falls within week
        (start <= weekStart && end >= weekEnd) // Week is entirely contained within range
      );
    });

    if (matchingWeeks.length === 0) return "No matching weeks";
    if (matchingWeeks.length === 1)
      return `Week ${matchingWeeks[0].weekNumber}`;

    // Check if weeks are consecutive
    const weekNumbers = matchingWeeks
      .map((w) => w.weekNumber)
      .sort((a, b) => a - b);
    if (
      weekNumbers.length ===
      weekNumbers[weekNumbers.length - 1] - weekNumbers[0] + 1
    ) {
      return `Weeks ${weekNumbers[0]}-${weekNumbers[weekNumbers.length - 1]}`;
    }

    return `Weeks ${weekNumbers.join(", ")}`;
  };

  // Function to handle report preview
  const handlePreviewReport = (run: TaskRun) => {
    setSelectedRun(run);
    setIsPreviewOpen(true);
  };

  // Function to download a report
  const downloadReportHandler = (run: TaskRun) => {
    if (!run || !unit) return;

    const content = run.result.report;
    // Extract date information for filename
    const startDate = run.input?.startDate;
    const formattedDate = startDate
      ? new Date(startDate).toISOString().split("T")[0]
      : new Date(run.created_at).toISOString().split("T")[0];

    // Create filename
    const fileName = `${unit.code}-${unit.name
      .replace(/\s+/g, "-")
      .toLowerCase()}-report-${formattedDate}.md`;

    downloadReport(content, fileName);
    toast({
      title: "Download Started",
      description: `Downloading report: ${fileName}`,
    });
  };

  if (taskRuns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No History Available</CardTitle>
          <CardDescription>
            You haven't generated any reports for this unit yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {taskRuns.map((run) => {
          // Extract dates and find corresponding weeks - handle both input formats
          const startDate = run.input?.startDate;
          const endDate = run.input?.endDate;

          let weekInfo = "No date information";
          if (startDate && endDate) {
            weekInfo = findWeekNumbers(new Date(startDate), new Date(endDate));
          }

          return (
            <Card key={run.id} className="hover:bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>
                    {new Date(run.created_at).toLocaleDateString()} at{" "}
                    {new Date(run.created_at).toLocaleTimeString()}
                  </span>
                  <span
                    className={`text-sm ${
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
                <CardDescription className="space-y-1">
                  {startDate && endDate ? (
                    <>
                      <div>
                        Period: {format(new Date(startDate), "MMM d, yyyy")} -{" "}
                        {format(new Date(endDate), "MMM d, yyyy")}
                      </div>
                      <div className="font-medium text-primary">{weekInfo}</div>
                    </>
                  ) : (
                    "No date range specified"
                  )}

                  <div className="pt-2 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewReport(run);
                      }}
                      disabled={run.status !== "completed"}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadReportHandler(run);
                      }}
                      disabled={run.status !== "completed"}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Use the separate preview dialog component */}
      {selectedRun && (
        <ReportPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          report={{
            content: selectedRun.result.report,
            createdAt: selectedRun.created_at,
            status: selectedRun.status,
            weekInfo:
              selectedRun.input?.startDate && selectedRun.input?.endDate
                ? findWeekNumbers(
                    new Date(selectedRun.input.startDate),
                    new Date(selectedRun.input.endDate)
                  )
                : "No date information",
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
