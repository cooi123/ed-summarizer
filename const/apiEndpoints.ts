/**
 * API endpoint generator functions for building URLs with parameters
 */
export const apiEndpoints = {
  health: {
    get: () => `/health`,
  },
  // User endpoints
  user: {
    get: () => `/api/v1/users/me`,
    update: () => `/api/v1/users/me`,
    create: () => `/api/v1/users/`,
    updateSelectedUnits: () => `/api/v1/users/me/selected-units`,
  },

  // Unit endpoints
  units: {
    getById: (unitId: string) => `/api/v1/units/${unitId}`,
    update: (unitId: string) => `/api/v1/units/${unitId}`,
    getThreads: (unitId: string) => `/api/v1/units/${unitId}/threads`,
    syncThreads: (unitId: string, userId: string) => `/api/v1/units/${unitId}/sync-threads?user_id=${userId}`,
    getWeeklyData: (unitId: string) => `/api/v1/units/${unitId}/weeks`,

    getQuestionClusters: (unitId: string) => `/api/v1/question-clusters/units/${unitId}/clusters`,
    getCategories: (unitId: string) => `/api/v1/units/${unitId}/categories`,
  },

  tasks: {
    getByUnitId: (unitId: string) => `/api/v1/tasks/${unitId}`,
    runTask: () => `/api/v1/tasks/run_chain/`,
    getTaskStatus: (taskId: string) => `/api/v1/tasks/status/${taskId}`,
    getTaskById: (taskId: string) => `/api/v1/tasks/task/${taskId}`,
    runAnalysis: () => `/api/v1/tasks/run_unit_trend_analysis/`,
    getAnalysisReport: (taskId:string) => `/api/v1/tasks/unit_trend_analysis_report/${taskId}`,
    getAllAnalysisReports: (unitId: string) => `/api/v1/tasks/unit_analysis_reports/${unitId}`,
    cancelTask: (taskId: string) => `/api/v1/tasks/cancel/${taskId}`,
  }
};
