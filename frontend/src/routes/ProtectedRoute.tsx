import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/api";

interface ProtectedRouteProps {
  children: ReactNode;
  // Omit to allow any authenticated role — matches endpoints in the backend
  // that have no @PreAuthorize at all (e.g. most GET/list endpoints).
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, session } = useAuth();

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
