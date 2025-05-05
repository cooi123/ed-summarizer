"use client";
import { format } from "date-fns";
import { use, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  RefreshCw,
  Clock,
  History,
  CalendarIcon,
  Settings,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportHistory } from "@/components/report-history";
import { WeeklyReport } from "@/components/weekly-report";
import useUnitsStore from "@/store/unitStore";
import { useTaskStore, TaskRun } from "@/store/taskStore";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { UnitSettings } from "@/components/unit-settings";
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export default function UnitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const unitId = params.unitId as string;

  // Get store data
  const { availableUnits } = useUnitsStore();
  const {
    taskRuns,
    currentTaskRun,
    loading,
    error,
    getTaskRuns,
    getLatestTaskRun,
    runTask,
  } = useTaskStore();
  const { user } = useAuth();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [reportContent, setReportContent] = useState<string>("");
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<TaskRun | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("current");
  const [taskRunning, setTaskRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 7)) // Default to 7 days ago
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date()); // Default to today
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [unit, setUnit] = useState<{
    id?: string;
    code: string;
    name: string;
    description?: string;
    content?: string;
    year: number;
    session: string;
  } | null>(null);
  // Task history is now taskRuns
  const history = taskRuns;

  useEffect(() => {
    fetch(`${BASE_URL}/users/units/${unitId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unit not found");
        }
        return response.json();
      })
      .then((data) => {
        setUnit(data);
      })
      .catch((error) => {
        console.error("Error fetching unit data:", error);
        toast({
          title: "Error",
          description: "Unit not found. Redirecting to units page.",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push("/dashboard/units");
        }, 2000);
      });
  }, [unitId, router, toast]);
  // Get the latest completed task or the first one
  const latestRun = currentTaskRun;
  const isRunning = taskRunning;

  // Handle errors from TaskStore
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  console.log(latestRun);

  // Fetch unit data and tasks
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch tasks for this unit using getTaskRuns
        await getTaskRuns(unitId, user.id);

        // Get latest task run
        const latestTaskRun = await getLatestTaskRun(unitId, user.id);
        console.log("Latest Task Run:", latestTaskRun);
        // Set report content from latest task run if available
        if (latestTaskRun?.result) {
          let resultContent = "";

          try {
            // Try to parse the content if it's a JSON string
            const parsedContent =
              typeof latestTaskRun.result === "string"
                ? JSON.parse(latestTaskRun.result)
                : latestTaskRun.result;

            // Check if the content has a "raw" property
            if (parsedContent && parsedContent.raw) {
              resultContent = parsedContent.raw;
            } else {
              // Fallback to stringify if no raw property
              resultContent = JSON.stringify(parsedContent, null, 2);
            }
          } catch (parseError) {
            // If parsing fails, use the original string content
            console.warn("Failed to parse JSON content:", parseError);
            resultContent =
              typeof latestTaskRun.result === "string"
                ? latestTaskRun.result
                : JSON.stringify(latestTaskRun.result, null, 2);
          }

          setReportContent(resultContent);
        }
      } catch (err) {
        // Error handling remains the same...
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [unitId, user, getTaskRuns, getLatestTaskRun, toast]);

  // Setup polling when task is running
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (taskRunning && user) {
      // Start progress animation
      setProgress(10);
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90)); // Cap at 90% until complete
      }, 3000);

      // Poll for updates
      interval = setInterval(async () => {
        const latestRun = await getLatestTaskRun(unitId, user.id);

        if (
          latestRun?.status === "completed" ||
          latestRun?.status === "failed"
        ) {
          setTaskRunning(false);
          clearInterval(interval);
          clearInterval(progressInterval);
          setProgress(latestRun.status === "completed" ? 100 : 0);

          // Update report content
          if (latestRun.result) {
            const resultContent =
              typeof latestRun.result === "string"
                ? latestRun.result
                : JSON.stringify(latestRun.result, null, 2);

            setReportContent(resultContent);
          }

          // Show completion message
          toast({
            title:
              latestRun.status === "completed"
                ? "Report Generated"
                : "Report Failed",
            description:
              latestRun.status === "completed"
                ? "Your report has been successfully generated."
                : `Error: ${latestRun.error_message || "Unknown error"}`,
            variant:
              latestRun.status === "completed" ? "default" : "destructive",
          });
        }
      }, 5000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [taskRunning, unitId, user, getLatestTaskRun, toast]);

  const runWeeklyReport = async (start: Date, end: Date) => {
    try {
      setActiveTab("current");
      setSelectedHistoryRun(null);
      setTaskRunning(true);
      setIsDateDialogOpen(false);

      // Run a new task using the unit ID, user ID, and dates
      if (user) {
        // Modify your task store to accept these additional parameters
        await runTask(unitId, user.id, start, end);

        toast({
          title: "Report generation started",
          description:
            "Your report is being generated for the selected date range. This may take a few minutes.",
        });
      } else {
        throw new Error("User not authenticated");
      }
    } catch (err) {
      console.error("Failed to run task:", err);
      setTaskRunning(false);
      toast({
        title: "Error running task",
        description: "Could not start the report generation. Please try again.",
        variant: "destructive",
      });
    }
  };
  const downloadReport = (content: string) => {
    if (!content || !unit) return;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${unit.code}-${unit.name
      .replace(/\s+/g, "-")
      .toLowerCase()}-weekly-report-${
      new Date().toISOString().split("T")[0]
    }.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const viewHistoryReport = (taskRun: TaskRun) => {
    setSelectedHistoryRun(taskRun);

    // Get report content from the task
    if (taskRun.result) {
      let resultContent = "";

      try {
        // Try to parse the content if it's a JSON string
        const parsedContent =
          typeof taskRun.result === "string"
            ? JSON.parse(taskRun.result)
            : taskRun.result;

        // Check if the content has a "raw" property
        if (parsedContent && parsedContent.raw) {
          resultContent = parsedContent.raw;
        } else {
          // Fallback to stringify if no raw property
          resultContent = JSON.stringify(parsedContent, null, 2);
        }
      } catch (parseError) {
        // If parsing fails, use the original string content
        console.warn("Failed to parse JSON content:", parseError);
        resultContent =
          typeof taskRun.result === "string"
            ? taskRun.result
            : JSON.stringify(taskRun.result, null, 2);
      }

      setReportContent(resultContent);
    } else {
      setReportContent("No content available for this report.");
    }

    setActiveTab("current");
  };

  const viewLatestReport = () => {
    setSelectedHistoryRun(null);

    // Set content from the latest run
    if (latestRun && latestRun.result) {
      let resultContent = "";

      try {
        // Try to parse the content if it's a JSON string
        const parsedContent =
          typeof latestRun.result === "string"
            ? JSON.parse(latestRun.result)
            : latestRun.result;

        // Check if the content has a "raw" property
        if (parsedContent && parsedContent.raw) {
          resultContent = parsedContent.raw;
        } else {
          // Fallback to stringify if no raw property
          resultContent = JSON.stringify(parsedContent, null, 2);
        }
      } catch (parseError) {
        // If parsing fails, use the original string content
        console.warn("Failed to parse JSON content:", parseError);
        resultContent =
          typeof latestRun.result === "string"
            ? latestRun.result
            : JSON.stringify(latestRun.result, null, 2);
      }

      setReportContent(resultContent);
    }
  };

  // Show loading state
  if (isLoading || loading) {
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
        <div className="flex gap-2">
          <Button
            onClick={() => setIsDateDialogOpen(true)}
            disabled={isRunning || loading}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRunning ? "animate-spin" : ""}`}
            />
            {isRunning ? "Generating..." : "Generate Report"}
          </Button>
          {/* Date Selection Dialog - Add this to your component, before the closing div */}
          <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Generate Report</DialogTitle>
                <DialogDescription>
                  Select the date range for your report
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${
                          !startDate && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          setStartDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="endDate"
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${
                          !endDate && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setEndDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (startDate && endDate) {
                      // Check if end date is after start date
                      if (endDate < startDate) {
                        toast({
                          title: "Invalid date range",
                          description: "End date must be after start date",
                          variant: "destructive",
                        });
                        return;
                      }
                      runWeeklyReport(startDate, endDate);
                    }
                  }}
                  disabled={!startDate || !endDate}
                >
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => reportContent && downloadReport(reportContent)}
            disabled={!reportContent || isRunning}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="current"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <Tabs
          defaultValue="current"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList>
            <TabsTrigger value="current">
              <Clock className="mr-2 h-4 w-4" />
              {selectedHistoryRun ? "Historical Report" : "Current Report"}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              Report History ({history.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Unit Settings
            </TabsTrigger>
          </TabsList>

          {/* Existing tab contents */}
          <TabsContent value="current" className="space-y-4">
            {/* Your existing current report content */}
          </TabsContent>

          <TabsContent value="history">
            {/* Your existing history content */}
          </TabsContent>

          {/* New settings tab content */}
          <TabsContent value="settings" className="space-y-6">
            <UnitSettings unit={unit} unitId={unitId} />
          </TabsContent>
        </Tabs>

        <TabsContent value="current" className="space-y-4">
          {isRunning && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Generating Report</CardTitle>
                <CardDescription>
                  Please wait while your report is being generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="text-sm text-right text-muted-foreground">
                    {progress}% complete
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedHistoryRun && (
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Viewing report from:{" "}
                {new Date(selectedHistoryRun.created_at).toLocaleString()}
              </div>
              <Button variant="ghost" size="sm" onClick={viewLatestReport}>
                Return to latest report
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Weekly Report</CardTitle>
              <CardDescription>
                {selectedHistoryRun
                  ? `Generated on ${new Date(
                      selectedHistoryRun.created_at
                    ).toLocaleString()}`
                  : latestRun
                  ? `Last generated on ${new Date(
                      latestRun.created_at
                    ).toLocaleString()}`
                  : "No report has been generated yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyReport content={reportContent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No report history found.
              </div>
            ) : (
              history.map((taskRun) => (
                <div
                  key={taskRun.id}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      Report from{" "}
                      {new Date(taskRun.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created at{" "}
                      {new Date(taskRun.created_at).toLocaleTimeString()}
                      <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-100">
                        {taskRun.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewHistoryReport(taskRun)}
                    >
                      <Clock className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        taskRun.result &&
                        downloadReport(
                          typeof taskRun.result === "string"
                            ? taskRun.result
                            : JSON.stringify(taskRun.result, null, 2)
                        )
                      }
                      disabled={!taskRun.result}
                    >
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
