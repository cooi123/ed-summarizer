"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Unit } from "@/types/unit";
import { apiEndpoints } from "@/const/apiEndpoints";
import { apiService } from "@/lib/api";
import { PlayCircle, Eye, Download } from "lucide-react";
import useUserStore from "@/store/userStore";
import { Task } from "@/types/task";
import { format, parseISO } from "date-fns";
import { AnalysisReportPreviewDialog } from "../unit-analysis/unit-analysis-preview-dialog";
import { downloadReport, parseDate } from "@/util/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AnalysisReportSummary {
  task_id: string;
  category: string;
  created_at: string;
  status: string;
  error_message: string | null;
}

interface TransactionStatus {
  transactionId: string;
  status: string;
  progress: number;
  name: string;
}

interface RelatedQuestion {
  theme: string;
  summary: string;
  questionIds: string[];
}

interface TaskResult {
  report: string;
  questions?: RelatedQuestion[];
}

interface UnitAnalysisTabProps {
  unit: Unit;
}

export function UnitAnalysisTab({ unit }: UnitAnalysisTabProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Record<string, AnalysisReportSummary[]>>({});
  const [loading, setLoading] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUserStore();
  const [polling, setPolling] = useState(false);


  // Load transaction from localStorage on mount
  useEffect(() => {
    const savedTransaction = localStorage.getItem(`analysis-transaction-${unit.id}`);
    console.log("savedTransaction", savedTransaction);
    if (savedTransaction) {
      const parsed = JSON.parse(savedTransaction);
      setCurrentTransaction(parsed);
    }
  }, [unit.id]);
  // Save transaction to localStorage whenever it changes
  useEffect(() => {
    if (currentTransaction) {
      localStorage.setItem(`analysis-transaction-${unit.id}`, JSON.stringify(currentTransaction));
      if (!isCompletedStatus(currentTransaction.status)) {
        setPolling(true);
      }
    } 
  }, [currentTransaction?.progress, unit.id]);

  const handleCancelTask = async () => {
    if (!currentTransaction) return;
    
    try {
      await apiService.post(apiEndpoints.tasks.cancelTask(currentTransaction.transactionId));
      setCurrentTransaction(null);
      toast({
        title: "Task Cancelled",
        description: "The analysis task has been cancelled.",
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

  // Fetch all analysis reports for the unit
  const fetchAllAnalysisReports = async () => {
    try {
      const response = await apiService.get<AnalysisReportSummary[]>(
        apiEndpoints.tasks.getAllAnalysisReports(unit.id.toString())
      );
      
      // Group tasks by category
      const tasksByCategory: Record<string, AnalysisReportSummary[]> = {};
      response.forEach(task => {
        if (!tasksByCategory[task.category]) {
          tasksByCategory[task.category] = [];
        }
        tasksByCategory[task.category].push(task);
      });
      
      setTasks(tasksByCategory);
    } catch (error) {
      console.error('Error fetching analysis reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analysis reports",
        variant: "destructive",
      });
    }
  };

  // Fetch detailed task data when previewing
  const fetchTaskDetails = async (transactionId: string): Promise<Task | null> => {
    try {
      const response = await apiService.get<Task>(
        apiEndpoints.tasks.getAnalysisReport(transactionId)
      );
      return response;
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch task details",
        variant: "destructive",
      });
      return null;
    }
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.get<string[]>(apiEndpoints.units.getCategories(unit.id));
        response.sort();
        setCategories(response);
        // Initialize tasks for each category
        const initialTasks: Record<string, AnalysisReportSummary[]> = {};
        response.forEach(category => {
          initialTasks[category] = [];
        });
        setTasks(initialTasks);
        
        // Fetch all analysis reports after categories are loaded
        await fetchAllAnalysisReports();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        });
      }
    };

    fetchCategories();
  }, [unit.id]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollTaskStatus = async () => {
      if (!currentTransaction?.transactionId) return;

      try {
        const response = await apiService.get<TransactionStatus>(
          apiEndpoints.tasks.getTaskStatus(currentTransaction.transactionId)
        );

        console.log("response", response);

        setCurrentTransaction(response);

        if (isCompletedStatus(response.status)) {
          setPolling(false);
          clearInterval(pollInterval);
          
          // Refetch all reports when task is completed
          await fetchAllAnalysisReports();
        }
      } catch (error) {
        console.error("Error polling task status:", error);
        setPolling(false);
        clearInterval(pollInterval);
      }
    };

    if (polling) {
      // Poll immediately on mount
      pollTaskStatus();
      
      // Then poll every 5 seconds
      pollInterval = setInterval(pollTaskStatus, 5000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [polling]); // Only depend on polling state

  const handleGenerateReport = async (category: string) => {
    if (currentTransaction && !isCompletedStatus(currentTransaction?.status)) {
      toast({
        title: "Analysis in Progress",
        description: "Please wait for the current analysis to complete before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting analysis for category:', category);
      const response = await apiService.post<{ 
        transactionId: string; 
        status: string; 
        progress: number; 
      }, { 
        unitId: string; 
        userId: string; 
        startDate: string; 
        endDate: string; 
        category: string; 
      }>(
        apiEndpoints.tasks.runAnalysis(),
        {
          unitId: unit.id.toString(),
          userId: user?.id || "",
          startDate: unit.weeks[0].startDate,
          endDate: unit.weeks[unit.weeks.length - 1].endDate,
          category: category
        }
      );

      setCurrentTransaction({
        transactionId: response.transactionId,
        status: response.status,
        progress: response.progress,
        name: category
      });

      toast({
        title: "Report Generation Started",
        description: "Please wait while we generate your report.",
      });

    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate analysis report",
        variant: "destructive",
      });
    }
  };

  const handlePreviewReport = async (transactionId: string) => {
    setLoading(true);
    try {
      const detailedTask = await fetchTaskDetails(transactionId);
      if (detailedTask) {
        setSelectedTask(detailedTask);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      toast({
        title: "Error",
        description: "Failed to preview report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (task: AnalysisReportSummary) => {
    setLoading(true);
    try {
      const detailedTask = await fetchTaskDetails(task.task_id);
      if (detailedTask && detailedTask.result && 'report' in detailedTask.result) {
        const content = detailedTask.result.report as string;
        const formattedDate = formatDate(task.created_at).split(' ')[0].replace(/\//g, '-');
        const fileName = `${unit.code}-${unit.name.replace(/\s+/g, "-").toLowerCase()}-analysis-${task.category}-${formattedDate}.md`;

        downloadReport(content, fileName);
        toast({
          title: "Download Started",
          description: `Downloading report: ${fileName}`,
        });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "completed" || status === "success") {
      return "bg-green-500";
    }
    if (status === "failure" || status === "error") {
      return "bg-red-500";
    }
    if (status === "received" || status === "pending") {
      return "bg-blue-500";
    }
    // For any other status (like fetch_and_store_threads_by_unit_by_category)
    return "bg-blue-500";
  };

  const getStatusText = (status: string, progress: number) => {
    if (status === "completed" || status === "success") {
      return "Completed";
    }
    if (status === "failure") {
      return "Failed";
    }
    if (status === "error") {
      return "Error";
    }
    if (status === "received") {
      return "Received";
    }
    if (status === "pending") {
      return `Processing (${Math.round(progress)}%)`;
    }
    // For any other status, show it in a more readable format
    return `${status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} (${Math.round(progress)}%)`;
  };

  const isCompletedStatus = (status: string) => {
    return ["completed", "success", "failure", "error"].includes(status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* loading progression */}
      {currentTransaction && (
        <Card className="border-2 border-blue-500 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  {!isCompletedStatus(currentTransaction.status) && polling && (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  )}
                  <span className="text-lg font-medium">
                    {isCompletedStatus(currentTransaction.status) 
                      ? `Report for ${currentTransaction.name} ${getStatusText(currentTransaction.status, currentTransaction.progress).toLowerCase()}`
                      : `Generating Report for ${currentTransaction.name}...`}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {!isCompletedStatus(currentTransaction.status) && (
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
                    onClick={() => setCurrentTransaction(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </Button>
                  {isCompletedStatus(currentTransaction.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewReport(currentTransaction.transactionId)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview Report
                    </Button>
                  )}
                </div>
              </div>
              <div className="w-full max-w-md">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${getStatusColor(currentTransaction.status)}`}
                    style={{ width: `${currentTransaction.progress}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-center text-sm text-gray-600">
                  {getStatusText(currentTransaction.status, currentTransaction.progress)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Accordion type="single" collapsible className="w-full">
        {categories.map((category) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-4">
                <span className="font-medium">{category}</span>
                {tasks[category]?.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {tasks[category].length} report{tasks[category].length !== 1 ? 's' : ''} generated
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleGenerateReport(category)}
                    disabled={!!currentTransaction && !isCompletedStatus(currentTransaction?.status || "")}
                    className="flex items-center gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {currentTransaction?.name === category && !isCompletedStatus(currentTransaction?.status) ? "Generating..." : "Run Report"}
                  </Button>
                </div>

                {tasks[category]?.length > 0 ? (
                  <div className="space-y-2">
                    {tasks[category].map((task) => (
                      <Card key={task.task_id} className="hover:bg-muted/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{task.category}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(parseDate(task.created_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                            </div>
                            <span
                              className={`text-sm font-semibold ${
                                task.status === "completed"
                                  ? "text-green-500"
                                  : task.status === "failed"
                                  ? "text-red-500"
                                  : "text-amber-500"
                              }`}
                            >
                              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                            </span>
                          </CardTitle>
                          <CardDescription>
                            <div className="pt-2 flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewReport(task.task_id)}
                                disabled={task.status !== "completed"}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadReport(task)}
                                disabled={task.status !== "completed"}
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
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No analysis reports available. Click "Run Report" to generate one.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {selectedTask && selectedTask.result && 'report' in selectedTask.result && (
        <AnalysisReportPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          report={{
            content: selectedTask.result.report as string,
            createdAt: formatDate(selectedTask.created_at),
            status: selectedTask.status,
            weekInfo: `Category: ${selectedTask.category || 'Unknown'}`,
            relatedQuestions: (selectedTask.result as any).questions || [],
          }}
          unitName={`${unit.code}: ${unit.name}`}
          fileName={`${unit.code}-${unit.name.replace(/\s+/g, "-").toLowerCase()}-analysis-${
            selectedTask.category || 'unknown'
          }-${formatDate(selectedTask.created_at).split(' ')[0].replace(/\//g, '-')}.md`}
        />
      )}
    </div>
  );
} 