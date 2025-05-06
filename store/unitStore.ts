import { apiEndpoints } from "@/const/apiEndpoints";
import { apiService } from "@/lib/api";
import { Unit, WeekConfig } from "@/types/unit";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// Common update function to be reused internally
const performUpdate = async (
  unitId: string,
  updates: Partial<Unit>,
  onSuccess: (data: any) => void,
  onError: (error: Error) => void
) => {
  try {
    const updatedData = await apiService.patch<Unit>(
      apiEndpoints.units.update(unitId),
      updates
    );

    onSuccess(updatedData);
    return updatedData;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to update unit data.";
    onError(new Error(errorMessage));
    throw error;
  }
};

interface UnitState {
  unit: Unit | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;

  // Core actions
  fetchUnit: (unitId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Update actions using the shared pattern
  updateUnitDetails: (
    details: Partial<Pick<Unit, "description" | "content" | "name">>
  ) => Promise<void>;
  updateWeek: (
    weekIndex: number,
    weekData: Partial<WeekConfig>
  ) => Promise<void>;
  updateAllWeeks: (weeks: WeekConfig[]) => Promise<void>;
}

export const useUnitStore = create<UnitState>()(
  immer((set, get) => ({
    // --- State ---
    unit: null,
    isLoading: false,
    isUpdating: false,
    error: null,

    // --- Core Actions ---
    fetchUnit: async (unitId) => {
      if (get().isLoading) return;
      set({ isLoading: true, error: null, unit: null });
      try {
        const unit = await apiService.get<Unit>(
          apiEndpoints.units.getById(unitId)
        );
        set({ unit, isLoading: false });
      } catch (error: any) {
        console.error("Failed to fetch unit:", error);
        set({
          isLoading: false,
          error: error.message || "Failed to fetch unit data.",
        });
      }
    },

    clearError: () => set({ error: null }),

    reset: () =>
      set({
        unit: null,
        isLoading: false,
        isUpdating: false,
        error: null,
      }),

    // --- Update Actions ---
    updateUnitDetails: async (details) => {
      if (get().isUpdating) return;
      const currentUnit = get().unit;
      if (!currentUnit) {
        set({ error: "Cannot update details: Unit not loaded." });
        return;
      }

      set({ isUpdating: true, error: null });

      try {
        await performUpdate(
          currentUnit.id,
          details,
          (updatedData) => {
            set((state) => {
              if (state.unit) {
                Object.assign(state.unit, updatedData);
              }
              state.isUpdating = false;
            });
          },
          (error) => {
            set({
              isUpdating: false,
              error: error.message,
            });
          }
        );
      } catch (error: any) {
        console.error("Failed to update unit details:", error);
      }
    },

    updateWeek: async (weekIndex, weekData) => {
      if (get().isUpdating) return;
      const currentUnit = get().unit;
      if (!currentUnit) {
        set({ error: "Cannot update week: Unit not loaded." });
        return;
      }

      if (weekIndex < 0 || weekIndex >= currentUnit.weeks.length) {
        set({ error: `Week index ${weekIndex} is out of bounds.` });
        return;
      }

      set({ isUpdating: true, error: null });

      try {
        // Create a deep copy of the weeks array with the update applied to the specific week
        const updatedWeeks = currentUnit.weeks.map((week, idx) =>
          idx === weekIndex ? { ...week, ...weekData } : week
        );

        await performUpdate(
          currentUnit.id,
          { weeks: updatedWeeks },
          (updatedData) => {
            set((state) => {
              if (state.unit && updatedData.weeks) {
                state.unit.weeks = updatedData.weeks;
              }
              state.isUpdating = false;
            });
          },
          (error) => {
            set({
              isUpdating: false,
              error: error.message,
            });
          }
        );
      } catch (error: any) {
        console.error(`Failed to update week ${weekIndex}:`, error);
      }
    },

    updateAllWeeks: async (newWeeks) => {
      if (get().isUpdating) return;
      const currentUnit = get().unit;
      console.log("Current Unit:", currentUnit);
      if (!currentUnit) {
        set({ error: "Cannot update weeks: Unit not loaded." });
        return;
      }

      set({ isUpdating: true, error: null });

      try {
        await performUpdate(
          currentUnit.id,
          { weeks: newWeeks },
          (updatedData) => {
            set((state) => {
              if (state.unit && updatedData.weeks) {
                state.unit.weeks = updatedData.weeks;
              }
              state.isUpdating = false;
            });
          },
          (error) => {
            set({
              isUpdating: false,
              error: error.message,
            });
          }
        );
      } catch (error: any) {
        console.error("Failed to update all weeks:", error);
      }
    },
  }))
);

// Export helper functions that leverage the store
export const updateUnitDetails = async (
  unitId: string,
  details: Partial<Pick<Unit, "description" | "content" | "name">>
): Promise<void> => {
  const store = useUnitStore.getState();
  if (store.unit?.id !== unitId) {
    await store.fetchUnit(unitId);
  }
  return store.updateUnitDetails(details);
};

export const updateWeek = async (
  unitId: string,
  weekIndex: number,
  weekData: Partial<WeekConfig>
): Promise<void> => {
  const store = useUnitStore.getState();
  if (store.unit?.id !== unitId) {
    await store.fetchUnit(unitId);
  }
  return store.updateWeek(weekIndex, weekData);
};

export const updateAllWeeks = async (
  unitId: string,
  weeks: WeekConfig[]
): Promise<void> => {
  const store = useUnitStore.getState();
  if (store.unit?.id !== unitId) {
    await store.fetchUnit(unitId);
  }
  return store.updateAllWeeks(weeks);
};
