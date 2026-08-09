export interface AccessibilityPreferences {
  fontSize: "small" | "normal" | "large";
  highContrast: boolean;
  reduceMotion: boolean;
  largeTouchTargets: boolean;
  readingMode: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  fontSize: "normal",
  highContrast: false,
  reduceMotion: false,
  largeTouchTargets: false,
  readingMode: false,
};

const STORAGE_KEY = "agri_accessibility_preferences";

export function getAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_PREFERENCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...parsed };
    }
  } catch {
    // Return defaults if parsing fails
  }
  return DEFAULT_ACCESSIBILITY_PREFERENCES;
}

export function saveAccessibilityPreferences(prefs: AccessibilityPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    applyAccessibilityPreferences(prefs);
    window.dispatchEvent(new CustomEvent("accessibilitychange", { detail: prefs }));
  } catch {
    // Fail silently if localStorage is restricted
  }
}

export function applyAccessibilityPreferences(prefs?: AccessibilityPreferences): void {
  if (typeof window === "undefined") return;
  const current = prefs || getAccessibilityPreferences();
  const root = document.documentElement;

  // 1. Font size
  root.setAttribute("data-font-size", current.fontSize || "normal");

  // 2. High contrast
  root.setAttribute("data-high-contrast", String(Boolean(current.highContrast)));
  if (current.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  // 3. Reduce motion
  root.setAttribute("data-reduce-motion", String(Boolean(current.reduceMotion)));
  if (current.reduceMotion) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }

  // 4. Large touch targets
  root.setAttribute("data-large-touch", String(Boolean(current.largeTouchTargets)));
  if (current.largeTouchTargets) {
    root.classList.add("large-touch-targets");
  } else {
    root.classList.remove("large-touch-targets");
  }

  // 5. Reading mode
  root.setAttribute("data-reading-mode", String(Boolean(current.readingMode)));
  if (current.readingMode) {
    root.classList.add("reading-mode");
  } else {
    root.classList.remove("reading-mode");
  }
}
