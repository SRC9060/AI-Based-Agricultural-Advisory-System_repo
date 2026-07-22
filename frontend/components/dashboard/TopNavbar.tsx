"use client";

import Image from "next/image";
import { Bell, ChevronDown, Globe, Menu } from "lucide-react";

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
  return (
    <header className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-slate-50 transition duration-300 text-slate-600"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="text-[1.35rem] font-semibold text-slate-900 truncate">
            Welcome back, {userName} 🌱
          </h1>

          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Here&apos;s what&apos;s happening with your farm today.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
        <button className="flex h-11 items-center gap-2 bg-slate-50 border border-slate-200 px-4 rounded-2xl hover:bg-white transition duration-300 text-sm text-slate-700 shadow-sm">
          <Globe size={17} />
          English
          <ChevronDown size={14} />
        </button>

        <button className="relative bg-slate-50 p-3 rounded-2xl hover:bg-white transition duration-300 shadow-sm">
          <Bell size={18} />

          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
            3
          </span>
        </button>

        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200 cursor-pointer hover:bg-white transition duration-300 shadow-sm">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-lg">
              {userName.charAt(0)}
            </div>
          )}

          <div>
            <p className="font-semibold text-gray-800">{userName}</p>
            <p className="text-xs text-gray-500">{userRole}</p>
          </div>

          <ChevronDown size={16} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}