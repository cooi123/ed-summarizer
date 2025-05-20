"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Unit } from "@/types/unit";
import { apiEndpoints } from "@/const/apiEndpoints";
import { apiService } from "@/lib/api";
import { PlayCircle, Eye, Download } from "lucide-react";
import useUserStore from "@/store/userStore";
import { Task } from "@/types/task";
import ReactMarkdown from 'react-markdown';
import { format, parseISO } from "date-fns";
import { ReportPreviewDialog } from "../unit-report-preview-dialog";
import { downloadReport, parseDate } from "@/util/shared";
import { AnalysisReportPreviewDialog } from "../unit-analysis/unit-analysis-preview-dialog";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(120); // 2 minutes in seconds
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUserStore();

  // Timer effect for countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [generating, timeRemaining]);

  // Check for existing timer on mount
  useEffect(() => {
    const checkExistingTimer = () => {
      const timerData = localStorage.getItem(`analysis-timer-${unit.id}-${selectedCategory}`);
      if (timerData) {
        const { endTime } = JSON.parse(timerData);
        const now = new Date().getTime();
        const timeLeft = endTime - now;

        if (timeLeft > 0) {
          setGenerating(true);
          setTimeRemaining(Math.ceil(timeLeft / 1000));
          setTimeout(() => {
            setGenerating(false);
            window.location.reload();
          }, timeLeft);
        } else {
          localStorage.removeItem(`analysis-timer-${unit.id}-${selectedCategory}`);
          window.location.reload();
        }
      }
    };

    if (selectedCategory) {
      checkExistingTimer();
    }
  }, [unit.id, selectedCategory]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.get<string[]>(apiEndpoints.units.getCategories(unit.id));
        response.sort();
        setCategories(response);
      } catch (error) {
      
      }
    };

    fetchCategories();
  }, [unit.id, toast]);

  // Fetch tasks when category changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedCategory) return;
      
      setLoading(true);
      try {
        const response = await apiService.get<Task>(apiEndpoints.tasks.getAnalysisReport(unit.id.toString(), selectedCategory));
        if (response) {
          setTasks([response]); // Store as array with single item
        }
      } catch (error) {
      
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [unit.id, selectedCategory, toast]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleGenerateReport = async () => {
    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Please select a category first",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setTimeRemaining(120); // Reset timer to 2 minutes
    try {
      await apiService.post(
        apiEndpoints.tasks.runAnalysis(),
        { 
          unitId: unit.id.toString(), 
          userId: user?.id, 
          startDate: unit.weeks[0].startDate, 
          endDate: unit.weeks[unit.weeks.length - 1].endDate, 
          category: selectedCategory 
        }
      );

      const endTime = new Date().getTime() + 120000;
      localStorage.setItem(
        `analysis-timer-${unit.id}-${selectedCategory}`,
        JSON.stringify({ endTime })
      );

      toast({
        title: "Report Generation Started",
        description: "Please wait while we generate your report.",
      });

      setTimeout(() => {
        setGenerating(false);
        localStorage.removeItem(`analysis-timer-${unit.id}-${selectedCategory}`);
        window.location.reload();
      }, 120000);

    } catch (error) {
      setGenerating(false);
      setTimeRemaining(120);
      localStorage.removeItem(`analysis-timer-${unit.id}-${selectedCategory}`);
      toast({
        title: "Error",
        description: "Failed to generate analysis report",
        variant: "destructive",
      });
    }
  };

  const handlePreviewReport = (task: Task) => {
    setSelectedTask(task);
    setIsPreviewOpen(true);
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleDownloadReport = (task: Task) => {
    if (!task || !unit || !task.result || !('report' in task.result)) return;

    const content = task.result.report as string;
    const formattedDate = formatDate(task.created_at).split(' ')[0].replace(/\//g, '-');
    const fileName = `${unit.code}-${unit.name.replace(/\s+/g, "-").toLowerCase()}-analysis-${selectedCategory}-${formattedDate}.md`;

    downloadReport(content, fileName);
    toast({
      title: "Download Started",
      description: `Downloading report: ${fileName}`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Select Category</label>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleGenerateReport}
                  disabled={!selectedCategory || generating}
                  className="flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  {generating ? "Generating..." : "Run Report"}
                </Button>
              </div>
            </div>

            {generating && (
              <Card className="border-2 border-blue-500">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="text-lg font-medium">Generating Report...</span>
                    </div>
                    <div className="w-full max-w-md">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full transition-all duration-1000"
                          style={{ width: `${((120 - timeRemaining) / 120) * 100}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-center text-sm text-gray-600">
                        Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(loading || generating) ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium">Generated Reports</h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <Card key={task.id} className="hover:bg-muted/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">{task.name || 'Analysis Report'}</span>
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
                              onClick={() => handlePreviewReport(task)}
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
              </div>
            ) : selectedCategory ? (
              <p className="text-muted-foreground">No analysis reports available for this category. Click "Run Report" to generate one.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selectedTask && selectedTask.result && 'report' in selectedTask.result && (
        <AnalysisReportPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          report={{
            content: selectedTask.result.report as string,
            createdAt: formatDate(selectedTask.created_at),
            status: selectedTask.status,
            weekInfo: `Category: ${selectedCategory}`,
            relatedQuestions: (selectedTask.result as any).questions || [],
          }}
          unitName={`${unit.code}: ${unit.name}`}
          fileName={`${unit.code}-${unit.name.replace(/\s+/g, "-").toLowerCase()}-analysis-${selectedCategory}-${
            formatDate(selectedTask.created_at).split(' ')[0].replace(/\//g, '-')
          }.md`}
        />
      )}
    </div>
  );
} 