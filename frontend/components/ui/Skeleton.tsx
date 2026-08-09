"use client";

import React from "react";

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-7 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
      <div className="h-3 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 animate-pulse">
      <div className="h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="h-4 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
