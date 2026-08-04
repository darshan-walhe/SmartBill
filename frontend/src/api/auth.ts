import { apiClient } from "./client";
import type { ApiResponse, Role } from "../types/api";

// Mirrors AuthDTOs.AuthResponse exactly — returned by register, login,
// otp/verify, and google.
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  companyId: string | null;
}

export interface RegisterRequest {
  name: string;
  email: string;
  mobile: string;
  password: string;
  companyName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpRequest {
  mobile: string;
}

export interface OtpVerifyRequest {
  mobile: string;
  otp: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  // The backend only ever sends success:false via a non-2xx status (caught by
  // the response interceptor), so by the time we get here data.data is safe
  // to assume present — this guard is just to keep TypeScript honest.
  if (data.data === undefined) {
    throw new Error(data.message ?? "Empty response from server");
  }
  return data.data;
}

export const authApi = {
  register: (body: RegisterRequest) =>
    unwrap<AuthResponse>(apiClient.post("/api/auth/register", body)),

  login: (body: LoginRequest) =>
    unwrap<AuthResponse>(apiClient.post("/api/auth/login", body)),

  sendOtp: (body: OtpRequest) =>
    unwrap<void>(apiClient.post("/api/auth/otp/send", body)),

  verifyOtp: (body: OtpVerifyRequest) =>
    unwrap<AuthResponse>(apiClient.post("/api/auth/otp/verify", body)),

  googleLogin: (body: GoogleLoginRequest) =>
    unwrap<AuthResponse>(apiClient.post("/api/auth/google", body)),
};
