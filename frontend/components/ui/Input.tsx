import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 ${className}`}
        style={{
          backgroundColor: "var(--input-bg)",
          borderColor: "var(--input-border)",
          color: "var(--text-primary)",
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
