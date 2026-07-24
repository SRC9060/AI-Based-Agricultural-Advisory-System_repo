"use client";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import { MessageSquare } from "lucide-react";

export default function FeedbackPage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="text-green-600" size={28} />
          <h1 className="text-2xl font-bold">Feedback</h1>
        </div>

        <p className="text-slate-500 mb-6">
          We'd love to hear your feedback about AgriAdvisor.
        </p>

        <textarea
          className="w-full h-40 rounded-xl border border-slate-300 p-4 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Write your feedback here..."
        />

        <button
          className="mt-6 rounded-xl bg-green-600 px-6 py-3 text-white transition hover:bg-green-700"
          onClick={() => {
            alert("Thank you for your feedback!");
          }}
        >
          Submit Feedback
        </button>

      </div>
    </DashboardLayout>
  );
}