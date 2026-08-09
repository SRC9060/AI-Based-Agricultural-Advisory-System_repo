import { clearSession } from "@/lib/session";

const TOKEN_KEY = "auth_token";
const SESSION_COOKIE = "agriadvisor_session";

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  language?: string;
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY)
  );
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export function saveAuthenticatedSession(
  token: string,
  rememberMe: boolean,
) {
  if (typeof window === "undefined") return;

  // Remove old token from both storages first.
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  const targetStorage = rememberMe
    ? localStorage
    : sessionStorage;

  targetStorage.setItem(TOKEN_KEY, token);

  // Keep the cookie consistent with the selected login mode.
  const secure =
    window.location.protocol === "https:" ? "; Secure" : "";

  if (rememberMe) {
    document.cookie =
      `${SESSION_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
  } else {
    // Session cookie: disappears when the browser session ends.
    document.cookie =
      `${SESSION_COOKIE}=1; Path=/; SameSite=Lax${secure}`;
  }
}

export function clearAuthenticatedSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  clearSession();

  document.cookie =
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}