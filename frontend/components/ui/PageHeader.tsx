"use client";

import React, { ReactNode } from "react";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs font-body transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-green-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 font-heading">{action}</div>}
      </div>
    </header>
  );
}
