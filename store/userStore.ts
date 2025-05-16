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
  needsSignup: boolean;

  // Actions
  fetchUser: () => Promise<void>;
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
      needsSignup: false,

      // Fetch user data
      fetchUser: async () => {
        set({ loading: true, error: null, needsSignup: false });

        try {
          const userData = await apiService.get<User>(
            apiEndpoints.user.get()
          );
          set({
            user: userData,
            loading: false,
            needsSignup: false,
          });
        } catch (error: any) {
          console.error("Failed to fetch user data:", error);
          
          // If 404, user needs to sign up
          if (error.response?.status === 404) {
            set({
              needsSignup: true,
              loading: false,
              error: null,
            });
            return;
          }

          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch user data",
            loading: false,
            needsSignup: false,
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
            needsSignup: false,
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
          (unit) => unit.id.toString() === unitId
        );

        if (alreadySelected) {
          return; // Unit is already selected, no need to update
        }

        // Find the unit in available units
        const unitToAdd = user.availableUnits.find(
          (unit) => unit.id.toString() === unitId
        );

        if (!unitToAdd) {
          throw new Error("Unit not found in available units");
        }

        // Create new selectedUnits array with the new unit
        const updatedSelectedUnits = [...user.selectedUnits, unitToAdd];

        // Update user with new selected units
        await updateUser({ selectedUnits: updatedSelectedUnits });
      },

      // Remove a unit from selected units
      removeSelectedUnit: async (unitId: string) => {
        const { user, updateUser } = get();

        if (!user) {
          throw new Error("No user data found");
        }

        const updatedSelectedUnits = user.selectedUnits.filter(
          (unit) => unit.id.toString() !== unitId
        );

        await updateUser({ selectedUnits: updatedSelectedUnits });
      },

      updateSelectedUnits: async (selectedUnits: UnitSync[]) => {
        const { user, updateUser } = get();

        if (!user) {
          throw new Error("No user data found");
        }

        // Transform UnitSync objects into the format expected by the API
        const apiSelectedUnits = selectedUnits.map(unit => (
          unit.id
        ));

        // Make the API call to update selected units
        await apiService.patch(
          apiEndpoints.user.updateSelectedUnits(user.id),
          { selectedUnits: apiSelectedUnits }
        );

        // Update the local store with the full unit data
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
        set({ user: null, needsSignup: false });
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
