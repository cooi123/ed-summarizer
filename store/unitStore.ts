import { User } from "@/components/auth-provider";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Unit = {
  id: string;
  code: string;
  name: string;
  year: number;
  session: string;
  status: "active" | "inactive";
  created_at: string;
  last_active: string;
};

export type Task = {
  id: string;
  name: string;
  description: string;
};

export type TaskRun = {
  id: string;
  taskId: string;
  unitId: string;
  timestamp: number;
  status: "running" | "completed" | "failed";
  progress: number;
  result?: string;
};

interface UnitsState {
  // Data
  availableUnits: Unit[];
  unitTasks: Record<string, Task[]>;
  selectedUnitIds: string[];
  taskHistory: TaskRun[];

  // API status
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUnits: (user: User) => Promise<void>;
  fetchTasks: (unitId: string) => Promise<void>;
  saveSelectedUnits: (userId: string, unitIds: string[]) => void;
  addTaskRun: (taskRun: TaskRun) => void;
  updateTaskRun: (taskRunId: string, updates: Partial<TaskRun>) => void;
}
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const useUnitsStore = create<UnitsState>()(
  persist(
    (set, get) => ({
      // Initial state
      availableUnits: [],
      unitTasks: {},
      selectedUnitIds: [],
      taskHistory: [],
      isLoading: false,
      error: null,

      // Actions
      fetchUnits: async (user: User) => {
        set({ isLoading: true, error: null });
        try {
          // Replace with your actual API endpoint
          const response = await fetch(
            `${BASE_URL}/users/units?email=${user.email}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch units");
          }
          const data = await response.json();
          const units = data.active;

          const selectedIds =
            user.selectedUnits.map((unit) => unit.unit_id) || [];
          console.log(user);
          set({
            availableUnits: units,
            selectedUnitIds: selectedIds,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "An unknown error occurred",
            isLoading: false,
          });
          console.error("Error fetching units:", error);
        }
      },

      fetchTasks: async (unitId: string) => {
        set({ isLoading: true, error: null });
        try {
          // Replace with your actual API endpoint
          const response = await fetch(`/api/units/${unitId}/tasks`);
          if (!response.ok) {
            throw new Error(`Failed to fetch tasks for unit ${unitId}`);
          }
          const tasks = await response.json();

          set((state) => ({
            unitTasks: {
              ...state.unitTasks,
              [unitId]: tasks,
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "An unknown error occurred",
            isLoading: false,
          });
          console.error(`Error fetching tasks for unit ${unitId}:`, error);
        }
      },
      saveSelectedUnits: (userId: string, unitIds: string[]) => {
        fetch(`${BASE_URL}/users/units?id=${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedUnitIds: unitIds,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to update selected units");
            }
            return response.json();
          })
          .then(() => {
            set({ selectedUnitIds: unitIds });
          })
          .catch((error) => {
            console.error("Error updating selected units:", error);
          });
      },

      addTaskRun: (taskRun: TaskRun) => {
        set((state) => ({
          taskHistory: [taskRun, ...state.taskHistory],
        }));
      },

      updateTaskRun: (taskRunId: string, updates: Partial<TaskRun>) => {
        set((state) => ({
          taskHistory: state.taskHistory.map((run) =>
            run.id === taskRunId ? { ...run, ...updates } : run
          ),
        }));
      },
    }),
    {
      name: "units-storage", // name for the storage
      partialize: (state) => ({
        selectedUnitIds: state.selectedUnitIds,
        taskHistory: state.taskHistory,
      }),
    }
  )
);

export default useUnitsStore;
