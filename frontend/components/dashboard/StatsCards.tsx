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
    <div className="h-full rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-green-50 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 p-4 flex flex-col justify-between">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <div className="mt-3 flex items-baseline gap-1 flex-wrap">
            <h2 className="text-2xl font-semibold text-slate-900">{value}</h2>
            {valueSuffix ? (
              <span className="text-sm text-slate-500">{valueSuffix}</span>
            ) : null}
          </div>

          {details && details.length > 0 ? (
            <div className="mt-2 space-y-0.5">
              {details.map((detail, index) => (
                <p key={`${title}-${index}`} className="text-sm text-slate-500">
                  {detail}
                </p>
              ))}
            </div>
          ) : subtitle ? (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          ) : null}
        </div>

        <div
          className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0`}
        >
          {icon}
        </div>
      </div>

      {linkText && linkHref ? (
        <Link
          href={linkHref}
          className={`mt-2 text-sm font-medium ${linkColor || "text-slate-600"} hover:underline`}
        >
          {linkText}
        </Link>
      ) : null}
    </div>
  );
}