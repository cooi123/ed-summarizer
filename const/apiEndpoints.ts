import { getTaskById } from "@/lib/units";

/**
 * API endpoint generator functions for building URLs with parameters
 */
export const apiEndpoints = {
  // User endpoints
  user: {
    get: (email: string) => `/users/?email=${email}`,
    update: (userId: string) => `/users/${userId}`,
  },

  // Unit endpoints
  units: {
    getById: (unitId: string) => `/units/${unitId}`,
    update: (unitId: string) => `/units/${unitId}`,
  },

  tasks: {
    getByUnitId: (unitId: string) => `/tasks/${unitId}`,
    runTask: () => `/tasks/run_chain/`,
    getTaskStatus: (taskId: string) => `/tasks/status/${taskId}`,
    getTaskById: (taskId: string) => `/tasks/task/${taskId}`,
  },
};
