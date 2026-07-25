"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import {
  Bot,
  Send,
  CloudSun,
  Sprout,
  Landmark,
  TrendingUp,
  Mic,
  Languages,
} from "lucide-react";
=======
import { Bot, Send } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
>>>>>>> b68585a950e226537e822ba9d3c454ec4cdf70df

const suggestions = [
  {
    title: "Crop Disease",
    icon: Sprout,
  },
  {
    title: "Weather",
    icon: CloudSun,
  },
  {
    title: "Market Price",
    icon: TrendingUp,
  },
  {
    title: "Govt Schemes",
    icon: Landmark,
  },
];

export default function AIAssistantCard() {
  const router = useRouter();
  const { t } = useTranslation();

  const [question, setQuestion] = useState("");

  function goToChat(customQuestion?: string) {
    const query = customQuestion ?? question;

    if (!query.trim()) return;

    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col">

      {/* Header */}

      <div className="flex items-center gap-4">

        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">

          <Bot className="text-green-700" size={30} />

        </div>

        <div>
<<<<<<< HEAD

          <h2 className="text-2xl font-bold text-slate-900">
            AI Assistant
          </h2>

          <p className="text-slate-500">
            Your smart farming companion
          </p>
=======
          <h2 className="text-[1.1rem] font-semibold text-slate-900">
            {t("AI Assistant")}
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {t("Ask any question about crops, diseases, schemes, weather and more...")}
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
            placeholder={t("Type your question here...")}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />

          <button
            onClick={() => goToChat()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-white transition hover:bg-green-800"
          >
            <Send size={18} />
          </button>
>>>>>>> b68585a950e226537e822ba9d3c454ec4cdf70df

        </div>

      </div>

<<<<<<< HEAD
      {/* Search */}
=======
      <p className="mt-5 text-sm font-medium text-slate-500">
        {t("Try asking:")}
      </p>
>>>>>>> b68585a950e226537e822ba9d3c454ec4cdf70df

      <div className="mt-6 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goToChat();
          }}
          placeholder="Ask your farming question..."
          className="flex-1 bg-transparent outline-none text-base placeholder:text-slate-400"
        />

        <button
          onClick={() => goToChat()}
          className="ml-3 h-11 w-11 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition"
        >
          <Send size={18} />
        </button>

      </div>

      {/* Popular Topics */}

      <div className="mt-6">

        <p className="text-sm font-semibold text-slate-500 mb-3">
          Popular Topics
        </p>

        <div className="grid grid-cols-2 gap-3">

          {suggestions.map((item) => {

            const Icon = item.icon;

            return (

              <button
                key={item.title}
                onClick={() => goToChat(item.title)}
                className="rounded-2xl border border-slate-200 p-4 hover:border-green-300 hover:bg-green-50 transition text-left"
              >

                <Icon
                  size={22}
                  className="text-green-600 mb-2"
                />

                <p className="font-medium text-slate-800">
                  {item.title}
                </p>

              </button>

            );

          })}

        </div>

      </div>

      {/* Footer */}

      <div className="mt-auto pt-5 border-t border-slate-200">

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">

          <div className="flex items-center gap-2">

            <Mic
              size={16}
              className="text-green-600"
            />

            <span>Voice Enabled</span>

          </div>

          <div className="flex items-center gap-2">

            <Languages
              size={16}
              className="text-green-600"
            />

            <span>20+ Languages</span>

          </div>

        </div>

      </div>

    </div>
  );
}
