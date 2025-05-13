import { getTaskById } from "@/lib/units";

/**
 * API endpoint generator functions for building URLs with parameters
 */
export const apiEndpoints = {
  // User endpoints
  user: {
    get: () => `/users/me`,
    update: () => `/users/me`,
    updateSelectedUnits: () => `/users/me/selected-units`,
  },

  // Unit endpoints
  units: {
    getById: (unitId: string) => `/units/${unitId}`,
    update: (unitId: string) => `/units/${unitId}`,
    getThreads: (unitId: string) => `/units/${unitId}/threads`,
    syncThreads: (unitId: string, userId: string) => `/units/${unitId}/sync-threads?user_id=${userId}`,
    getWeeklyData: (unitId: string) => `/units/${unitId}/weeks`,

    getQuestionClusters: (unitId: string) => `/question-clusters/units/${unitId}/clusters`,
  },

  tasks: {
    getByUnitId: (unitId: string) => `/tasks/${unitId}`,
    runTask: () => `/tasks/run_chain/`,
    getTaskStatus: (taskId: string) => `/tasks/status/${taskId}`,
    getTaskById: (taskId: string) => `/tasks/task/${taskId}`,
  },
};
