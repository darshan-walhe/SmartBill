import { apiClient } from "./client";
import type { ApiResponse, Page, Role } from "../types/api";

// Mirrors UserDTOs.UserResponse
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
}

// Mirrors UserDTOs.InviteRequest — role here can never be SUPER_ADMIN
// (backend rejects it), so the UI should only ever offer ADMIN/MANAGER/
// STAFF/ACCOUNTANT in the invite form.
export interface InviteRequest {
  name: string;
  email: string;
  mobile: string;
  role: Exclude<Role, "SUPER_ADMIN">;
}

// Mirrors UserDTOs.InviteResponse — temporaryPassword is shown exactly once,
// here, right after invite. There's no way to retrieve it again afterward
// (no email delivery wired up yet — see the TODO in UserDTOs on the backend).
export interface InviteResponse {
  user: TeamMember;
  temporaryPassword: string;
}

export interface RoleUpdateRequest {
  role: Exclude<Role, "SUPER_ADMIN">;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const usersApi = {
  list: (page = 0, size = 10) =>
    unwrap<Page<TeamMember>>(apiClient.get("/api/users", { params: { page, size } })),

  invite: (body: InviteRequest) =>
    unwrap<InviteResponse>(apiClient.post("/api/users/invite", body)),

  updateRole: (userId: string, body: RoleUpdateRequest) =>
    unwrap<TeamMember>(apiClient.put(`/api/users/${userId}/role`, body)),

  deactivate: (userId: string) =>
    unwrap<TeamMember>(apiClient.patch(`/api/users/${userId}/deactivate`)),

  reactivate: (userId: string) =>
    unwrap<TeamMember>(apiClient.patch(`/api/users/${userId}/reactivate`)),
};
