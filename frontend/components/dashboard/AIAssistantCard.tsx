"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  CloudSun,
  Sprout,
  Landmark,
  TrendingUp,
  Mic,
} from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import { getVoiceLanguageCode } from "@/lib/voiceLanguages";


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
    title: "Government Schemes",
    icon: Landmark,
  },
];

export default function AIAssistantCard() {
  const router = useRouter();
  const { t } = useTranslation();

  const [question, setQuestion] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  function goToChat(customQuestion?: string) {
    const query = customQuestion ?? question;

    if (!query.trim()) return;

    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }

  function startVoiceInput() {
    type RecognitionResultEvent = {
      results: {
        [index: number]: {
          [index: number]: { transcript: string };
        };
      };
    };
    type RecognitionErrorEvent = { error: string };
    type Recognition = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: (() => void) | null;
      onresult: ((event: RecognitionResultEvent) => void) | null;
      onerror: ((event: RecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const RecognitionConstructor =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      setVoiceStatus(
        "Voice input requires the latest Chrome or Edge browser.",
      );
      return;
    }

    const selectedLanguage =
      localStorage.getItem("language") || "en";
    const languageCode =
      getVoiceLanguageCode(selectedLanguage);
    const recognition = new RecognitionConstructor();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = languageCode;
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus(`Listening in ${languageCode}...`);
    };
    recognition.onresult = (event: RecognitionResultEvent) => {
      const transcript =
        event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuestion(transcript);
        setVoiceStatus(`Voice recognized in ${languageCode}.`);
      } else {
        setVoiceStatus("No speech detected. Please try again.");
      }
    };
    recognition.onerror = (event: RecognitionErrorEvent) => {
      setVoiceStatus(
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : `Voice recognition failed (${event.error}).`,
      );
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 flex flex-col">

      {/* Header */}

      <div className="flex items-center gap-4">

        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100/80 dark:border-transparent flex items-center justify-center">

          <Bot className="text-emerald-600 dark:text-green-400" size={30} />

        </div>

        <div>


          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-heading">
            {t("Ask AgriAdvisor")}
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400 font-body">
            {t("Ask any question about crops, diseases, schemes, weather and more...")}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-2xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">

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
            placeholder={t("Type your question...")}
            className="flex-1 bg-transparent text-base text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400 font-body"
          />

          <button
            type="button"
            onClick={startVoiceInput}
            disabled={isListening}
            aria-label={
              isListening
                ? "Listening to voice question"
                : "Ask using your voice"
            }
            title={
              isListening
                ? "Listening..."
                : "Speak your question"
            }
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
              isListening
                ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-green-400 hover:bg-emerald-50 dark:hover:bg-slate-700"
            }`}
          >
            <Mic size={19} />
          </button>

          <button
            type="button"
            onClick={() => goToChat()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-800 text-white transition hover:from-emerald-700 hover:to-green-700 shadow-sm"
            aria-label="Send question to AI Assistant"
          >
            <Send size={18} />
          </button>


        </div>

      </div>

      {voiceStatus && (
        <p
          className="mt-2 text-sm text-slate-500 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          {voiceStatus}
        </p>
      )}

  

      {/* Popular Topics */}

      <div className="mt-6">

        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
          {t("Popular Topics")}
        </p>

        <div className="grid grid-cols-2 gap-3">

          {suggestions.map((item) => {

            const Icon = item.icon;

            return (

              <button
                key={item.title}
                onClick={() => goToChat(item.title)}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 p-4 hover:border-emerald-500 dark:hover:border-green-600 hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition text-left"
              >

                <Icon
                  size={22}
                  className="text-emerald-600 dark:text-green-400 mb-2"
                />

                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t(item.title)}
                </p>

              </button>

            );

          })}

        </div>

      </div>

    </div>
  );
}
