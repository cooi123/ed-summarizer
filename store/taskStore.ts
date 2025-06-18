import { create } from "zustand";
import { apiEndpoints } from "@/const/apiEndpoints";
import { apiService } from "@/lib/api";
import { TaskRunRequest } from "@/types/task";

// Define the types based on the schema
interface TaskInput {
  unitId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}

interface SimilarQuestion {
  theme: string;
  questionIds: string[];
}
interface TaskResult {
  report: string;
  questions: SimilarQuestion[];
}
export interface TaskRunStatusResponse {
  transactionId: string;
  status: string;
  progress: number;
  name: string;
  weekId?: number;
}
export const isCompletedStatus = (status: string) => {
  return ["completed", "success", "failure", "error"].includes(status);
};
export interface TaskRun {
  task_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  unit_id: string;
  error_message: string;
  input: TaskInput;
  result: TaskResult;
  user_id: string;
  task_name: string;
  id: string;
}

interface TaskStore {
  // State
  taskRuns: TaskRun[];
  loading: boolean;
  error: string | null;

  // Actions
  getTaskRuns: (unitId: string, userId: string) => Promise<void>;
  getLatestTaskRun: (unitId: string, userId: string) => Promise<TaskRun | null>;
  runTask: (
    unitId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<TaskRunStatusResponse>;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  taskRuns: [],
  loading: false,
  error: null,

  getTaskRuns: async (unitId: string, userId: string) => {
    try {
      set({ loading: true, error: null });
      const tasks = await apiService.get<TaskRun[]>(
        apiEndpoints.tasks.getByUnitId(unitId)
      );

      // Sort by creation date (newest first)
      tasks.sort(
        (a: TaskRun, b: TaskRun) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      set({ taskRuns: tasks, loading: false });
    } catch (error) {
      console.error("Error fetching task runs:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch task runs",
        loading: false,
      });
    }
  },

  getLatestTaskRun: async () => {
    try {
      set({ loading: true, error: null });
      //get the first task from the list
      const taskRuns = get().taskRuns;
      if (taskRuns.length === 0) {
        set({ loading: false });
        return null;
      }
      const latestTask = taskRuns[0];
      const taskId = latestTask.task_id;
      const latestTaskRun = await apiService.get<TaskRun>(
        apiEndpoints.tasks.getTaskById(taskId)
      );
      set({ loading: false });
      return latestTaskRun;
    } catch (error) {
      console.error("Error fetching latest task run:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch latest task run",
        loading: false,
      });
      return null;
    }
  },

  runTask: async (unitId: string, userId: string, startDate, endDate) => {
    try {
      set({ loading: true, error: null });
      const payload = {
        unitId,
        userId,
        startDate,
        endDate,
      };

      const response = await apiService.post<
        TaskRunStatusResponse,
        TaskRunRequest
      >(apiEndpoints.tasks.runTask(), payload);

      set({ loading: false });
      return response;
    } catch (error) {
      console.error("Error running task:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to run task",
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
