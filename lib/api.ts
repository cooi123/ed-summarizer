import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 seconds
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem("token");

    // If token exists, add it to the request header
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiService = {
  /**
   * GET request
   */
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse = await api.get(url, config);
    return response.data as T;
  },

  /**
   * POST request
   */
  post: async <T, D>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response: AxiosResponse = await api.post(url, data, config);
    return response.data as T;
  },

  /**
   * PUT request
   */
  put: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response: AxiosResponse = await api.put(url, data, config);
    return response.data as T;
  },

  /**
   * PATCH request
   */
  patch: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response: AxiosResponse = await api.patch(url, data, config);
    return response.data as T;
  },

  /**
   * DELETE request
   */
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse = await api.delete(url, config);
    return response.data as T;
  },

  /**
   * Upload file(s)
   */
  uploadFiles: async <T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response: AxiosResponse = await api.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data as T;
  },

  /**
   * Download file
   */
  downloadFile: async (
    url: string,
    filename: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    const response: AxiosResponse = await api.get(url, {
      ...config,
      responseType: "blob",
    });

    // Create blob link to download
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    // Clean up
    window.URL.revokeObjectURL(link.href);
  },

  /**
   * Get the underlying axios instance
   */
  axiosInstance: api,
};
