export type CachedValue<T> = {
  data: T;
  timestamp: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveCache<T>(key: string, data: T): boolean {
  if (!canUseLocalStorage()) return false;

  const payload = {
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    // Storage can be unavailable (for example, private browsing or quota limits).
    return false;
  }
}

export function loadCache<T>(key: string): CachedValue<T> | null {
  if (!canUseLocalStorage()) return null;

  try {
    const cached = window.localStorage.getItem(key);
    if (!cached) return null;

    const parsed: unknown = JSON.parse(cached);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("data" in parsed) ||
      !("timestamp" in parsed) ||
      typeof parsed.timestamp !== "string"
    ) {
      return null;
    }

    return parsed as CachedValue<T>;
  } catch {
    return null;
  }
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
