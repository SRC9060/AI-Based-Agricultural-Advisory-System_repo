import React from "react";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className = "", ...props }: PanelProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: "var(--card-secondary-bg)",
        borderColor: "var(--card-border)",
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
