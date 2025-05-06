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
    getById: (unitId: string) => `/units/${unitId}`,
    update: (unitId: string) => `/units/${unitId}`,
  },
};
