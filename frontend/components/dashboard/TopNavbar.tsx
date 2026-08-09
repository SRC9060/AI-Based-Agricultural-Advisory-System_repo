"use client";

import { API_URL, apiFetch } from "@/lib/api";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { getCurrentSession } from "@/lib/session";
import { clearAuthenticatedSession } from "@/lib/auth";

import {
  CircleHelp,
  Bell,
  ChevronDown,
  CloudSun,
  TrendingUp,
  Landmark,
  Bot,
  Sprout,
  Camera,
  Sun,
  Moon,
  LogOut,
  Pencil,
  Settings,
  MoreHorizontal,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: typeof Bot;
  visibility: string; // Tailwind class for navbar visibility
  moreVisibility?: string; // Tailwind class for More dropdown visibility
}

const navItems: NavItem[] = [
  {
    name: "AI Assistant",
    href: "/chat",
    icon: Bot,
    visibility: "flex",
  },
  {
    name: "Weather",
    href: "/weather",
    icon: CloudSun,
    visibility: "flex",
  },
  {
    name: "Market",
    href: "/market-prices",
    icon: TrendingUp,
    visibility: "hidden lg:flex",
    moreVisibility: "block lg:hidden",
  },
  {
    name: "Schemes",
    href: "/schemes",
    icon: Landmark,
    visibility: "hidden xl:flex",
    moreVisibility: "block xl:hidden",
  },
  {
    name: "Farm",
    href: "/my-farm",
    icon: Sprout,
    visibility: "hidden 2xl:flex",
    moreVisibility: "block 2xl:hidden",
  },
  {
    name: "Disease",
    href: "/disease-detection",
    icon: Camera,
    visibility: "hidden 2xl:flex",
    moreVisibility: "block 2xl:hidden",
  },
  {
    name: "My Queries",
    href: "/queries",
    icon: CircleHelp,
    visibility: "hidden 2xl:flex",
    moreVisibility: "block 2xl:hidden",
  },
];

// Notification records store stable English text in the database.
// Translate the display text for the user's currently selected language.
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

export default function TopNavbar({ userAvatar }: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t } = useTranslation();

  const handleLogout = () => {
    clearAuthenticatedSession();
    localStorage.removeItem("language");
    router.replace("/login");
  };

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const [displayName, setDisplayName] = useState("Farmer");
  const [displayRole] = useState("Farmer");
  const [currentTheme, setCurrentTheme] = useState("fresh");
  const selectedLanguageCode = language;
  const translateNotification = (text: string) =>
    notificationLabels[selectedLanguageCode]?.[text] ?? t(text);

  const [notificationTab, setNotificationTab] = useState<"all" | "unread">("all");

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Check if any item that could be inside "More" dropdown is active
  const isMoreActive = navItems.slice(2).some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );

  // Close menus on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target)
      ) {
        setMoreMenuOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
        setMoreMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMoreMenuOpen(false);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem("dashboard_theme") || "fresh";
      setCurrentTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    syncTheme();
    window.addEventListener("themechange", syncTheme);
    return () => {
      window.removeEventListener("themechange", syncTheme);
    };
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
    notificationTab === "unread" ? !n.is_read : true,
  );

  const loadNotifications = async (id: number) => {
    try {
      const response = await apiFetch(`${API_URL}/notifications/${id}`);
      if (!response.ok) return;
      const data: unknown = await response.json();
      setNotifications(
        Array.isArray(data) ? data.filter(isAppNotification) : [],
      );
    } catch {
      // Keep navigation usable when backend is unavailable
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
      // Retained in state
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await apiFetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: "PUT",
      });
      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
    } catch {
      // Retained in state
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
    <header className="sticky top-2 sm:top-4 z-50 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none rounded-2xl sm:rounded-3xl transition-all duration-300">
        <div className="flex items-center justify-between min-h-[4.25rem] sm:h-20 px-2.5 sm:px-5 lg:px-6 gap-1.5 sm:gap-4">
          {/* Left: Logo + Dynamic Desktop/Tablet Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 min-w-0">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 group"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 dark:bg-green-800 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
                <Sprout className="text-white w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>

              <div className="flex flex-col">
                <h2 className="font-bold text-sm sm:text-base lg:text-xl tracking-tight text-slate-900 dark:text-slate-100 font-heading leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  AgriAdvisor
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-body hidden md:block leading-tight">
                  Smart Farming Platform
                </p>
              </div>
            </Link>

            {/* Dynamic Navigation (visible on md+ screens: scales from 2 to 7 items + More dropdown) */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 ml-0.5 sm:ml-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={t(item.name)}
                    className={`group relative ${item.visibility} items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all duration-200 border text-xs font-semibold shrink-0
                    ${isActive
                        ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white border-transparent shadow-sm shadow-emerald-600/20"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-green-400 hover:border-emerald-200"
                      }
                    `}
                  >
                    <Icon
                      size={15}
                      className="transition-transform group-hover:scale-110 shrink-0"
                    />
                    <span className="whitespace-nowrap">{t(item.name)}</span>
                  </Link>
                );
              })}

              {/* More dropdown (visible on md, lg, xl screens where some items are hidden; hidden on 2xl) */}
              <div className="relative shrink-0 block 2xl:hidden" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    const opening = !moreMenuOpen;
                    setMoreMenuOpen(opening);
                    if (opening) {
                      setNotificationsOpen(false);
                      setProfileMenuOpen(false);
                      setMobileMenuOpen(false);
                    }
                  }}
                  aria-expanded={moreMenuOpen}
                  aria-label={t("More")}
                  title={t("More")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${isMoreActive || moreMenuOpen
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white border-transparent shadow-sm shadow-emerald-600/20"
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-green-400 hover:border-emerald-200"
                    }`}
                >
                  <MoreHorizontal size={15} className="shrink-0" />
                  <span className="whitespace-nowrap">{t("More")}</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 shrink-0 ${moreMenuOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {moreMenuOpen && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-48 sm:w-56 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 mb-1 font-heading">
                      {t("More Services")}
                    </div>
                    <div className="space-y-1">
                      {navItems.map((item) => {
                        if (!item.moreVisibility) return null;
                        const Icon = item.icon;
                        const isActive =
                          pathname === item.href ||
                          (item.href !== "/dashboard" &&
                            pathname.startsWith(item.href));

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMoreMenuOpen(false)}
                            className={`${item.moreVisibility} flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400"
                              }`}
                          >
                            <Icon
                              size={16}
                              className="text-emerald-600 dark:text-emerald-400 shrink-0"
                            />
                            <span className="truncate">{t(item.name)}</span>
                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 shrink-0">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Theme: ${currentTheme}`}
              title={`Current theme: ${currentTheme}`}
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-200 transition-all duration-200 text-slate-700 dark:text-slate-200 shrink-0"
            >
              {currentTheme === "dark" ? (
                <Moon size={16} className="text-slate-300 shrink-0" />
              ) : (
                <Sun size={16} className="text-amber-500 shrink-0" />
              )}
              <span className="capitalize text-xs font-medium hidden lg:inline">
                {currentTheme}
              </span>
            </button>

            {/* Language Selector */}
            <LanguageSelector className="shrink-0" />

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                aria-label={t("Notifications")}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  const opening = !notificationsOpen;
                  setNotificationsOpen(opening);
                  if (opening) {
                    setProfileMenuOpen(false);
                    setMoreMenuOpen(false);
                    setMobileMenuOpen(false);
                    if (userId) loadNotifications(userId);
                  }
                }}
                className="relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-200 transition-all duration-200 text-slate-700 dark:text-slate-200 shrink-0"
              >
                <Bell
                  size={16}
                  className="transition-transform hover:scale-110"
                />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-80 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 font-heading">
                        {t("Notifications")}
                      </p>
                      {unreadNotifications > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {unreadNotifications} new
                        </span>
                      )}
                    </div>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
                      >
                        {t("Mark all as read")}
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs px-2 pt-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setNotificationTab("all")}
                      className={`px-3 py-1.5 font-medium rounded-t-lg transition-colors ${notificationTab === "all"
                        ? "border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                        }`}
                    >
                      {t("All")} ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab("unread")}
                      className={`px-3 py-1.5 font-medium rounded-t-lg transition-colors ${notificationTab === "unread"
                        ? "border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                        }`}
                    >
                      {t("Unread")} ({unreadNotifications})
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                    {filteredNotifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-body">
                        {notificationTab === "unread"
                          ? t("No unread notifications.")
                          : t("No notifications yet.")}
                      </p>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => markNotificationRead(notification.id)}
                          className={`block w-full px-4 py-3 text-left transition-colors hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 cursor-pointer ${notification.is_read
                            ? "opacity-75"
                            : "bg-emerald-50/40 dark:bg-slate-800/40 font-medium"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 font-heading">
                              {translateNotification(notification.title)}
                            </p>
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 font-body">
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
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                aria-label={t("Open profile menu")}
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  const opening = !profileMenuOpen;
                  setProfileMenuOpen(opening);
                  if (opening) {
                    setNotificationsOpen(false);
                    setMoreMenuOpen(false);
                    setMobileMenuOpen(false);
                  }
                }}
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-200 transition-all duration-200 text-slate-700 dark:text-slate-200 shrink-0"
              >
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 font-heading">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="hidden 2xl:block text-left pr-1">
                  <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[100px] font-heading">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-body">
                    {t(displayRole)}
                  </p>
                </div>

                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${profileMenuOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 sm:w-52 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate font-heading">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-body">
                      {t(displayRole)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Pencil size={15} />
                    {t("Edit Profile")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Settings size={15} />
                    {t("Settings")}
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut size={15} />
                    {t("Logout")}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button (< md screens / phone devices) */}
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                aria-label={mobileMenuOpen ? t("Close Menu") : t("Open Menu")}
                aria-expanded={mobileMenuOpen}
                onClick={() => {
                  const opening = !mobileMenuOpen;
                  setMobileMenuOpen(opening);
                  if (opening) {
                    setNotificationsOpen(false);
                    setProfileMenuOpen(false);
                    setMoreMenuOpen(false);
                  }
                }}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all duration-200 shrink-0 ${mobileMenuOpen
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-200"
                  }`}
              >
                {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Modal / Drawer (< md screens / phone devices) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-3.5 py-4 space-y-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${isActive
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white border-transparent shadow-sm shadow-emerald-600/20"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-400"
                      }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{t(item.name)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
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

