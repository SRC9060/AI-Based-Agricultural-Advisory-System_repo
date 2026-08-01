import { getAuthHeaders } from "@/lib/auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(getAuthHeaders())) {
    headers.set(name, value);
  }
  return fetch(input, { ...init, headers });
}
