export interface WeekConfig {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
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
