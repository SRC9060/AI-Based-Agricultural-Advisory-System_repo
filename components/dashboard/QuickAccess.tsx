import Link from "next/link";
import {
  Mic,
  CloudSun,
  Landmark,
  TrendingUp,
  Stethoscope,
  MessageSquare,
} from "lucide-react";

export default function QuickAccess() {
  const items = [
    {
      name: "Voice Assistant",
      icon: <Mic size={18} className="text-green-600" />,
      iconBg: "bg-green-100",
      link: "/voice",
    },
    {
      name: "Crop Doctor",
      icon: <Stethoscope size={18} className="text-blue-600" />,
      iconBg: "bg-blue-100",
      link: "/chat",
    },
    {
      name: "Market Prices",
      icon: <TrendingUp size={18} className="text-orange-500" />,
      iconBg: "bg-orange-100",
      link: "/market-prices",
    },
    {
      name: "Weather Update",
      icon: <CloudSun size={18} className="text-sky-500" />,
      iconBg: "bg-sky-100",
      link: "/weather",
    },
    {
      name: "Schemes",
      icon: <Landmark size={18} className="text-purple-600" />,
      iconBg: "bg-purple-100",
      link: "/schemes",
    },
    {
      name: "Feedback",
      icon: <MessageSquare size={18} className="text-emerald-600" />,
      iconBg: "bg-emerald-100",
      link: "/feedback",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
      <h2 className="text-[1.05rem] font-semibold mb-4 text-slate-900">
        ⚡ Quick Access
      </h2>

      <div className="grid grid-cols-2 gap-3">

        {items.map((item) => (
          <Link
            key={item.name}
            href={item.link}
            className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col items-center justify-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className={`${item.iconBg} w-10 h-10 rounded-xl flex items-center justify-center`}>
              {item.icon}
            </div>

            <p className="mt-2 text-center font-medium text-sm text-slate-900">
              {item.name}
            </p>
          </Link>
        ))}

      </div>

    </div>
  );
}