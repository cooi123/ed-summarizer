import { create } from "zustand";
import axios from "axios";

// Define the types based on the schema
interface TaskInput {
  unitId: string;
  userId: string;
}

interface TaskResult {
  // Define result structure based on actual data
  [key: string]: any;
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
  currentTaskRun: TaskRun | null;
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
  ) => Promise<TaskRun | null>;
  clearError: () => void;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const useTaskStore = create<TaskStore>((set, get) => ({
  taskRuns: [],
  currentTaskRun: null,
  loading: false,
  error: null,

  getTaskRuns: async (unitId: string, userId: string) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${BASE_URL}/tasks/${unitId}`);
      const tasks = response.data.filter(
        (task: TaskRun) => task.user_id === userId
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

  getLatestTaskRun: async (unitId: string, userId: string) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${BASE_URL}/tasks/${unitId}`);
      const tasks = response.data.filter(
        (task: TaskRun) => task.user_id === userId
      );

      // Sort by creation date (newest first)
      tasks.sort(
        (a: TaskRun, b: TaskRun) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const latestTask = tasks.length > 0 ? tasks[0] : null;
      set({ currentTaskRun: latestTask, loading: false });
      return latestTask;
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

      const response = await axios.post(
        `${BASE_URL}/tasks/run_chain/`,
        payload
      );
      const newTaskRun = response.data;

      // Update the task runs array with the new task
      set((state) => ({
        taskRuns: [newTaskRun, ...state.taskRuns],
        currentTaskRun: newTaskRun,
        loading: false,
      }));

      return newTaskRun;
    } catch (error) {
      console.error("Error running task:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to run task",
        loading: false,
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
