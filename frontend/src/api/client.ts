import axios, { AxiosError } from "axios";
import { clearSession, getSession } from "../lib/authStorage";
import type { ApiResponse } from "../types/api";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// One place that decides what "session is gone" means for the whole app —
// every feature just calls the API and lets this handle expiry/kick-out.
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      clearSession();
      onUnauthorized?.();
    }
    // Normalize into a single Error whose message is always the backend's
    // actual error string, so every feature can just do err.message and get
    // something worth showing the user, instead of re-parsing the axios
    // error shape in every mutation's onError.
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);
