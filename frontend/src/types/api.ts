// Mirrors com.BCSTech.SmartBill.common.dto.ApiResponse<T> exactly.
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Mirrors org.springframework.data.domain.Page<T> as serialized by Jackson.
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index, 0-based
  size: number;
  first: boolean;
  last: boolean;
}

// Mirrors com.BCSTech.SmartBill.user.model.Role exactly — keep in sync if the
// backend enum changes.
export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF" | "ACCOUNTANT";
