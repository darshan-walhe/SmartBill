import type { Role } from "../types/api";

// sessionStorage, not localStorage: the token dies with the tab, matching the
// "no refresh-token endpoint yet" decision in the frontend plan — this is a
// deliberate stopgap, not an oversight. Revisit once the backend grows a
// refresh-token flow.
const STORAGE_KEY = "smartbill.session";

export interface StoredSession {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  mobile?: string;
  role: Role;
  companyId: string | null;
}

export function getSession(): StoredSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setSession(session: StoredSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
