"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, Pencil, Settings } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

import {
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  CloudSun,
  TrendingUp,
  Landmark,
  Bot,
  Sprout,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
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

const languages = ["English", "हिंदी", "తెలుగు", "ಕన్నడ"];

const langMap = {
  English: "en",
  "हिंदी": "hi",
  "తెలుగు": "te",
  "ಕన్నడ": "kn",
};

const reverseLangMap = {
  en: "English",
  hi: "हिंदी",
  te: "తెలుగు",
  kn: "ಕన్నడ",
};

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

interface TopNavbarProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onMenuClick?: () => void;
}

export default function TopNavbar({
  userName = "Aishwarya",
  userRole = "Farmer",
  userAvatar,
  onMenuClick,
}: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("language");

    router.replace("/login");
  };

  const [langOpen, setLangOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const unreadNotifications = notifications.filter((notification) => !notification.is_read).length;
  // Use the same initial value on server and browser. Reading localStorage here
  // would make the first browser render differ from the server render.
  const [selectedLang, setSelectedLang] = useState("English");
  const [displayName, setDisplayName] = useState("Farmer");
  const [displayRole] = useState("Farmer");

  const loadNotifications = async (id: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/notifications/${id}`);
      if (response.ok) setNotifications(await response.json());
    } catch {
      // Keep navigation usable when the backend is unavailable.
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userId) return;
    try {
      await fetch(`http://127.0.0.1:8000/notifications/${userId}/read-all`, { method: "PUT" });
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    } catch {
      // The next refresh will retrieve the saved database state.
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await fetch(`http://127.0.0.1:8000/notifications/${notificationId}/read`, { method: "PUT" });
      setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, is_read: true } : item));
    } catch {
      // Leave the item unread if the server request fails.
    }
  };

  useEffect(() => {

    const name = localStorage.getItem("user_name");
    const savedLang = localStorage.getItem("language") || "en";
    const savedUserId = Number(localStorage.getItem("user_id"));

    if (name) {
      setDisplayName(name);
    }

    setSelectedLang(
      languageNameMap[savedLang as keyof typeof languageNameMap] || "English"
    );

    if (Number.isInteger(savedUserId) && savedUserId > 0) {
      setUserId(savedUserId);
      loadNotifications(savedUserId);
      const pollId = window.setInterval(() => loadNotifications(savedUserId), 30000);
      return () => window.clearInterval(pollId);
    }

  }, []);

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 pt-4">
      <div className="w-full bg-gradient-to-r from-green-50 via-white to-green-50 backdrop-blur-xl border border-green-100 shadow-xl rounded-2xl">

        <div className="flex items-center justify-between h-24 px-10">

          {/* Left */}
          <div className="flex items-center gap-10">

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-green-700 flex items-center justify-center shadow-md">
                <Sprout className="text-white" size={28} />
              </div>

              <div>
                <h2 className="font-bold text-xl tracking-tight text-slate-900">
                  AgriAdvisor
                </h2>

                <p className="text-[0.9rem] text-slate-600">
                  Smart Farming Platform
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-2">

              {navItems.map((item) => {

                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ease-out
                    ${
                      pathname === item.href
                        ? "bg-green-600 text-white font-semibold shadow-md"
                        : "text-slate-600 hover:bg-green-50 hover:text-green-700 hover:shadow-sm"
                    }
                    `}
                  >
                    <Icon
                      size={20}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                <span className="text-base transition-all duration-300">
                  {t(item.name)}
                </span>
                  </Link>
                );

              })}

            </nav>

          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-green-50 transition-all duration-300"
              >
                <Globe size={18} />
                <span className="text-base font-medium">{selectedLang}</span>
                <ChevronDown size={16} />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg z-50 border border-slate-200 overflow-hidden">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        const code = languageCodeMap[lang as keyof typeof languageCodeMap];
                        setSelectedLang(lang);
                        localStorage.setItem("language", code);
                        window.dispatchEvent(new Event("languagechange"));
                        setLangOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-green-100 whitespace-nowrap"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                className="relative w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-green-50 transition-all duration-300"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-800">{t("Notifications")}</p>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-medium text-green-700 hover:text-green-800"
                      >
                        {t("Mark all as read")}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">{t("No notifications yet.")}</p>
                    ) : notifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => markNotificationRead(notification.id)}
                        className={`block w-full px-4 py-3 text-left hover:bg-green-50 ${notification.is_read ? "" : "bg-green-50/70"}`}
                      >
                        <p className="text-sm font-semibold text-slate-800">{t(notification.title)}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{t(notification.message)}</p>
                      </button>
                    ))}
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
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 transition-all duration-300"
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
                    <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold">
                      {displayName.charAt(0)}
                    </div>
                  )}

                  <div className="hidden xl:block">
                    <p className="font-semibold text-base">{displayName}</p>
                    <p className="text-sm text-slate-500">{t(displayRole)}</p>
                  </div>

                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />

              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-800"
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
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-800"
                  >
                    <Settings size={17} />
                    {t("Settings")}
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
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
