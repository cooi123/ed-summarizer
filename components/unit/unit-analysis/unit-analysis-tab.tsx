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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUserStore();

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.get<string[]>(apiEndpoints.units.getCategories(unit.id));
        response.sort();
        setCategories(response);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        });
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
        toast({
          title: "Error",
          description: "Failed to fetch analysis reports",
          variant: "destructive",
        });
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

      // Start polling for the report
      const pollInterval = setInterval(async () => {
        try {
          const response = await apiService.get<Task>(
            apiEndpoints.tasks.getAnalysisReport(unit.id.toString(), selectedCategory)
          );
          
          if (response) {
            setTasks([response]); // Store as array with single item
            if (response.status === 'completed') {
              clearInterval(pollInterval);
              setGenerating(false);
              toast({
                title: "Success",
                description: "Analysis report generated successfully",
              });
            } else if (response.status === 'failed') {
              clearInterval(pollInterval);
              setGenerating(false);
              toast({
                title: "Error",
                description: "Report generation failed",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          setGenerating(false);
          toast({
            title: "Error",
            description: "Failed to fetch generated report",
            variant: "destructive",
          });
        }
      }, 5000); // Poll every 5 seconds

      // Clear interval after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (generating) {
          setGenerating(false);
          toast({
            title: "Timeout",
            description: "Report generation took too long. Please try again.",
            variant: "destructive",
          });
        }
      }, 300000);

    } catch (error) {
      setGenerating(false);
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