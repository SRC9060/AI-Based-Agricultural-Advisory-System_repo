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
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function saveAuthenticatedSession(
  token: string,
  user: AuthenticatedUser,
) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("user_id", String(user.id));
  localStorage.setItem("user_name", user.name);
  localStorage.setItem("user_email", user.email);

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}

export function clearAuthenticatedSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
