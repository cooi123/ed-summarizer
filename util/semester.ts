import { addDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { WeekConfig } from "@/types/unit";
import { generateWeeks } from "./shared";

export interface SemesterPhase {
  type: string;
  start_date: string;
  end_date: string;
}

export interface Semester {
  id: number;
  year: number;
  semester: number;
  phases: SemesterPhase[];
}

export function generateWeeksFromSemester(semester: Semester, numberOfWeeks: number=16): WeekConfig[] {
  // Get teaching period
  const teachingPeriod = semester.phases.find((p) => p.type === 'teaching_period');
  if (!teachingPeriod) {
    throw new Error("Teaching period not found in semester");
  }

  const startDate = new Date(teachingPeriod.start_date);
  const endDate = new Date(teachingPeriod.end_date);
  
  // Get break periods
  const breaks = semester.phases.filter(p => p.type === 'mid_semester_break' || p.type === 'swot_vac');
  
  
  // Generate weeks
  const generatedWeeks: WeekConfig[] = [];
  let teachingWeekNumber = 1;
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + (i * 7));
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    
    // Check if this week overlaps with any break
    const isBreakWeek = breaks.some(breakPeriod => {
      const breakStart = new Date(breakPeriod.start_date);
      const breakEnd = new Date(breakPeriod.end_date);
      return (
        isWithinInterval(weekStartDate, { start: breakStart, end: breakEnd }) ||
        isWithinInterval(weekEndDate, { start: breakStart, end: breakEnd })
      );
    });
    
    const breakType = isBreakWeek 
      ? breaks.find(breakPeriod => {
          const breakStart = new Date(breakPeriod.start_date);
          const breakEnd = new Date(breakPeriod.end_date);
          return (isWithinInterval(weekStartDate, { start: breakStart, end: breakEnd }) ||
          isWithinInterval(weekEndDate, { start: breakStart, end: breakEnd }));
        })?.type || 'mid_semester_break'
      : 'teaching';
    
    generatedWeeks.push({
      weekId: i + 1,
      teachingWeekNumber: isBreakWeek ? 0 : teachingWeekNumber,
      weekType: breakType === 'mid_semester_break' ? 'midsem' : 
                breakType === 'swot_vac' ? 'swotvac' : 'teaching',
      startDate: weekStartDate.toISOString(),
      endDate: weekEndDate.toISOString(),
      content: isBreakWeek ? breakType : ''
    });
    
    // Only increment teaching week number if it's not a break week
    if (!isBreakWeek) {
      teachingWeekNumber++;
    }
  }

  return generatedWeeks;
}

