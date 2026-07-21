"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Dashboard", icon: "🏠", href: "/dashboard" },
  { name: "Ask AI", icon: "🤖", href: "/chat" },
  { name: "Voice Assistant", icon: "🎤", href: "/chat" },
  { name: "Weather", icon: "🌦️", href: "#" },
  { name: "Market Prices", icon: "📈", href: "#" },
  { name: "Government Schemes", icon: "🏛️", href: "#" },
  { name: "Soil Health", icon: "🌱", href: "#" },
  { name: "My Queries", icon: "📋", href: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 min-h-screen bg-green-900 text-white flex flex-col justify-between shadow-lg"
    >
      <div>
        <div className="p-6 border-b border-green-700">
          <h1 className="text-2xl font-bold">
            🌾 AgriAdvisor
          </h1>

          <p className="text-sm text-green-200 mt-1">
            AI Farming Assistant
          </p>
        </div>

        <nav className="mt-6 px-3">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-200 ${
                pathname === item.href
                  ? "bg-green-700"
                  : "hover:bg-green-800"
              }`}
            >
              <span className="text-xl">{item.icon}</span>

              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-5 border-t border-green-700">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold"
          >
            A
          </div>

          <div>
            <p className="font-semibold">Farmer</p>

            <p className="text-xs text-green-200">
              Welcome Back
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="block w-full text-center bg-green-700 hover:bg-green-600 rounded-lg py-2 transition"
        >
          Logout
        </Link>
      </div>
    </aside>
  );
}