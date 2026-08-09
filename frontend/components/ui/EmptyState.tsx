"use client";

import React, { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode | string;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center font-body flex flex-col items-center justify-center ${
        compact ? "p-4 sm:p-6 space-y-2" : "p-8 sm:p-10 space-y-3"
      }`}
    >
      {icon && (
        <div className="text-3xl sm:text-4xl leading-none text-slate-400 select-none">
          {icon}
        </div>
      )}
      <div className="max-w-md space-y-1">
        <h3 className="text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-slate-200">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2 font-heading">{action}</div>}
    </div>
  );
}
