import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, UnitSync } from "@/types/user";
import { Unit } from "@/types/unit";
import { apiService } from "@/lib/api";
import { apiEndpoints } from "@/const/apiEndpoints";

interface UserState {
  // User data
  user: User | null;

  // Loading states
  loading: boolean;
  updating: boolean;
  error: string | null;

  // Actions
  fetchUser: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;

  // Units management
  addSelectedUnit: (unitId: string) => Promise<void>;
  removeSelectedUnit: (unitId: string) => Promise<void>;
  updateSelectedUnits: (selectedUnits: UnitSync[]) => Promise<void>;
  updateUserApiKey: (apiKey: string) => Promise<void>;
  clearUserData: () => void;
}

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      loading: false,
      updating: false,
      error: null,

      // Fetch user data
      fetchUser: async (email) => {
        set({ loading: true, error: null });

        try {
          const userData = await apiService.get<User>(
            apiEndpoints.user.get(email)
          );
          set({
            user: userData,
            loading: false,
          });
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch user data",
            loading: false,
          });
        }
      },

      // Update user data
      updateUser: async (userData: Partial<User>) => {
        set({ updating: true, error: null });

        try {
          const { user } = get();

          if (!user || !user.id) {
            throw new Error("No user data found");
          }

          const updatedUserData = await apiService.patch<User>(
            apiEndpoints.user.update(user.id),
            userData
          );

          set({
            user: updatedUserData,
            updating: false,
          });
        } catch (error) {
          console.error("Failed to update user data:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update user data",
            updating: false,
          });
        }
      },

      // Add a unit to selected units
      addSelectedUnit: async (unitId: string) => {
        const { user, updateUser } = get();

        if (!user) {
          throw new Error("No user data found");
        }

        // Check if unit is already selected
        const alreadySelected = user.selectedUnits.some(
          (unit) => unit.unit_id === unitId
        );

        if (alreadySelected) {
          return; // Unit is already selected, no need to update
        }

        // Create new selectedUnits array with the new unit
        const updatedSelectedUnits = [
          ...user.selectedUnits,
          { unit_id: unitId, last_sync: null },
        ];

        // Update user with new selected units
        await updateUser({ selectedUnits: updatedSelectedUnits });
      },

      // Rest of your code stays the same
      removeSelectedUnit: async (unitId: string) => {
        const { user, updateUser } = get();

        if (!user) {
          throw new Error("No user data found");
        }

        const updatedSelectedUnits = user.selectedUnits.filter(
          (unit) => unit.unit_id !== unitId
        );

        await updateUser({ selectedUnits: updatedSelectedUnits });
      },

      updateSelectedUnits: async (selectedUnits: UnitSync[]) => {
        const { updateUser } = get();
        await updateUser({ selectedUnits });
      },

      updateUserApiKey: async (apiKey: string) => {
        const { user, updateUser } = get();

        if (!user) {
          throw new Error("No user data found");
        }

        await updateUser({ apiKey });
      },

      clearUserData: () => {
        set({ user: null });
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useUserStore;
