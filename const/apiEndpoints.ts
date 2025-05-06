/**
 * API endpoint generator functions for building URLs with parameters
 */
export const apiEndpoints = {
  // User endpoints
  user: {
    get: (email: string) => `/users?email=${email}`,
    update: (userId: string) => `/users/${userId}`,
  },

  // Unit endpoints
  units: {
    getAll: () => "/units",
    getById: (unitId: string) => `/units/${unitId}`,
    update: (unitId: string) => `/units/${unitId}`,
    getWeeks: (unitId: string) => `/units/${unitId}/weeks`,
    updateWeeks: (unitId: string) => `/units/${unitId}/weeks`,
  },

  // User-Unit relationship endpoints
  userUnits: {
    getAll: (userId: string) => `/users/${userId}/units`,
    get: (userId: string, unitId: string) => `/users/${userId}/units/${unitId}`,
    add: (userId: string) => `/users/${userId}/units`,
    remove: (userId: string, unitId: string) =>
      `/users/${userId}/units/${unitId}`,
    update: (userId: string, unitId: string) =>
      `/users/${userId}/units/${unitId}`,
  },
};
