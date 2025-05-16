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

interface Semester {
  id: number;
  year: number;
  semester: number;
  phases: {
    type: string;
    startDate: string;
    endDate: string;
  }[];
}

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
  const [numberOfWeeks, setNumberOfWeeks] = useState(14); // Default to 14 weeks (typical semester)
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [hasBreak, setHasBreak] = useState(false);
  const [breakAfterWeek, setBreakAfterWeek] = useState(7); // Default break after week 7
  const [breakDuration, setBreakDuration] = useState(14); // Default 2 weeks (14 days) break
  const [isInitializing, setIsInitializing] = useState(false);
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

  // Fetch semesters when dialog opens
  useEffect(() => {
    if (showSemesterDialog) {
      fetchSemesters();
    }
  }, [showSemesterDialog]);

  const fetchSemesters = async () => {
    setIsLoadingSemesters(true);
    try {
      const data = await apiService.get<Semester[]>('/spi/v1/semesters');
      setSemesters(data);
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
      toast({
        title: "Error",
        description: "Failed to fetch semester data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSemesters(false);
    }
  };

  const handleSemesterSelect = async (semesterId: string) => {
    const semester = semesters.find(s => s.id.toString() === semesterId);
    if (!semester) return;

    setSelectedSemester(semester);
    
    // Generate weeks based on the teaching period phase
    const teachingPeriod = semester.phases.find(p => p.type === 'teaching_period');
    if (!teachingPeriod) {
      toast({
        title: "Error",
        description: "No teaching period found in selected semester.",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(teachingPeriod.startDate);
    const endDate = new Date(teachingPeriod.endDate);
    
    // Calculate number of weeks
    const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Generate weeks
    const generatedWeeks = generateWeeks(
      startDate,
      weeksDiff,
      undefined, // We'll handle breaks separately
      0
    );

    // Add breaks if they exist in the semester phases
    const midSemesterBreak = semester.phases.find(p => p.type === 'mid_semester_break');
    if (midSemesterBreak) {
      const breakStart = new Date(midSemesterBreak.startDate);
      const breakEnd = new Date(midSemesterBreak.endDate);
      
      // Find the week that contains the break start date
      const breakWeekIndex = generatedWeeks.findIndex(week => 
        new Date(week.startDate) <= breakStart && new Date(week.endDate) >= breakStart
      );

      if (breakWeekIndex !== -1) {
        // Split the week at the break
        const week = generatedWeeks[breakWeekIndex];
        const beforeBreak = {
          ...week,
          endDate: new Date(breakStart.getTime() - 24 * 60 * 60 * 1000),
        };
        const afterBreak = {
          ...week,
          weekNumber: week.weekNumber + 1,
          startDate: new Date(breakEnd.getTime() + 24 * 60 * 60 * 1000),
        };

        // Update the weeks array
        generatedWeeks.splice(breakWeekIndex, 1, beforeBreak);
        generatedWeeks.splice(breakWeekIndex + 1, 0, afterBreak);
      }
    }

    // Update the weeks
    updateWeeks(generatedWeeks);
    setShowSemesterDialog(false);

    toast({
      title: "Semester Selected",
      description: `Weeks have been generated for ${semester.year} Semester ${semester.semester}`,
    });
  };

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
      weekNumber: idx + 1,
    }));

    setWeeks(renumberedWeeks);
  };

  // Update the content for a specific week
  const updateWeekContent = (weekNumber: number, content: string) => {
    const newWeeks = weeks.map((week) => {
      if (week.weekNumber === weekNumber) {
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

  const addWeek = () => {
    // Sort weeks by start date to find the last one
    const sortedWeeks = [...weeks].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const lastWeek = sortedWeeks[sortedWeeks.length - 1];

    // Set start date to day after the previous week's end date
    const startDate = lastWeek
      ? addDays(new Date(lastWeek.endDate), 1)
      : startOfWeek(new Date(), { weekStartsOn: 1 }); // Start on Monday

    const endDate = endOfWeek(startDate, { weekStartsOn: 1 }); // End on Sunday

    // Check for duplicates
    const isDuplicateDate = weeks.some(
      (week) => new Date(week.startDate).getTime() === startDate.getTime()
    );

    if (isDuplicateDate) {
      toast({
        title: "Duplicate Date",
        description:
          "A week already starts on this date. Please choose another date.",
        variant: "destructive",
      });
      return;
    }

    const newWeeks = [
      ...weeks,
      {
        weekNumber: weeks.length + 1, // Will be renumbered correctly in updateWeeks
        startDate,
        endDate,
        content: "",
      },
    ];

    updateWeeks(newWeeks);

    toast({
      title: "Week Added",
      description: `A new week has been added to the schedule.`,
    });
  };

  const removeWeek = (weekNumber: number) => {
    const newWeeks = weeks
      .filter((week) => week.weekNumber !== weekNumber)
      .map((week, idx) => ({
        ...week,
        weekNumber: idx + 1, // Renumber weeks after removal
      }));

    updateWeeks(newWeeks);

    toast({
      title: "Week Removed",
      description: `Week ${weekNumber} has been removed from the schedule.`,
    });
  };

  const updateWeekDate = (
    weekNumber: number,
    type: "start" | "end",
    date: Date
  ) => {
    const newWeeks = weeks.map((week) => {
      if (week.weekNumber === weekNumber) {
        return {
          ...week,
          [type === "start" ? "startDate" : "endDate"]: date,
        };
      }
      return week;
    });

    updateWeeks(newWeeks);
    setDatePickerOpen(null);
  };

  const initializeWeeks = () => {
    if (isInitializing) return;

    setIsInitializing(true);
    try {
      // Use the generateWeeks utility with break support
      const generatedWeeks = generateWeeks(
        startDate,
        numberOfWeeks,
        hasBreak ? breakAfterWeek : undefined,
        hasBreak ? breakDuration : 0
      );

      // Take only the requested number of weeks
      const limitedWeeks = generatedWeeks.slice(0, numberOfWeeks);

      updateWeeks(limitedWeeks);

      toast({
        title: "Weeks Initialized",
        description: `Created ${numberOfWeeks} weeks starting from ${format(
          startDate,
          "PPP"
        )}${hasBreak ? ` with a break after week ${breakAfterWeek}` : ""}`,
      });
    } catch (error) {
      console.error("Failed to initialize weeks:", error);
      toast({
        title: "Initialization Failed",
        description: "There was a problem creating the weeks.",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };
  const detectBreaks = (sortedWeeks: WeekConfig[]) => {
    const breaks: { startDate: Date; endDate: Date; breakType?: string }[] = [];

    // Look for gaps between weeks
    for (let i = 1; i < sortedWeeks.length; i++) {
      const prevWeekEnd = new Date(sortedWeeks[i - 1].endDate);
      const currWeekStart = new Date(sortedWeeks[i].startDate);

      // Calculate days between
      const daysBetween =
        Math.floor(
          (currWeekStart.getTime() - prevWeekEnd.getTime()) /
            (1000 * 60 * 60 * 24)
        ) - 1; // -1 because we're looking at the gap

      if (daysBetween > 2) {
        // More than a weekend
        breaks.push({
          startDate: new Date(prevWeekEnd.getTime() + 86400000), // +1 day
          endDate: new Date(currWeekStart.getTime() - 86400000), // -1 day
          breakType: 'mid_semester_break' // Default to mid-semester break for detected gaps
        });
      }
    }

    return breaks;
  };

  const getBreakLabel = (breakType: string) => {
    switch (breakType) {
      case 'mid_semester_break':
        return 'MID-SEMESTER BREAK';
      case 'swot_vac':
        return 'SWOT VAC';
      default:
        return 'BREAK';
    }
  };

  const getBreakStyles = (breakType: string) => {
    switch (breakType) {
      case 'mid_semester_break':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300';
      case 'swot_vac':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-muted border-muted-foreground/20 text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={showSemesterDialog} onOpenChange={setShowSemesterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Semester</DialogTitle>
            <DialogDescription>
              Choose a semester to generate the week configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingSemesters ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <Select onValueChange={handleSemesterSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id.toString()}>
                      {semester.year} Semester {semester.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSemesterDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button onClick={addWeek}>
              <Plus className="mr-2 h-4 w-4" /> Add Week
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {weeks.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-4 text-muted-foreground">
                No weeks configured. Initialize weeks or add them manually.
              </div>

              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-4">Initialize Weeks</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekCount">Number of Weeks</Label>
                    <Input
                      id="weekCount"
                      type="number"
                      min="1"
                      max="52"
                      value={numberOfWeeks}
                      onChange={(e) =>
                        setNumberOfWeeks(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">First Week Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="startDate"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(startDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasBreak"
                      checked={hasBreak}
                      onCheckedChange={setHasBreak}
                    />
                    <Label htmlFor="hasBreak">Include semester break</Label>
                  </div>

                  {hasBreak && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="breakAfterWeek">Break After Week</Label>
                        <Input
                          id="breakAfterWeek"
                          type="number"
                          min="1"
                          max={numberOfWeeks - 1}
                          value={breakAfterWeek}
                          onChange={(e) =>
                            setBreakAfterWeek(parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="breakDuration">
                          Break Duration (days)
                        </Label>
                        <Input
                          id="breakDuration"
                          type="number"
                          min="1"
                          max="30"
                          value={breakDuration}
                          onChange={(e) =>
                            setBreakDuration(parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={initializeWeeks}
                  className="w-full"
                  disabled={isInitializing}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isInitializing ? "animate-spin" : ""
                    }`}
                  />
                  {isInitializing ? "Creating Weeks..." : "Generate Weeks"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sort weeks by start date */}
              {(() => {
                const sortedWeeks = [...weeks].sort(
                  (a, b) =>
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime()
                );

                const breaks = detectBreaks(sortedWeeks);
                const items: (
                  | WeekConfig
                  | { isBreak: true; startDate: Date; endDate: Date; breakType?: string }
                )[] = [...sortedWeeks];

                // Insert breaks at appropriate positions
                breaks.forEach((breakItem) => {
                  // Find insertion point
                  const insertAfterIdx = sortedWeeks.findIndex(
                    (week) =>
                      new Date(week.endDate).getTime() ===
                      new Date(breakItem.startDate).getTime() - 86400000
                  );

                  if (insertAfterIdx !== -1) {
                    items.splice(insertAfterIdx + 1, 0, {
                      isBreak: true,
                      startDate: breakItem.startDate,
                      endDate: breakItem.endDate,
                    });
                  }
                });

                return (
                  <Accordion type="multiple" defaultValue={["week-1"]}>
                    {items.map((week, index) => {
                      // If this is a break, render a break item
                      if ("isBreak" in week) {
                        return (
                          <div
                            key={`break-${index}`}
                            className={`my-4 p-3 border rounded-lg ${getBreakStyles(week.breakType || '')}`}
                          >
                            <div className="flex items-center">
                              <div className={`px-2 py-1 rounded-md text-xs ${getBreakStyles(week.breakType || '')}`}>
                                {getBreakLabel(week.breakType || '')}
                              </div>
                              <span className="ml-4 text-sm text-muted-foreground">
                                {format(new Date(week.startDate), "MMM d")} -{" "}
                                {format(new Date(week.endDate), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Otherwise render a regular week item
                      return (
                        <AccordionItem
                          key={`week-${week.weekNumber}`}
                          value={`week-${week.weekNumber}`}
                        >
                          <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                            <div className="flex items-center">
                              <span className="font-medium">
                                Week {week.weekNumber}
                              </span>
                              <span className="ml-4 text-sm text-muted-foreground">
                                {format(new Date(week.startDate), "MMM d")} -{" "}
                                {format(new Date(week.endDate), "MMM d, yyyy")}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Start Date</Label>
                                  <Popover
                                    open={
                                      datePickerOpen?.week === week.weekNumber &&
                                      datePickerOpen?.type === "start"
                                    }
                                    onOpenChange={(open) =>
                                      setDatePickerOpen(
                                        open
                                          ? {
                                              week: week.weekNumber,
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
                                            week.weekNumber,
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
                                      datePickerOpen?.week === week.weekNumber &&
                                      datePickerOpen?.type === "end"
                                    }
                                    onOpenChange={(open) =>
                                      setDatePickerOpen(
                                        open
                                          ? {
                                              week: week.weekNumber,
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
                                            week.weekNumber,
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
                                  htmlFor={`week-${week.weekNumber}-content`}
                                >
                                  Week Content
                                </Label>
                                <Textarea
                                  id={`week-${week.weekNumber}-content`}
                                  placeholder="Enter content for this week..."
                                  value={week.content || ""}
                                  onChange={(e) =>
                                    updateWeekContent(
                                      week.weekNumber,
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

                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeWeek(week.weekNumber)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
