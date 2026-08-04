import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { registerUnauthorizedHandler } from "../api/client";
import type { AuthResponse } from "../api/auth";
import { clearSession, getSession, setSession, type StoredSession } from "../lib/authStorage";

interface AuthContextValue {
  session: StoredSession | null;
  isAuthenticated: boolean;
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<StoredSession | null>(() => getSession());
  const navigate = useNavigate();

  function login(auth: AuthResponse) {
    const next: StoredSession = {
      accessToken: auth.accessToken,
      userId: auth.userId,
      name: auth.name,
      email: auth.email,
      mobile: auth.mobile,
      role: auth.role,
      companyId: auth.companyId,
    };
    setSession(next);
    setSessionState(next);
  }

  function logout() {
    clearSession();
    setSessionState(null);
    navigate("/login", { replace: true });
  }

  // Wire the API client's 401 handler once — any expired/invalid token
  // anywhere in the app funnels through here, not just explicit logout clicks.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setSessionState(null);
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{ session, isAuthenticated: session !== null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
