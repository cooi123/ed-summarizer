import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { use, useEffect, useState } from "react";
import { Plus, Trash2, Calendar, RefreshCw, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { WeekConfig } from "@/types/unit";
import { updateAllWeeks, useUnitStore } from "@/store/unitStore";
import { generateWeeks } from "@/util/shared";
import { Switch } from "../ui/switch";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiService } from "@/lib/api";
import { generateWeeksFromSemester, Semester } from "@/util/semester";
import { SemesterSelectionDialog } from "./semester-selection-dialog";

interface UnitWeekConfiguratorProps {
  weeks: WeekConfig[];
  unitId: string;
}

export function UnitWeekConfigurator({
  weeks: initialWeeks,
  unitId,
}: UnitWeekConfiguratorProps) {
  const { toast } = useToast();

  const [weeks, setWeeks] = useState<WeekConfig[]>(initialWeeks || []);
  const [isSaving, setIsSaving] = useState(false);
  const [showSemesterDialog, setShowSemesterDialog] = useState(weeks.length === 0);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(false);

  // Get update status from store
  const isUpdating = useUnitStore((state) => state.isUpdating);
  const unit = useUnitStore((state) => state.unit);

  // State for date pickers
  const [datePickerOpen, setDatePickerOpen] = useState<{
    week: number;
    type: "start" | "end";
  } | null>(null);


  // Update parent component when weeks change
  const updateWeeks = (newWeeks: WeekConfig[]) => {
    // Sort by start date
    const sortedWeeks = [...newWeeks].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Re-number weeks sequentially
    const renumberedWeeks = sortedWeeks.map((week, idx) => ({
      ...week,
      weekId: idx + 1,
      teachingWeekNumber: week.weekType === 'teaching' ? idx + 1 : 0,
    }));

    setWeeks(renumberedWeeks);
  };

  // Update the content for a specific week
  const updateWeekContent = (weekId: number, content: string) => {
    const newWeeks = weeks.map((week) => {
      if (week.weekId === weekId) {
        return {
          ...week,
          content,
        };
      }
      return week;
    });
    updateWeeks(newWeeks);
  };

  const saveWeeks = async () => {
    if (isSaving || isUpdating) return;
    setIsSaving(true);
    try {
      await updateAllWeeks(unitId, weeks);
      toast({
        title: "Weeks Updated",
        description: "Week configuration has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save weeks:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem saving the week configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateWeekDate = (
    weekId: number,
    type: "start" | "end",
    date: Date
  ) => {
    const newWeeks = weeks.map((week) => {
      if (week.weekId === weekId) {
        return {
          ...week,
          [type === "start" ? "startDate" : "endDate"]: date.toISOString(),
        };
      }
      return week;
    });

    updateWeeks(newWeeks);
    setDatePickerOpen(null);
  };

  return (
    <>
      <SemesterSelectionDialog
        isOpen={showSemesterDialog}
        onOpenChange={setShowSemesterDialog}
        unitId={unitId}
        onWeeksGenerated={() => {
          setShowSemesterDialog(false);
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Week Configuration</CardTitle>
            <CardDescription>
              Configure the weeks for this teaching period
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={saveWeeks}
              variant="default"
              disabled={isSaving || isUpdating}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving || isUpdating ? "Saving..." : "Save All Changes"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowSemesterDialog(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Change Semester
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {weeks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No weeks configured. Please select a semester to generate weeks.
            </div>
          ) : (
            <div className="space-y-4">
              <Accordion type="multiple" defaultValue={["week-1"]}>
                {weeks.map((week) => (
                  <AccordionItem
                    key={`week-${week.weekId}`}
                    value={`week-${week.weekId}`}
                    disabled={week.weekType !== "teaching"}
                  >
                    <AccordionTrigger 
                      className={`hover:bg-muted/50 px-4 rounded-md ${
                        week.weekType === "midsem" 
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" 
                          : week.weekType === "swotvac"
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                          : ""
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="font-medium">
                          {week.weekType === "midsem" 
                            ? "MID-SEMESTER BREAK" 
                            : week.weekType === "swotvac"
                            ? "SWOT VAC"
                            : `Week ${week.teachingWeekNumber}`}
                        </span>
                        <span className="ml-4 text-sm text-muted-foreground">
                          {format(new Date(week.startDate), "MMM d")} -{" "}
                          {format(new Date(week.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </AccordionTrigger>
                    {week.weekType === "teaching" && (
                      <AccordionContent className="p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Popover
                                open={
                                  datePickerOpen?.week === week.weekId &&
                                  datePickerOpen?.type === "start"
                                }
                                onOpenChange={(open) =>
                                  setDatePickerOpen(
                                    open
                                      ? {
                                          week: week.weekId,
                                          type: "start",
                                        }
                                      : null
                                  )
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {format(new Date(week.startDate), "PPP")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <CalendarComponent
                                    mode="single"
                                    selected={new Date(week.startDate)}
                                    defaultMonth={new Date(week.startDate)}
                                    onSelect={(date) =>
                                      date &&
                                      updateWeekDate(
                                        week.weekId,
                                        "start",
                                        date
                                      )
                                    }
                                    disabled={(date) =>
                                      date > new Date(week.endDate)
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Popover
                                open={
                                  datePickerOpen?.week === week.weekId &&
                                  datePickerOpen?.type === "end"
                                }
                                onOpenChange={(open) =>
                                  setDatePickerOpen(
                                    open
                                      ? {
                                          week: week.weekId,
                                          type: "end",
                                        }
                                      : null
                                  )
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {format(new Date(week.endDate), "PPP")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <CalendarComponent
                                    mode="single"
                                    selected={new Date(week.endDate)}
                                    defaultMonth={new Date(week.endDate)}
                                    onSelect={(date) =>
                                      date &&
                                      updateWeekDate(
                                        week.weekId,
                                        "end",
                                        date
                                      )
                                    }
                                    disabled={(date) =>
                                      date < new Date(week.startDate)
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Week Content Section */}
                          <div className="space-y-2 mt-4">
                            <Label
                              htmlFor={`week-${week.weekId}-content`}
                            >
                              Week Content
                            </Label>
                            <Textarea
                              id={`week-${week.weekId}-content`}
                              placeholder="Enter content for this week..."
                              value={week.content || ""}
                              onChange={(e) =>
                                updateWeekContent(
                                  week.weekId,
                                  e.target.value
                                )
                              }
                              rows={6}
                              className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                              Describe the topics, readings, and activities
                              for this week. You can use markdown formatting.
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
