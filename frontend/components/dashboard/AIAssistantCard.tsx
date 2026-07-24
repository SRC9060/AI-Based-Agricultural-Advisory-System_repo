"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";

const suggestions = [
  "How to control leaf curl?",
  "Best fertilizer for tomato",
  "PMFBY scheme details",
  "Current weather",
];

export default function AIAssistantCard() {
  const router = useRouter();

  const [question, setQuestion] = useState("");

  function goToChat(customQuestion?: string) {
    const query = customQuestion ?? question;

    if (!query.trim()) return;

    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 shadow-sm">
          <Bot className="text-green-700" size={22} />
        </div>

        <div>
          <h2 className="text-[1.1rem] font-semibold text-slate-900">
            AI Assistant
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Ask any question about crops, diseases, schemes, weather and more...
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">

        <div className="flex items-center gap-2 px-3 py-3">

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                goToChat();
              }
            }}
            placeholder="Type your question here..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />

          <button
            onClick={() => goToChat()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-white transition hover:bg-green-800"
          >
            <Send size={18} />
          </button>

        </div>

      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        Try asking:
      </p>

      <div className="mt-3 flex flex-wrap gap-2">

        {suggestions.map((text) => (

          <button
            key={text}
            onClick={() => goToChat(text)}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 hover:shadow-sm"
          >
            {text}
          </button>

        ))}

      </div>

    </div>
  );
}