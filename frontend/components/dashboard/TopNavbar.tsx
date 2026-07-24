"use client";

import Image from "next/image";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";

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

  return (
    <header className="sticky top-4 z-50 px-6 pt-4">
      <div className="max-w-[1600px] mx-auto bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl">

        <div className="flex items-center justify-between h-20 px-8">

          {/* Left */}
          <div className="flex items-center gap-10">

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-700 flex items-center justify-center">
                <Sprout className="text-white" size={22} />
              </div>

              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  AgriAdvisor
                </h2>

                <p className="text-xs text-slate-500">
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
                    className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ease-out
                    ${
                      pathname === item.href
                        ? "bg-green-100 text-green-700 font-semibold"
                        : "text-slate-600 hover:bg-green-50 hover:text-green-700 hover:shadow-sm"
                    }
                    `}
                  >
                    <Icon
                      size={18}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="transition-all duration-300">
                      {item.name}
                    </span>
                  </Link>
                );

              })}

            </nav>

          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">

            {/* Language */}
            <div id="language-selector-placeholder">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50">
                <Globe size={18} />
                <span className="text-sm font-medium">English</span>
                <ChevronDown size={15} />
              </button>
            </div>

            {/* Notification */}
            <button className="relative w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-green-50 transition-all duration-300">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                3
              </span>
            </button>

            {/* Profile */}
            <Link href="/profile">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 transition-all duration-300 cursor-pointer">

                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={42}
                    height={42}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold">
                    {userName.charAt(0)}
                  </div>
                )}

                <div className="hidden xl:block">
                  <p className="font-semibold text-sm">{userName}</p>
                  <p className="text-xs text-slate-500">{userRole}</p>
                </div>

                <ChevronDown size={16} className="text-slate-500" />

              </div>
            </Link>

          </div>

        </div>
      </div>
    </header>
  );
}