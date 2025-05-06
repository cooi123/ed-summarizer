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
  //fix date objects
  // Add this helper function to safely parse dates
  const parseDate = (dateInput: any): Date => {
    if (dateInput instanceof Date) return dateInput;

    try {
      // For ISO strings (like 2025-05-02T22:00:00Z)
      if (typeof dateInput === "string") {
        // Create date object in local timezone
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (e) {
      console.error("Failed to parse date:", dateInput);
    }

    return new Date(); // Fallback to current date
  };

  // Then modify your useEffect
  useEffect(() => {
    if (initialWeeks?.length > 0) {
      const formattedWeeks = initialWeeks.map((week) => ({
        ...week,
        // Parse dates safely and ensure they're in local time
        startDate: parseDate(week.startDate),
        endDate: parseDate(week.endDate),
      }));

      console.log("Formatted weeks:", formattedWeeks);
      setWeeks(formattedWeeks);
    }
  }, [initialWeeks]);
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
      // Format dates to ensure they're Date objects
      const formattedWeeks = weeks.map((week) => ({
        ...week,
        weekNumber: week.weekNumber,
        startDate: new Date(week.startDate),
        endDate: new Date(week.endDate),
        content: week.content || "", // Ensure content exists
      }));

      await updateAllWeeks(unitId, formattedWeeks);

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
    const breaks: { startDate: Date; endDate: Date }[] = [];

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
        });
      }
    }

    return breaks;
  };

  return (
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
                | { isBreak: true; startDate: Date; endDate: Date }
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
                          className="my-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg"
                        >
                          <div className="flex items-center">
                            <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-2 py-1 rounded-md text-xs">
                              SEMESTER BREAK
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
  );
}
