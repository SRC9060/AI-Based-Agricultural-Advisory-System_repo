"use client";

import { Star } from "lucide-react";

export default function FarmBanner() {
  return (
    <div className="h-full rounded-3xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-between">

      {/* Heading */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          ⭐ Feedback
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Help us improve the AI Agricultural Advisor.
        </p>
      </div>

      {/* Rating Buttons */}
      <div className="mt-6 space-y-3">

        <button className="w-full rounded-xl border border-green-200 bg-green-50 py-3 font-medium hover:bg-green-100 transition">
          😊 Excellent
        </button>

        <button className="w-full rounded-xl border border-blue-200 bg-blue-50 py-3 font-medium hover:bg-blue-100 transition">
          🙂 Good
        </button>

        <button className="w-full rounded-xl border border-yellow-200 bg-yellow-50 py-3 font-medium hover:bg-yellow-100 transition">
          😐 Average
        </button>

        <button className="w-full rounded-xl border border-red-200 bg-red-50 py-3 font-medium hover:bg-red-100 transition">
          😞 Poor
        </button>

      </div>

      {/* Footer */}
      <div className="mt-6 rounded-xl bg-green-600 text-white text-center py-3 font-semibold cursor-pointer hover:bg-green-700 transition">
        Submit Feedback
      </div>

    </div>
  );
}