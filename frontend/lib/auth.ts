import { clearSession } from "@/lib/session";

const TOKEN_KEY = "auth_token";
const SESSION_COOKIE = "agriadvisor_session";

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  language?: string;
};

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function saveAuthenticatedSession(
  token: string,
  rememberMe = false,
) {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);

  const targetStorage = rememberMe ? localStorage : sessionStorage;
  targetStorage.setItem(TOKEN_KEY, token);

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}

export function clearAuthenticatedSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  clearSession();
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
