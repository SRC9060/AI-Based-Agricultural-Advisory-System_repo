"use client";

import { Bell, Globe, Search } from "lucide-react";

export default function TopNavbar() {
  return (
    <header className="bg-white rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between mb-6">
      {/* Left Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Dashboard
        </h1>

        <p className="text-gray-500 mt-1">
          Welcome back! Here's your farming overview 🌱
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">

        {/* Search */}
        <div className="flex items-center bg-gray-100 rounded-xl px-4 py-2 w-72">
          <Search size={18} className="text-gray-400" />

          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none ml-2 w-full text-sm"
          />
        </div>

        {/* Language */}
        <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition">
          <Globe size={18} />

          English
        </button>

        {/* Notification */}
        <button className="relative bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition">
          <Bell size={20} />

          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
            3
          </span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-2">
          <div className="w-11 h-11 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-lg">
            A
          </div>

          <div>
            <p className="font-semibold text-gray-800">
              Farmer
            </p>

            <p className="text-xs text-gray-500">
              Premium User
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}