export interface WeekConfig {
  weekId: number;
  teachingWeekNumber: number;
  weekType: string;
  startDate: string;
  endDate: string;
  content: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  description?: string;
  content: string;
  year: number;
  session: string;
  weeks: WeekConfig[];
}
