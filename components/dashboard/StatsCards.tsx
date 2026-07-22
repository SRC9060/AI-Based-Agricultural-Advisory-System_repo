import Link from "next/link";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color: string;
  details?: string[];
  valueSuffix?: string;
  linkText?: string;
  linkHref?: string;
  linkColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  details,
  valueSuffix,
  linkText,
  linkHref,
  linkColor,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5 min-h-35 flex flex-col justify-between bg-gradient-to-br from-white to-green-50/60">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <div className="mt-3 flex items-baseline gap-1 flex-wrap">
            <h2 className="text-[1.7rem] font-semibold text-slate-900">{value}</h2>
            {valueSuffix ? (
              <span className="text-sm text-slate-500">{valueSuffix}</span>
            ) : null}
          </div>

          {details && details.length > 0 ? (
            <div className="mt-2 space-y-1">
              {details.map((detail, index) => (
                <p key={`${title}-${index}`} className="text-sm text-slate-500">
                  {detail}
                </p>
              ))}
            </div>
          ) : subtitle ? (
            <p className="text-sm text-slate-500 mt-3">{subtitle}</p>
          ) : null}
        </div>

        <div
          className={`${color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0`}
        >
          {icon}
        </div>
      </div>

      {linkText && linkHref ? (
        <Link
          href={linkHref}
          className={`mt-3 text-sm font-medium ${linkColor || "text-slate-600"} hover:underline`}
        >
          {linkText}
        </Link>
      ) : null}
    </div>
  );
}