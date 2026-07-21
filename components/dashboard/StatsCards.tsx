import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  color: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>

          <h2 className="text-3xl font-bold mt-2 text-gray-800">
            {value}
          </h2>

          <p className="text-gray-400 text-sm mt-2">
            {subtitle}
          </p>
        </div>

        <div
          className={`${color} w-14 h-14 rounded-xl flex items-center justify-center text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}