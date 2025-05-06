import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useUnitStore } from "@/store/unitStore";
import { useTaskStore } from "@/store/taskStore";
import useUserStore from "@/store/userStore";

interface UnitGenerateReportDialogProps {
  unitId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskStarted?: () => void; // Optional callback for parent components
}

export function UnitGenerateReportDialog({
  unitId,
  isOpen,
  onOpenChange,
  onTaskStarted,
}: UnitGenerateReportDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<
    "single" | "range" | "all"
  >("single");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedStartWeek, setSelectedStartWeek] = useState<number | null>(
    null
  );
  const [selectedEndWeek, setSelectedEndWeek] = useState<number | null>(null);

  // Get user information for the task
  const currentUser = useUserStore((state) => state.user);
  if (!currentUser) {
    toast({
      title: "User Not Found",
      description: "Please log in to generate reports.",
      variant: "destructive",
    });
    return null;
  }
  const user = currentUser;

  // Get unit data containing week configuration
  const unit = useUnitStore((state) => state.unit);
  const weeks = unit?.weeks || [];

  // Get task-related functions from store
  const runTask = useTaskStore((state) => state.runTask);

  // Helper function to parse dates safely
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

  // Sort weeks by number for display
  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  const handleGenerateReport = async () => {
    if (isGenerating || !user) return;

    try {
      setIsGenerating(true);
      let startDate: Date;
      let endDate: Date;

      switch (selectedOption) {
        case "single":
          // Single week selected
          if (selectedWeek === null) {
            toast({
              title: "Selection Required",
              description: "Please select a week",
              variant: "destructive",
            });
            return;
          }

          const week = sortedWeeks.find((w) => w.weekNumber === selectedWeek);
          if (!week) {
            toast({
              title: "Invalid Selection",
              description: "The selected week could not be found",
              variant: "destructive",
            });
            return;
          }

          startDate = parseDate(week.startDate);
          endDate = parseDate(week.endDate);
          break;

        case "range":
          // Range of weeks
          if (selectedStartWeek === null || selectedEndWeek === null) {
            toast({
              title: "Selection Required",
              description: "Please select both start and end weeks",
              variant: "destructive",
            });
            return;
          }

          if (selectedEndWeek < selectedStartWeek) {
            toast({
              title: "Invalid Range",
              description: "End week must be after start week",
              variant: "destructive",
            });
            return;
          }

          const startWeek = sortedWeeks.find(
            (w) => w.weekNumber === selectedStartWeek
          );
          const endWeek = sortedWeeks.find(
            (w) => w.weekNumber === selectedEndWeek
          );

          if (!startWeek || !endWeek) {
            toast({
              title: "Invalid Selection",
              description: "One or more selected weeks could not be found",
              variant: "destructive",
            });
            return;
          }

          startDate = parseDate(startWeek.startDate);
          endDate = parseDate(endWeek.endDate);
          break;

        case "all":
          // All weeks
          if (sortedWeeks.length === 0) {
            toast({
              title: "No Weeks Available",
              description: "There are no weeks configured for this unit",
              variant: "destructive",
            });
            return;
          }

          startDate = parseDate(sortedWeeks[0].startDate);
          endDate = parseDate(sortedWeeks[sortedWeeks.length - 1].endDate);
          break;

        default:
          toast({
            title: "Invalid Selection",
            description: "Please select a valid option",
            variant: "destructive",
          });
          return;
      }

      // Call runTask with the selected date range
      const taskResult = await runTask(unitId, user.id, startDate, endDate);

      // Check if the task was created successfully
      if (taskResult) {
        toast({
          title: "Report Generation Started",
          description:
            "Your report is being generated and will be available soon.",
        });

        // Notify parent component that task started (for polling setup)
        if (onTaskStarted) {
          onTaskStarted();
        }

        // Close the dialog
        onOpenChange(false);
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // No weeks configured case
  if (sortedWeeks.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>No week configuration found</DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground">
            Please configure weeks for this unit before generating reports.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Select weeks to include in your report
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select
              value={selectedOption}
              onValueChange={(value: "single" | "range" | "all") => {
                setSelectedOption(value);
                // Reset selections when changing type
                setSelectedWeek(null);
                setSelectedStartWeek(null);
                setSelectedEndWeek(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Report Coverage</SelectLabel>
                  <SelectItem value="single">Single Week</SelectItem>
                  <SelectItem value="range">Range of Weeks</SelectItem>
                  <SelectItem value="all">All Weeks</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedOption === "single" && (
            <div className="grid gap-2">
              <Label htmlFor="week">Week</Label>
              <Select
                value={selectedWeek?.toString() || ""}
                onValueChange={(value) => setSelectedWeek(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Weeks</SelectLabel>
                    {sortedWeeks.map((week) => (
                      <SelectItem
                        key={week.weekNumber}
                        value={week.weekNumber.toString()}
                      >
                        Week {week.weekNumber}:{" "}
                        {format(parseDate(week.startDate), "MMM d")} -{" "}
                        {format(parseDate(week.endDate), "MMM d")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedOption === "range" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="startWeek">Start Week</Label>
                <Select
                  value={selectedStartWeek?.toString() || ""}
                  onValueChange={(value) =>
                    setSelectedStartWeek(parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select start week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Available Weeks</SelectLabel>
                      {sortedWeeks.map((week) => (
                        <SelectItem
                          key={`start-${week.weekNumber}`}
                          value={week.weekNumber.toString()}
                        >
                          Week {week.weekNumber}:{" "}
                          {format(parseDate(week.startDate), "MMM d")}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endWeek">End Week</Label>
                <Select
                  value={selectedEndWeek?.toString() || ""}
                  onValueChange={(value) => setSelectedEndWeek(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select end week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Available Weeks</SelectLabel>
                      {sortedWeeks.map((week) => (
                        <SelectItem
                          key={`end-${week.weekNumber}`}
                          value={week.weekNumber.toString()}
                        >
                          Week {week.weekNumber}:{" "}
                          {format(parseDate(week.endDate), "MMM d")}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedOption === "all" && (
            <div className="py-2 text-sm text-muted-foreground">
              This will generate a report covering all {sortedWeeks.length}{" "}
              weeks from{" "}
              {format(parseDate(sortedWeeks[0].startDate), "MMMM d, yyyy")} to{" "}
              {format(
                parseDate(sortedWeeks[sortedWeeks.length - 1].endDate),
                "MMMM d, yyyy"
              )}
              .
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={
              isGenerating ||
              (selectedOption === "single" && selectedWeek === null) ||
              (selectedOption === "range" &&
                (selectedStartWeek === null || selectedEndWeek === null))
            }
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
