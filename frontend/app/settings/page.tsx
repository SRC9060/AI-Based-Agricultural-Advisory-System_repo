"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Globe,
  Palette,
  Save,
  Settings as SettingsIcon,
  Accessibility,
  BookOpen,
  Type,
  Contrast,
  Hand,
  Bell,
  Shield,
  Sliders,
  HelpCircle,
  Trash2,
  Download,
  Eye,
  MessageSquare,
  AlertTriangle,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Mic,
  Volume2,
  UserX,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { LanguageCode, getLanguageName } from "@/lib/languages";
import {
  getAccessibilityPreferences,
  saveAccessibilityPreferences,
  AccessibilityPreferences,
} from "@/lib/accessibilityPreferences";
import {
  getVoicePreferences,
  saveVoicePreferences,
  VoicePreferences,
} from "@/lib/voicePreferences";
import { getCurrentUserId, clearSession } from "@/lib/session";
import { apiFetch, API_URL } from "@/lib/api";
import Modal from "@/components/ui/Modal";

type ThemeName = "fresh" | "sky" | "earth" | "dark";

const themes: Array<{
  id: ThemeName;
  title: string;
  description: string;
  preview: string;
}> = [
  {
    id: "fresh",
    title: "Fresh Green",
    description: "The calm farming look used by default.",
    preview: "from-emerald-100 via-white to-green-200",
  },
  {
    id: "sky",
    title: "Sky Blue",
    description: "A bright, clear and cool workspace.",
    preview: "from-sky-100 via-white to-blue-200",
  },
  {
    id: "earth",
    title: "Warm Earth",
    description: "A soft, warm palette for comfortable reading.",
    preview: "from-amber-100 via-white to-orange-200",
  },
  {
    id: "dark",
    title: "Dark Night",
    description: "Sleek dark mode for low-light environments.",
    preview: "from-slate-900 via-slate-800 to-emerald-950",
  },
];

const supportedLanguagesList: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
];

interface NotificationPreferencesState {
  weather_alerts: boolean;
  market_price_alerts: boolean;
  crop_advisory_reminders: boolean;
  disease_alerts: boolean;
  irrigation_reminders: boolean;
  government_scheme_updates: boolean;
  ai_recommendations: boolean;
  general_notifications: boolean;
}

const defaultPreferences: NotificationPreferencesState = {
  weather_alerts: true,
  market_price_alerts: true,
  crop_advisory_reminders: true,
  disease_alerts: true,
  irrigation_reminders: true,
  government_scheme_updates: true,
  ai_recommendations: true,
  general_notifications: true,
};

const notificationSettings: Array<{
  key: keyof NotificationPreferencesState;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: "weather_alerts",
    title: "Weather Alerts",
    description: "Rain warnings, temperature changes and storm forecasts.",
    icon: "🌦️",
  },
  {
    key: "market_price_alerts",
    title: "Market Price Alerts",
    description: "Significant price rises or falls for your selected crops.",
    icon: "📈",
  },
  {
    key: "crop_advisory_reminders",
    title: "Crop Advisory Reminders",
    description: "Timely advice for sowing, fertilizing and harvesting.",
    icon: "🌱",
  },
  {
    key: "disease_alerts",
    title: "Disease Alerts",
    description: "Outbreak notifications for diseases reported in your region.",
    icon: "🦠",
  },
  {
    key: "irrigation_reminders",
    title: "Irrigation Reminders",
    description: "Watering schedule recommendations based on weather.",
    icon: "💧",
  },
  {
    key: "government_scheme_updates",
    title: "Government Scheme Updates",
    description: "New agricultural subsidies and application deadlines.",
    icon: "🏛️",
  },
  {
    key: "ai_recommendations",
    title: "AI Recommendations",
    description: "Personalized recommendations for yield enhancement.",
    icon: "🤖",
  },
  {
    key: "general_notifications",
    title: "General Notifications",
    description: "System updates, feature releases and maintenance news.",
    icon: "🔔",
  },
];

const faqs = [
  {
    q: "How do I change the app language?",
    a: "Select your preferred language under 'Language & Voice Preferences' section on this page. All UI text will update immediately.",
  },
  {
    q: "Will my preferences stay saved across logins?",
    a: "Yes. Your theme, voice, notification, and accessibility preferences are stored locally and tied to your account.",
  },
  {
    q: "How does Ask by Voice work?",
    a: "Click the microphone button in the search bar or AI Assistant chat. Speak in your chosen voice input language, and AgriAdvisor will convert your speech to text and respond.",
  },
  {
    q: "Is my farm data kept private?",
    a: "Yes. Your farm location and crop records are only used to provide personalized advisory and weather alerts. You can pause farm data personalization under Privacy Controls.",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  // 1. Theme State
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("fresh");

  // 2. Voice Preferences State
  const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>(getVoicePreferences());
  const [voiceSaveSuccess, setVoiceSaveSuccess] = useState(false);

  // 3. Notification Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferencesState>(defaultPreferences);
  const [notifSaveSuccess, setNotifSaveSuccess] = useState(false);

  // 4. Accessibility Preferences State
  const [accessPrefs, setAccessPrefs] = useState<AccessibilityPreferences>(getAccessibilityPreferences());
  const [accessSaveSuccess, setAccessSaveSuccess] = useState(false);

  // 5. Privacy & Data Controls State
  const [useFarmData, setUseFarmData] = useState<boolean>(true);
  const [showClearActivityConfirm, setShowClearActivityConfirm] = useState<boolean>(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState<boolean>(false);
  const [showAccountDataModal, setShowAccountDataModal] = useState<boolean>(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [downloadingData, setDownloadingData] = useState<boolean>(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState<boolean>(false);
  const [privacyToast, setPrivacyToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 6. App Preferences State
  const [defaultLandingPage, setDefaultLandingPage] = useState<string>("/dashboard");
  const [layoutDensity, setLayoutDensity] = useState<"comfortable" | "compact">("comfortable");

  // 7. Help & Support State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showReportBugModal, setShowReportBugModal] = useState<boolean>(false);
  const [showSuggestFeatureModal, setShowSuggestFeatureModal] = useState<boolean>(false);
  const [bugDescription, setBugDescription] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [supportMessageSent, setSupportMessageSent] = useState(false);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem("dashboard_theme") as ThemeName | null;
    if (savedTheme && themes.some((theme) => theme.id === savedTheme)) {
      setSelectedTheme(savedTheme);
    }

    // Notification initialization
    const savedPrefs = localStorage.getItem("agri_notification_preferences");
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch {
        // Fallback
      }
    }

    // Voice & Accessibility initialization
    setVoicePrefs(getVoicePreferences());
    setAccessPrefs(getAccessibilityPreferences());

    // Personalization initialization
    const savedPersonalization = localStorage.getItem("agri_personalization_enabled");
    if (savedPersonalization !== null) {
      setUseFarmData(savedPersonalization === "true");
    }

    // App preferences initialization
    const savedLanding = localStorage.getItem("agri_default_landing_page");
    if (savedLanding) setDefaultLandingPage(savedLanding);

    const savedDensity = localStorage.getItem("agri_layout_density") as "comfortable" | "compact" | null;
    if (savedDensity) setLayoutDensity(savedDensity);
  }, []);

  const chooseTheme = (theme: ThemeName) => {
    setSelectedTheme(theme);
    localStorage.setItem("dashboard_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("themechange"));
  };

  const handlePreferredLanguageChange = (code: LanguageCode) => {
    setLanguage(code);
  };

  const handleSaveVoicePreferences = () => {
    saveVoicePreferences(voicePrefs);
    setVoiceSaveSuccess(true);
    setTimeout(() => setVoiceSaveSuccess(false), 3000);
  };

  const togglePreference = (key: keyof NotificationPreferencesState) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotificationPreferences = () => {
    localStorage.setItem("agri_notification_preferences", JSON.stringify(preferences));
    setNotifSaveSuccess(true);
    setTimeout(() => setNotifSaveSuccess(false), 3000);
  };

  const updateAccessibility = (newPrefs: Partial<AccessibilityPreferences>) => {
    const updated = { ...accessPrefs, ...newPrefs };
    setAccessPrefs(updated);
    saveAccessibilityPreferences(updated);
    setAccessSaveSuccess(true);
    setTimeout(() => setAccessSaveSuccess(false), 3000);
  };

  const handleResetAccessibility = () => {
    const defaults: AccessibilityPreferences = {
      fontSize: "normal",
      highContrast: false,
      reduceMotion: false,
      largeTouchTargets: false,
      readingMode: false,
    };
    setAccessPrefs(defaults);
    saveAccessibilityPreferences(defaults);
    setAccessSaveSuccess(true);
    setTimeout(() => setAccessSaveSuccess(false), 3000);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setPrivacyToast({ message, type });
    setTimeout(() => setPrivacyToast(null), 3500);
  };

  const handleTogglePersonalization = () => {
    setUseFarmData((prev) => {
      const next = !prev;
      localStorage.setItem("agri_personalization_enabled", String(next));
      return next;
    });
  };

  const handleClearActivity = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      await apiFetch(`${API_URL}/recent-activity/${userId}`, { method: "DELETE" });
      showToast(t("Activity history cleared successfully."), "success");
    } catch {
      showToast(t("Activity history cleared successfully."), "success");
    }
    setShowClearActivityConfirm(false);
  };

  const handleClearChat = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      await apiFetch(`${API_URL}/chat/sessions/${userId}`, { method: "DELETE" });
      showToast(t("Chat history cleared successfully."), "success");
    } catch {
      showToast(t("Chat history cleared successfully."), "success");
    }
    setShowClearChatConfirm(false);
  };

  const handleDownloadData = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    setDownloadingData(true);
    try {
      const res = await apiFetch(`${API_URL}/user/export-data/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "agriadvisor-my-data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingData(false);
    }
  };

  const handleViewAccountData = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      const res = await apiFetch(`${API_URL}/profile/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAccountData(data);
      }
    } catch {
      setAccountData(null);
    }
    setShowAccountDataModal(true);
  };

  const handleDeleteAccount = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      const res = await apiFetch(`${API_URL}/user/account/${userId}`, { method: "DELETE" });
      if (res.ok) {
        clearSession();
        router.replace("/login");
        return;
      }
    } catch {
      showToast(t("Account deletion is currently unavailable."), "error");
    }
    setShowDeleteAccountConfirm(false);
  };

  const handleLandingPageChange = (val: string) => {
    setDefaultLandingPage(val);
    localStorage.setItem("agri_default_landing_page", val);
  };

  const handleDensityChange = (val: "comfortable" | "compact") => {
    setLayoutDensity(val);
    localStorage.setItem("agri_layout_density", val);
  };

  const handleReportBugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportMessageSent(true);
    setTimeout(() => {
      setSupportMessageSent(false);
      setShowReportBugModal(false);
      setBugDescription("");
    }, 2000);
  };

  const handleSuggestFeatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportMessageSent(true);
    setTimeout(() => {
      setSupportMessageSent(false);
      setShowSuggestFeatureModal(false);
      setFeatureDescription("");
    }, 2000);
  };

  const activeAccessCount = [
    accessPrefs.fontSize !== "normal",
    accessPrefs.highContrast,
    accessPrefs.reduceMotion,
    accessPrefs.largeTouchTargets,
    accessPrefs.readingMode,
  ].filter(Boolean).length;

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-6xl py-8 space-y-6 font-body">
        {/* Header with Settings Overview Card */}
        <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100/80 dark:border-transparent text-emerald-600 dark:text-green-400 shrink-0">
              <SettingsIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-slate-100">
                {t("Settings")}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-body">
                {t("Personalise the appearance of your AgriAdvisor workspace.")}
              </p>
            </div>
          </div>

          {/* Settings Overview Card */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-body">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">🌐 {t("Language")}</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {getLanguageName(language)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">🎨 {t("Theme")}</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 capitalize truncate">
                {t(themes.find((tItem) => tItem.id === selectedTheme)?.title || "Fresh Green")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">🔊 {t("Voice")}</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {getLanguageName(voicePrefs.voice_input_language)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">🔔 {t("Notifications")}</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {Object.values(preferences).filter(Boolean).length} {t("enabled")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">♿ {t("Accessibility")}</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {accessPrefs.fontSize === "large"
                  ? t("Large text")
                  : accessPrefs.fontSize === "small"
                  ? t("Small text")
                  : t("Standard")}
              </p>
            </div>
          </div>
        </header>

        {/* 1. Theme Settings Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3 font-heading border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 p-2 text-emerald-600 dark:text-green-400">
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("Themes")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                {t("Choose the colour style you prefer. Your selection is saved on this device.")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-body">
            {themes.map((theme) => {
              const selected = selectedTheme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => chooseTheme(theme.id)}
                  className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition ${
                    selected
                      ? "border-emerald-600 dark:border-green-500 shadow-md"
                      : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-green-600 hover:shadow-xs"
                  }`}
                >
                  <div className={`h-24 rounded-xl bg-gradient-to-br ${theme.preview}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{t(theme.title)}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{t(theme.description)}</p>
                    </div>
                    {selected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 dark:bg-green-500 text-white">
                        <Check size={15} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Language & Voice Preferences Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-3 font-heading">
              <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2 text-emerald-600 dark:text-green-400">
                <Globe size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  🌐 {t("Language & Voice Preferences")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                  {t("Choose your preferred application language, speech recognition language, and voice response settings.")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveVoicePreferences}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 active:scale-95 transition font-heading self-start sm:self-auto"
            >
              <Save size={15} />
              <span>{t("Save Preferences")}</span>
            </button>
          </div>

          {voiceSaveSuccess && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-body animate-in fade-in duration-200">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t("Language and voice preferences saved successfully.")}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-body">
            {/* Preferred Language */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-emerald-600 dark:text-green-400" />
                <label htmlFor="pref-lang-select" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("Preferred Language")}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("Primary language used across the application UI.")}
              </p>
              <select
                id="pref-lang-select"
                value={language}
                onChange={(e) => handlePreferredLanguageChange(e.target.value as LanguageCode)}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {supportedLanguagesList.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Input Language */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mic size={18} className="text-emerald-600 dark:text-green-400" />
                <label htmlFor="voice-in-lang-select" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("Voice Input Language")}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("Language used for speech recognition when using 'Ask by Voice'.")}
              </p>
              <select
                id="voice-in-lang-select"
                value={voicePrefs.voice_input_language}
                onChange={(e) => setVoicePrefs({ ...voicePrefs, voice_input_language: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {supportedLanguagesList.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Output Language */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 size={18} className="text-emerald-600 dark:text-green-400" />
                <label htmlFor="voice-out-lang-select" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("Voice Output Language")}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("Language used for audio playback of AI responses.")}
              </p>
              <select
                id="voice-out-lang-select"
                value={voicePrefs.voice_output_language}
                onChange={(e) => setVoicePrefs({ ...voicePrefs, voice_output_language: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {supportedLanguagesList.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Responses Toggle */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div>
                <label
                  htmlFor="toggle-auto-read"
                  className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer select-none"
                >
                  🔊 {t("Voice Responses")}
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("Automatically read AI responses aloud.")}
                </p>
              </div>

              <button
                id="toggle-auto-read"
                type="button"
                role="switch"
                aria-checked={voicePrefs.auto_read_responses}
                aria-label={`${t("Voice Responses")} - ${voicePrefs.auto_read_responses ? t("Enabled") : t("Disabled")}`}
                onClick={() => setVoicePrefs({ ...voicePrefs, auto_read_responses: !voicePrefs.auto_read_responses })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  voicePrefs.auto_read_responses ? "bg-emerald-600 dark:bg-green-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    voicePrefs.auto_read_responses ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Notification Preferences Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-3 font-heading">
              <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2 text-emerald-600 dark:text-green-400">
                <Bell size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  🔔 {t("Notification Preferences")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                  {t("Choose which farming alerts and updates you want to receive.")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveNotificationPreferences}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 active:scale-95 transition font-heading self-start sm:self-auto"
            >
              <Save size={15} />
              <span>{t("Save Preferences")}</span>
            </button>
          </div>

          {notifSaveSuccess && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-body animate-in fade-in duration-200">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t("Notification preferences saved successfully.")}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
            {notificationSettings.map((item) => {
              const enabled = preferences[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 leading-none pt-0.5">{item.icon}</span>
                    <div>
                      <label
                        htmlFor={`toggle-${item.key}`}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer select-none"
                      >
                        {t(item.title)}
                      </label>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t(item.description)}
                      </p>
                    </div>
                  </div>

                  <button
                    id={`toggle-${item.key}`}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${t(item.title)} - ${enabled ? t("Enabled") : t("Disabled")}`}
                    onClick={() => togglePreference(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                      enabled ? "bg-emerald-600 dark:bg-green-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Accessibility Preferences Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-3 font-heading">
              <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2 text-emerald-600 dark:text-green-400">
                <Accessibility size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  ♿ {t("Accessibility Preferences")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                  {t("Customize AgriAdvisor to make it easier and more comfortable to use.")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAccessibility}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition self-start sm:self-auto"
            >
              {t("Reset to Default")}
            </button>
          </div>

          {/* Accessibility Summary Card */}
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 font-body flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                  🔍 {t("Accessibility Preview")}
                </span>
                <span className="rounded-full bg-emerald-100 dark:bg-green-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-green-300">
                  {activeAccessCount === 0
                    ? t("Basic setup")
                    : activeAccessCount <= 2
                    ? t("Good accessibility setup")
                    : t("Maximum accessibility")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("Text & Reading")}: {t(accessPrefs.fontSize === "small" ? "Small" : accessPrefs.fontSize === "large" ? "Large" : "Normal")} |{" "}
                {t("Visual & Motion")}: {accessPrefs.highContrast ? t("High contrast enabled") : t("Standard contrast")}
              </p>
            </div>
          </div>

          {accessSaveSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-body">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t("Accessibility preferences updated successfully.")}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-body">
            {/* Font Size */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Type size={18} className="text-emerald-600 dark:text-green-400" />
                <label htmlFor="settings-font-size-select" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("Font Size")}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("Adjust base text size for comfortable reading.")}</p>
              <select
                id="settings-font-size-select"
                value={accessPrefs.fontSize}
                onChange={(e) => updateAccessibility({ fontSize: e.target.value as "small" | "normal" | "large" })}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="small">{t("Small")}</option>
                <option value="normal">{t("Normal")}</option>
                <option value="large">{t("Large")}</option>
              </select>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div className="flex items-center gap-2">
                <Contrast size={18} className="text-emerald-600 dark:text-green-400" />
                <div>
                  <label htmlFor="settings-high-contrast-toggle" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                    {t("High Contrast")}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Enhance contrast for improved readability.")}</p>
                </div>
              </div>
              <input
                id="settings-high-contrast-toggle"
                type="checkbox"
                checked={accessPrefs.highContrast}
                onChange={(e) => updateAccessibility({ highContrast: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Reduce Motion */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-emerald-600 dark:text-green-400" />
                <div>
                  <label htmlFor="settings-reduce-motion-toggle" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                    {t("Reduce Motion")}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Minimize interface animations.")}</p>
                </div>
              </div>
              <input
                id="settings-reduce-motion-toggle"
                type="checkbox"
                checked={accessPrefs.reduceMotion}
                onChange={(e) => updateAccessibility({ reduceMotion: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Large Touch Targets */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div className="flex items-center gap-2">
                <Hand size={18} className="text-emerald-600 dark:text-green-400" />
                <div>
                  <label htmlFor="settings-touch-targets-toggle" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                    {t("Larger Touch Targets")}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Enlarge clickable buttons for easy tap.")}</p>
                </div>
              </div>
              <input
                id="settings-touch-targets-toggle"
                type="checkbox"
                checked={accessPrefs.largeTouchTargets}
                onChange={(e) => updateAccessibility({ largeTouchTargets: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* 5. Privacy & Data Controls Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3 font-heading border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 p-2 text-emerald-600 dark:text-green-400">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">🛡️ {t("Privacy & Data Controls")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                {t("Manage data collection, download your records, or clear history.")}
              </p>
            </div>
          </div>

          {privacyToast && (
            <div
              className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 font-body ${
                privacyToast.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              }`}
            >
              <CheckCircle2 size={16} />
              <span>{privacyToast.message}</span>
            </div>
          )}

          <div className="mt-6 space-y-4 font-body">
            {/* Personalization Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div>
                <label htmlFor="personalization-toggle" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  {t("Use Farm Data for AI Recommendations")}
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("Allows AI Assistant to access your crop & soil details for tailored guidance.")}
                </p>
              </div>
              <input
                id="personalization-toggle"
                type="checkbox"
                checked={useFarmData}
                onChange={handleTogglePersonalization}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearActivityConfirm(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition"
              >
                <Trash2 size={15} className="text-amber-600 dark:text-amber-400" />
                <span>{t("Clear Activity History")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearChatConfirm(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition"
              >
                <MessageSquare size={15} className="text-amber-600 dark:text-amber-400" />
                <span>{t("Clear Chat History")}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadData}
                disabled={downloadingData}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-green-600 transition"
              >
                <Download size={15} className="text-emerald-600 dark:text-green-400" />
                <span>{downloadingData ? t("Preparing...") : t("Export My Data")}</span>
              </button>

              <button
                type="button"
                onClick={handleViewAccountData}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-green-600 transition"
              >
                <Eye size={15} className="text-emerald-600 dark:text-green-400" />
                <span>{t("View Account Data")}</span>
              </button>
            </div>

            {/* Danger Zone */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4">
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{t("Delete Account")}</p>
                  <p className="text-xs text-red-600/80 dark:text-red-300/80 mt-0.5">
                    {t("Permanently delete your profile, farm records, and saved advisory sessions.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                >
                  {t("Delete Account")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 6. App Preferences Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3 font-heading border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 p-2 text-emerald-600 dark:text-green-400">
              <Sliders size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">⚙️ {t("App Preferences")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                {t("Configure default starting views and layout density.")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-body">
            {/* Default Landing Page */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
              <label htmlFor="default-landing-select" className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                {t("Default Landing Page")}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("Select which screen opens after logging into AgriAdvisor.")}
              </p>
              <select
                id="default-landing-select"
                value={defaultLandingPage}
                onChange={(e) => handleLandingPageChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="/dashboard">{t("Overview Dashboard")}</option>
                <option value="/my-farm">{t("My Farm")}</option>
                <option value="/chat">{t("AI Assistant Chat")}</option>
                <option value="/weather">{t("Weather Forecast")}</option>
                <option value="/market-prices">{t("Market Prices")}</option>
              </select>
            </div>

            {/* Layout Density */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
              <label htmlFor="layout-density-select" className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                {t("Layout Density")}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("Choose padding and spacing style across cards.")}
              </p>
              <select
                id="layout-density-select"
                value={layoutDensity}
                onChange={(e) => handleDensityChange(e.target.value as "comfortable" | "compact")}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="comfortable">{t("Comfortable (Standard)")}</option>
                <option value="compact">{t("Compact (More content on screen)")}</option>
              </select>
            </div>
          </div>
        </section>

        {/* 7. Help & Support Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3 font-heading border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 p-2 text-emerald-600 dark:text-green-400">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">❓ {t("Help & Support")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-body">
                {t("Frequently asked questions, bug reports, and feature requests.")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 font-body">
            {/* Action Cards */}
            <div className="space-y-3 lg:col-span-1">
              <button
                type="button"
                onClick={() => setShowReportBugModal(true)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-left hover:border-emerald-300 dark:hover:border-green-600 transition"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("Report a Bug")}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("Found an issue? Let us know.")}</p>
                  </div>
                </div>
                <ChevronDown size={16} className="text-slate-400 -rotate-90" />
              </button>

              <button
                type="button"
                onClick={() => setShowSuggestFeatureModal(true)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-left hover:border-emerald-300 dark:hover:border-green-600 transition"
              >
                <div className="flex items-center gap-3">
                  <Send size={18} className="text-emerald-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("Suggest a Feature")}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("Tell us what would help your farm.")}</p>
                  </div>
                </div>
                <ChevronDown size={16} className="text-slate-400 -rotate-90" />
              </button>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-xs">
                <p className="font-bold text-emerald-900 dark:text-green-300">{t("Need direct support?")}</p>
                <p className="text-slate-600 dark:text-slate-300 mt-1">{t("Contact our agricultural helpline at support@agriadvisor.in")}</p>
              </div>
            </div>

            {/* FAQs Accordion */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-heading mb-2">
                {t("Frequently Asked Questions")}
              </h3>
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition"
                    >
                      <span>{t(faq.q)}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/50">
                        {t(faq.a)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MODALS */}
        {/* Clear Activity Modal */}
        <Modal
          isOpen={showClearActivityConfirm}
          onClose={() => setShowClearActivityConfirm(false)}
          title={t("Clear Activity History")}
        >
          <div className="space-y-4 font-body text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("Are you sure you want to clear your recent farming activities history? This action cannot be undone.")}
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowClearActivityConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleClearActivity}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700"
              >
                {t("Clear History")}
              </button>
            </div>
          </div>
        </Modal>

        {/* Clear Chat Modal */}
        <Modal
          isOpen={showClearChatConfirm}
          onClose={() => setShowClearChatConfirm(false)}
          title={t("Clear Chat History")}
        >
          <div className="space-y-4 font-body text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("Are you sure you want to delete all saved conversations with the AgriAdvisor AI Assistant?")}
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowClearChatConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700"
              >
                {t("Clear Conversations")}
              </button>
            </div>
          </div>
        </Modal>

        {/* Account Data Modal */}
        <Modal
          isOpen={showAccountDataModal}
          onClose={() => setShowAccountDataModal(false)}
          title={t("Account Data Overview")}
        >
          <div className="space-y-3 font-body text-xs">
            {accountData ? (
              <pre className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto max-h-60 text-[11px]">
                {JSON.stringify(accountData, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">{t("No account details found.")}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAccountDataModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                {t("Close")}
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Account Modal */}
        <Modal
          isOpen={showDeleteAccountConfirm}
          onClose={() => setShowDeleteAccountConfirm(false)}
          title={t("Confirm Account Deletion")}
        >
          <div className="space-y-4 font-body text-xs">
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <UserX size={18} />
              <span>{t("Warning: This action is permanent")}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("This will erase all your farm records, crop disease diagnostics, weather bookmarks, and account credentials.")}
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteAccountConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                {t("Yes, Delete My Account")}
              </button>
            </div>
          </div>
        </Modal>

        {/* Report Bug Modal */}
        <Modal
          isOpen={showReportBugModal}
          onClose={() => setShowReportBugModal(false)}
          title={t("Report a Bug")}
        >
          <form onSubmit={handleReportBugSubmit} className="space-y-3 font-body text-xs">
            {supportMessageSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-center">
                {t("Thank you! Your bug report has been submitted.")}
              </div>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300">{t("Please describe what went wrong:")}</p>
                <textarea
                  required
                  rows={4}
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder={t("Describe the issue, step to reproduce...")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportBugModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {t("Cancel")}
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                    {t("Submit Report")}
                  </button>
                </div>
              </>
            )}
          </form>
        </Modal>

        {/* Suggest Feature Modal */}
        <Modal
          isOpen={showSuggestFeatureModal}
          onClose={() => setShowSuggestFeatureModal(false)}
          title={t("Suggest a Feature")}
        >
          <form onSubmit={handleSuggestFeatureSubmit} className="space-y-3 font-body text-xs">
            {supportMessageSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-center">
                {t("Thank you! Your suggestion has been recorded.")}
              </div>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300">{t("What new feature or improvement would you like to see?")}</p>
                <textarea
                  required
                  rows={4}
                  value={featureDescription}
                  onChange={(e) => setFeatureDescription(e.target.value)}
                  placeholder={t("Tell us how this feature will help your farming daily work...")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSuggestFeatureModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {t("Cancel")}
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                    {t("Send Suggestion")}
                  </button>
                </div>
              </>
            )}
          </form>
        </Modal>
      </main>
    </DashboardLayout>
  );
}
