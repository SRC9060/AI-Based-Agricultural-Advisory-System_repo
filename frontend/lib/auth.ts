import { clearSession } from "@/lib/session";

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  language?: string;
};

/**
 * Tokens are stored exclusively in HttpOnly cookies managed server-side.
 * Browser JavaScript cannot and must not directly access authentication tokens.
 */
export function getAuthToken(): string | null {
  return null;
}

/**
 * Authorization headers are injected server-side by the Next.js API proxy boundary.
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}

/**
 * Preserved for signature compatibility. Cookie is set server-side by /api/auth/login.
 */
export function saveAuthenticatedSession(
  _token?: string,
  _rememberMe: boolean = false,
) {
  void _token;
  void _rememberMe;
  if (typeof window === "undefined") return;

  // Ensure no legacy tokens remain in client storage
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_token");
}

/**
 * Clears the server-side HttpOnly authentication cookie and local session metadata.
 */
export function clearAuthenticatedSession() {
  if (typeof window === "undefined") return;

  // Clean up any legacy storage keys
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_token");

  clearSession();

  // Call server logout route to delete HttpOnly authentication cookie
  try {
    void fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch (error) {
    console.warn("[Auth] Failed to call logout endpoint:", error);
  }
}