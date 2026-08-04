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
    title: "Govt Schemes",
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
    <div className="h-full rounded-2xl border border-white/90 bg-white/90 backdrop-blur-sm shadow-sm p-6 flex flex-col">

      {/* Header */}

      <div className="flex items-center gap-4">

        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">

          <Bot className="text-green-700" size={30} />

        </div>

        <div>


          <h2 className="text-xl font-semibold text-slate-900">
            {t("AI Assistant")}
          </h2>

          <p className="mt-1.5 text-base leading-6 text-slate-500">
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
            className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
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
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-green-200 bg-white text-green-700 hover:bg-green-50"
            }`}
          >
            <Mic size={19} />
          </button>

          <button
            type="button"
            onClick={() => goToChat()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-white transition hover:bg-green-800"
            aria-label="Send question to AI Assistant"
          >
            <Send size={18} />
          </button>


        </div>

      </div>

      {voiceStatus && (
        <p
          className="mt-2 text-sm text-slate-500"
          role="status"
          aria-live="polite"
        >
          {voiceStatus}
        </p>
      )}

  

      {/* Popular Topics */}

      <div className="mt-6">

        <p className="text-base font-semibold text-slate-500 mb-3">
          {t("Popular Topics")}
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

                <p className="text-base font-medium text-slate-800">
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
