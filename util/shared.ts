import { WeekConfig } from "@/types/unit";
import { addDays, startOfWeek } from "date-fns";

/**
 * Generates a sequence of 14 weeks with an optional semester break
 * @param startDate The start date for the first week
 * @param breakAfterWeek The week number after which to add a break (optional)
 * @param breakDuration Number of days for the break (default: 14)
 * @returns An array of 14 configured weeks
 */
export const generateWeeks = (
  startDate: Date,
  numberOfWeeks: number,
  breakAfterWeek?: number,
  breakDuration: number = 14
): WeekConfig[] => {
  const weeks: WeekConfig[] = [];
  const firstDayOfWeek = startOfWeek(startDate, { weekStartsOn: 1 }); // Start on Monday

  for (let i = 0; i < numberOfWeeks; i++) {
    let weekStartDate;

    if (breakAfterWeek && i >= breakAfterWeek) {
      // For weeks after the break, add the break duration
      const baseWeekStart = addDays(firstDayOfWeek, i * 7);
      weekStartDate = addDays(baseWeekStart, breakDuration);
    } else {
      weekStartDate = addDays(firstDayOfWeek, i * 7);
    }

    const weekEndDate = addDays(weekStartDate, 6); // 7 days per week

    weeks.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      endDate: weekEndDate,
      content: "",
    });
  }

  return weeks;
};

export const downloadReport = (content: string, name: string) => {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-weekly-report-${
    new Date().toISOString().split("T")[0]
  }.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
