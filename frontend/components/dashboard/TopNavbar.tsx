"use client";

import { API_URL, apiFetch } from "@/lib/api";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LogOut, Pencil, Settings } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { getCurrentSession } from "@/lib/session";
import { clearAuthenticatedSession } from "@/lib/auth";

import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Globe,
  LayoutDashboard,
  CloudSun,
  TrendingUp,
  Landmark,
  Bot,
  Sprout,
  Camera,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Farm",
    href: "/my-farm",
    icon: Sprout,
  },
  {
    name: "Disease Detection",
    href: "/disease-detection",
    icon: Camera,
  },
  {
    name: "Weather",
    href: "/weather",
    icon: CloudSun,
  },
  {
    name: "Market",
    href: "/market-prices",
    icon: TrendingUp,
  },
  {
    name: "Schemes",
    href: "/schemes",
    icon: Landmark,
  },
  {
    name: "AI Assistant",
    href: "/chat",
    icon: Bot,
  },
];

const languages = ["English", "हिंदी", "తెలుగు", "ಕನ್ನಡ"] as const;

const langMap = {
  English: "en",
  "हिंदी": "hi",
  "తెలుగు": "te",
  "ಕನ್ನಡ": "kn",
} as const;

const reverseLangMap = {
  en: "English",
  hi: "हिंदी",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
} as const;

const additionalLanguages = ["தமிழ்", "മലയാളം", "मराठी", "ગુજરાતી"] as const;
const languageOptions = [...languages, ...additionalLanguages];
const languageCodeMap = {
  ...langMap,
  "தமிழ்": "ta",
  "മലയാളം": "ml",
  "मराठी": "mr",
  "ગુજરાતી": "gu",
} as const;
const languageNameMap = {
  ...reverseLangMap,
  ta: "தமிழ்",
  ml: "മലയാളം",
  mr: "मराठी",
  gu: "ગુજરાતી",
} as const;

// Notification records store stable English text in the database.  Keep that
// data language-neutral, then translate the display text for the user's
// currently selected language.
const notificationLabels: Record<string, Record<string, string>> = {
  hi: {
    "Profile updated": "प्रोफ़ाइल अपडेट की गई",
    "Your farming profile has been updated successfully.": "आपकी कृषि प्रोफ़ाइल सफलतापूर्वक अपडेट कर दी गई है।",
  },
  te: {
    "Profile updated": "ప్రొఫైల్ నవీకరించబడింది",
    "Your farming profile has been updated successfully.": "మీ వ్యవసాయ ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది.",
  },
  kn: {
    "Profile updated": "ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಲಾಗಿದೆ",
    "Your farming profile has been updated successfully.": "ನಿಮ್ಮ ಕೃಷಿ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ.",
  },
  ta: {
    "Profile updated": "சுயவிவரம் புதுப்பிக்கப்பட்டது",
    "Your farming profile has been updated successfully.": "உங்கள் விவசாய சுயவிவரம் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது.",
  },
  ml: {
    "Profile updated": "പ്രൊഫൈൽ അപ്ഡേറ്റ് ചെയ്തു",
    "Your farming profile has been updated successfully.": "നിങ്ങളുടെ കാർഷിക പ്രൊഫൈൽ വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു.",
  },
  mr: {
    "Profile updated": "प्रोफाइल अद्ययावत केले",
    "Your farming profile has been updated successfully.": "तुमची कृषी प्रोफाइल यशस्वीरित्या अद्ययावत केली आहे.",
  },
  gu: {
    "Profile updated": "પ્રોફાઇલ અપડેટ કરવામાં આવી",
    "Your farming profile has been updated successfully.": "તમારી ખેતી પ્રોફાઇલ સફળતાપૂર્વક અપડેટ કરવામાં આવી છે.",
  },
};

function isAppNotification(value: unknown): value is AppNotification {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).id === "number" &&
    typeof (value as Record<string, unknown>).title === "string" &&
    typeof (value as Record<string, unknown>).message === "string" &&
    typeof (value as Record<string, unknown>).is_read === "boolean"
  );
}

interface TopNavbarProps {
  userAvatar?: string;
}

export default function TopNavbar({
  userAvatar,
}: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  const handleLogout = () => {
    clearAuthenticatedSession();
    localStorage.removeItem("language");
    router.replace("/login");
  };

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read,
  ).length;
  // Use the same initial value on server and browser. Reading localStorage here
  // would make the first browser render differ from the server render.
  const [displayName, setDisplayName] = useState("Farmer");
  const [displayRole] = useState("Farmer");
  const [currentTheme, setCurrentTheme] = useState("fresh");
  const selectedLanguageCode = language;
  const translateNotification = (text: string) => notificationLabels[selectedLanguageCode]?.[text] ?? t(text);

  const [notificationTab, setNotificationTab] = useState<"all" | "unread">("all");

  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem("dashboard_theme") || "fresh";
      setCurrentTheme(saved);
    };
    syncTheme();
    window.addEventListener("themechange", syncTheme);
    return () => window.removeEventListener("themechange", syncTheme);
  }, []);

  const toggleTheme = () => {
    const themeCycle: Record<string, string> = {
      fresh: "sky",
      sky: "earth",
      earth: "dark",
      dark: "fresh",
    };
    const nextTheme = themeCycle[currentTheme] || "fresh";
    setCurrentTheme(nextTheme);
    localStorage.setItem("dashboard_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("themechange"));
  };

  const filteredNotifications = notifications.filter((n) =>
    notificationTab === "unread" ? !n.is_read : true
  );

  const loadNotifications = async (id: number) => {
    try {
      const response = await apiFetch(`${API_URL}/notifications/${id}`);

      if (!response.ok) return;

      const data: unknown = await response.json();

      setNotifications(
        Array.isArray(data)
          ? data.filter(isAppNotification)
          : [],
      );
    } catch {
      // Keep navigation usable when the backend is unavailable.
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userId) return;
    try {
      await apiFetch(`${API_URL}/notifications/${userId}/read-all`, {
        method: "PUT",
      });
      setNotifications((items) =>
        items.map((item) => ({ ...item, is_read: true })),
      );
    } catch {
      // The next refresh will retrieve the saved database state.
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await apiFetch(
        `${API_URL}/notifications/${notificationId}/read`,
        { method: "PUT" },
      );
      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
    } catch {
      // Leave the item unread if the server request fails.
    }
  };

  useEffect(() => {
    const session = getCurrentSession();
    const name = session?.userName;
    const savedUserId = Number(session?.userId);

    if (name) {
      setDisplayName(name);
    }

    if (Number.isInteger(savedUserId) && savedUserId > 0) {
      setUserId(savedUserId);
      loadNotifications(savedUserId);
      const pollId = window.setInterval(
        () => loadNotifications(savedUserId),
        30000,
      );
      return () => window.clearInterval(pollId);
    }
  }, []);

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 pt-4">
      <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none rounded-2xl">
        <div className="flex items-center justify-between h-24 px-6">
          {/* Left */}
          <div className="flex items-center gap-4 sm:gap-6">
            {pathname !== "/dashboard" && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/dashboard");
                  }
                }}
                aria-label={t("Back")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 active:scale-95 transition-all duration-300 font-bold text-sm sm:text-base shadow-md shadow-emerald-600/20 group shrink-0"
                title={t("Back")}
              >
                <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                <span>{t("Back")}</span>
              </button>
            )}

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 dark:bg-green-800 flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Sprout className="text-white" size={28} />
              </div>

              <div>
                <h2 className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                  AgriAdvisor
                </h2>

                <p className="text-[0.9rem] text-slate-500 dark:text-slate-400 font-body">
                  Smart Farming Platform
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-3">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-300 ease-out border
                    ${
                      pathname === item.href
                        ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold border-transparent shadow-md shadow-emerald-600/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-green-400 hover:border-emerald-200"
                    }
                    `}
                  >
                    <Icon
                      size={18}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="text-sm font-medium transition-all duration-300">
                      {t(item.name)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={currentTheme === "dark" ? t("Switch to Light Theme") : t("Switch to Dark Theme")}
              title={currentTheme === "dark" ? t("Switch to Light Theme") : t("Switch to Dark Theme")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700 transition-all duration-300 text-slate-700 dark:text-slate-200"
            >
              {currentTheme === "dark" ? (
                <>
                  <Sun size={18} className="text-amber-400" />
                  <span className="hidden sm:inline text-xs font-semibold">{t("Light")}</span>
                </>
              ) : (
                <>
                  <Moon size={18} className="text-slate-600 dark:text-slate-300" />
                  <span className="hidden sm:inline text-xs font-semibold">{t("Dark")}</span>
                </>
              )}
            </button>

            {/* Language */}
            <LanguageSelector />

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                aria-label={t("Notifications")}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  const opening = !notificationsOpen;
                  setNotificationsOpen(opening);
                  if (opening && userId) loadNotifications(userId);
                }}
                className="group relative w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-green-50 dark:hover:bg-slate-700 transition-all duration-300 text-slate-700 dark:text-slate-200"
              >
                <Bell
                  size={18}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {t("Notifications")}
                    </p>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      >
                        {t("Mark all as read")}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {t("No notifications yet.")}
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => markNotificationRead(notification.id)}
                          className={`block w-full px-4 py-3 text-left hover:bg-green-50 dark:hover:bg-slate-800 ${notification.is_read ? "" : "bg-green-50/70 dark:bg-slate-800/70"}`}
                        >
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {translateNotification(notification.title)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {translateNotification(notification.message)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative">
              <button
                type="button"
                aria-label={t("Open profile menu")}
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-slate-700 transition-all duration-300 text-slate-700 dark:text-slate-200"
              >
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={displayName}
                    width={42}
                    height={42}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-700 dark:bg-green-800 text-white flex items-center justify-center font-bold">
                    {displayName.charAt(0)}
                  </div>
                )}

                <div className="hidden xl:block">
                  <p className="font-semibold text-base text-slate-900 dark:text-slate-100">{displayName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t(displayRole)}</p>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-slate-500 dark:text-slate-400 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-slate-800 hover:text-green-800 dark:hover:text-green-300"
                  >
                    <Pencil size={17} />
                    {t("Edit Profile")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-slate-800 hover:text-green-800 dark:hover:text-green-300"
                  >
                    <Settings size={17} />
                    {t("Settings")}
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <LogOut size={17} />
                    {t("Logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

interface AppNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
