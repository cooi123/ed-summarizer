import { create } from "zustand";
import axios from "axios";
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
interface TaskRunStatusResponse {
  transactionId: string;
  status: string;
  progress: number;
}

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
  currentTaskRun: TaskRunStatusResponse | null;
  loading: boolean;
  error: string | null;
  polling: boolean;

  // Actions
  getTaskRuns: (unitId: string, userId: string) => Promise<void>;
  getLatestTaskRun: (unitId: string, userId: string) => Promise<TaskRun | null>;
  runTask: (
    unitId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<TaskRunStatusResponse>;
  pollTaskStatus: (
    transactionId: string,
    unitId: string,
    userId: string,
    intervalMs?: number
  ) => Promise<void>;
  stopPolling: () => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  taskRuns: [],
  currentTaskRun: null,
  loading: false,
  error: null,
  polling: false,

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

      // Update the current task run status
      set((state) => ({
        currentTaskRun: response,
        loading: false,
      }));

      // Start polling automatically when a task is run
      get().pollTaskStatus(response.transactionId, unitId, userId);

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
  pollTaskStatus: async (
    transactionId: string,
    unitId: string,
    userId: string,
    intervalMs = 2000
  ) => {
    // Stop any existing polling first
    get().stopPolling();

    // Set polling to true
    set({ polling: true });

    // Set start time for timeout
    const startTime = Date.now();
    const MAX_POLLING_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

    const checkStatus = async () => {
      if (!get().polling) return; // Exit if polling has been stopped

      // Check if we've exceeded the maximum polling duration
      if (Date.now() - startTime > MAX_POLLING_DURATION) {
        set({ 
          polling: false, 
          loading: false,
          error: "Task polling timed out after 2 minutes"
        });
        return;
      }

      try {
        // Assuming there's an endpoint to check task status
        const response = await apiService.get<TaskRunStatusResponse>(
          apiEndpoints.tasks.getTaskStatus(transactionId)
        );

        set({ currentTaskRun: response });

        // If task is completed or failed, stop polling
        if (response.status === "completed" || response.status === "failed") {
          set({ loading: false, polling: false });

          // Refresh the task list if the task was completed
          if (
            response.status === "completed" ||
            response.status === "failed" ||
            response.status === "error"
          ) {
            //refetch the task run list
            await get().getTaskRuns(unitId, userId);
          }
        } else {
          // Continue polling
          setTimeout(checkStatus, intervalMs);
        }
      } catch (error) {
        console.error("Error polling task status:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to poll task status",
          polling: false,
          loading: false,
        });
      }
    };

    // Start the polling
    checkStatus();
  },

  stopPolling: () => {
    set({ polling: false });
  },

  clearError: () => set({ error: null }),
}));
