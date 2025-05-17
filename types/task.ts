export interface Task {
  id: string;
  name: string;
  description: string;
  unitId: string;
  userId: string;
  created_at: Date;
  status: "recieved" | "running" | "completed" | "failed";
  errorMessage?: string;
  result: object | null;
}

export interface TaskRunRequest {
  unitId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}
