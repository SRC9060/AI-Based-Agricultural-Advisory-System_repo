"use client";

import { API_URL, apiFetch } from "@/lib/api";
import {
  detectVoiceLanguage,
  getVoiceLanguageCode,
} from "@/lib/voiceLanguages";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mic, ArrowLeft } from "lucide-react";
import "@/app/globals.css";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import "./chat.css";

interface Message {
  type: "user" | "ai";
  text: string;
  id?: number;
  feedback?: boolean;
  confidenceScore?: number;
  confidenceLevel?: string;
  needsHumanReview?: boolean;
}

function ChatContent() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      text: "Hello! 👋 I am your AI Agricultural Advisor. Ask me anything about crops, farming, weather, diseases, market information or government schemes.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  // Start conservatively until the browser connection state has been checked.
  // This prevents a cached offline page from briefly trying to create a new
  // server session and showing "Creating Chat Session...".
  const [isOnline, setIsOnline] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const searchParams = useSearchParams();
  const hasAutoAsked = useRef(false);
  const cacheReady = useRef(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    const syncConnection = () => {
      setIsOnline(navigator.onLine);
      setConnectionChecked(true);
    };
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("agriadvisor_last_conversation");
      if (cached) {
        const parsed = JSON.parse(cached) as Message[];
        if (Array.isArray(parsed) && parsed.length > 1) setMessages(parsed);
      }
    } catch {
      localStorage.removeItem("agriadvisor_last_conversation");
    } finally {
      cacheReady.current = true;
    }
  }, []);

  useEffect(() => {
    if (cacheReady.current) {
      localStorage.setItem(
        "agriadvisor_last_conversation",
        JSON.stringify(messages.slice(-30)),
      );
    }
  }, [messages]);

useEffect(() => {
  const timer = window.setTimeout(() => {
    setMessages((previous) =>
      previous.length === 1 && previous[0].type === "ai"
        ? [{ type: "ai", text: t("Chat greeting") }]
        : previous
    );
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [t]);

  useEffect(() => {
    async function createSession() {
      if (!connectionChecked) return;
      if (!isOnline) {
        setStatus("Offline — reconnect to ask new questions.");
        return;
      }

      const userId = localStorage.getItem("user_id") || "guest";
      try {
        const response = await apiFetch(
          `${API_URL}/chat/session?user_id=` + userId,
          {
            method: "POST",
          },
        );
        if (!response.ok) {
          throw new Error("Failed to Create Chat Session");
        }
        const data = await response.json();
        setSessionId(data.session_id);
        setStatus("");
      } catch (err) {
        console.error(err);
        setStatus("Unable to connect to the agricultural AI server.");
      }
    }
    createSession();
  }, [connectionChecked, isOnline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Ask AI Query
  const askAI = useCallback(
    async (customQuestion?: string) => {
      if (!isOnline) {
        setStatus("Offline — reconnect to ask new questions.");
        return;
      }
      if (!sessionId) {
        setStatus("Creating Chat Session...");
        return;
      }
      const currentQuestion = customQuestion ?? question;
      if (!currentQuestion.trim()) {
        return;
      }
      setMessages((previous) => [
        ...previous,
        {
          type: "user",
          text: currentQuestion,
        },
      ]);
      if (!customQuestion) {
        setQuestion("");
      }
      window.history.replaceState({}, "", "/chat");
      try {
        setLoading(true);
        setStatus("🧠 AI is analysing your question...");
        console.log("Sending Language:", language);
        const userId = localStorage.getItem("user_id");
        const response = await apiFetch(`${API_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: String(sessionId),
            user_id: String(userId),
            message: currentQuestion,
            language,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          console.error("Backend Error:", error);
          throw new Error("Backend error");
        }
        const data = await response.json();

        window.dispatchEvent(new Event("activityUpdated"));

        const answer =
          data.response_in_user_language ||
          data.english_response ||
          "Sorry, I could not generate a recommendation.";

        setMessages((previous) => [
        ...previous,
        {
          type: "ai",
          text: answer,
          id: data.assistant_message_id,
          confidenceScore: data.confidence_score,
          confidenceLevel: data.response_quality?.confidence_level,
          needsHumanReview: data.response_quality?.needs_human_review,
        },
        ]);

        setStatus("");
        if (localStorage.getItem("voice_output") !== "off") {
          void speakAnswer(answer);
        }
      } catch (error) {
        console.error(error);
        setStatus("❌ Unable to connect to AI server.");
        setMessages((previous) => [
          ...previous,
          {
            type: "ai",
            text: "Unable to connect to the agricultural AI server. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    // speakAnswer reads the same language value already listed here and is a
    // function declaration, so adding its per-render identity would recreate
    // this callback on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOnline, language, question, sessionId],
  );

  useEffect(() => {
    const query = searchParams.get("q");
    if (!query) return;
    // A dashboard question can arrive before the new chat session is created.
    // Wait until it exists so the question is sent and saved reliably.
    if (!sessionId) return;
    if (hasAutoAsked.current) return;
    hasAutoAsked.current = true;
    setQuestion(query);
    askAI(query);
    window.history.replaceState({}, "", "/chat");
  }, [searchParams, askAI, sessionId]);

  // Enter Key
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (!isOnline) {
      setStatus("Offline — reconnect to ask new questions.");
      return;
    }
    if (!sessionId) {
      setStatus("Creating Chat Session...");
      return;
    }
    if (!loading) {
      askAI();
    }
  }

  async function rateResponse(index: number, helpful: boolean) {
    const message = messages[index];
    const userId = localStorage.getItem("user_id");
    if (!message.id || !userId) return;
    try {
      const response = await apiFetch(`${API_URL}/chat/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(userId),
          message_id: message.id,
          helpful,
        }),
      });
      if (!response.ok) throw new Error("Unable to save response feedback");
      setMessages((previous) =>
        previous.map((item, itemIndex) =>
          itemIndex === index ? { ...item, feedback: helpful } : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setStatus("Unable to save feedback while offline.");
    }
  }

  // Voice Input
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);

async function recordAudio(forceBackendRecorder = false) {
  type BrowserSpeechRecognitionResultEvent = {
    results: { [index: number]: { [index: number]: { transcript: string } } };
  };
  type BrowserSpeechRecognitionErrorEvent = {
    error: string;
  };
  type BrowserSpeechRecognition = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
    onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };

  const speechRecognitionWindow = window as typeof window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  const SpeechRecognitionConstructor =
    speechRecognitionWindow.SpeechRecognition ||
    speechRecognitionWindow.webkitSpeechRecognition;

  // Chrome and Edge support the same eight BCP-47 language codes used by the
  // backend. Prefer this path because it does not depend on Sarvam credits or
  // a local FFmpeg installation. Sarvam/Whisper remains the browser fallback.
  if (SpeechRecognitionConstructor && !forceBackendRecorder) {
    const recognition = new SpeechRecognitionConstructor();
    const recognitionLanguage =
      getVoiceLanguageCode(language);

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = recognitionLanguage;
    recognition.onstart = () => {
      setIsRecording(true);
      setStatus(`🎙 Listening in ${recognitionLanguage}...`);
    };
    recognition.onresult = (
      event: BrowserSpeechRecognitionResultEvent,
    ) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuestion(transcript);
        setStatus(
          `✅ Voice recognized in ${recognitionLanguage}. Sending your question...`,
        );
        void askAI(transcript);
      } else {
        setStatus(
          "Chrome did not detect speech. Switching to multilingual recording—please speak again.",
        );
        window.setTimeout(() => {
          void recordAudio(true);
        }, 250);
      }
    };
    recognition.onerror = (
      event: BrowserSpeechRecognitionErrorEvent,
    ) => {
      console.error("Browser speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setStatus(
          "Microphone permission denied. Allow microphone access in Chrome.",
        );
        return;
      }
      setStatus(
        "Chrome voice recognition was unavailable. Switching to multilingual recording—please speak again.",
      );
      window.setTimeout(() => {
        void recordAudio(true);
      }, 250);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    try {
      recognition.start();
    } catch (error) {
      console.error("Unable to start browser speech recognition:", error);
      setStatus(
        "Switching to multilingual recording—please speak after the microphone activates.",
      );
      window.setTimeout(() => {
        void recordAudio(true);
      }, 250);
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const preferredMimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    );
    const mediaRecorder = new MediaRecorder(
      stream,
      preferredMimeType
        ? { mimeType: preferredMimeType }
        : undefined,
    );

    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstart = () => {
      setIsRecording(true);
      setStatus("🎙 Listening...");
    };

    mediaRecorder.onstop = async () => {
      setIsRecording(false);

      setStatus("🎤 Converting speech...");

      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorder.mimeType || "audio/webm",
      });
      if (audioBlob.size < 800) {
        stream.getTracks().forEach((track) => track.stop());
        setStatus(
          "No usable audio was captured. Check the selected microphone and try again.",
        );
        return;
      }

      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const extension = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "wav";

      const audioFile = new File(
        [audioBlob],
        `recording.${extension}`,
        {
          type: mimeType,
        },
      );

      const formData = new FormData();

      formData.append("file", audioFile);
      formData.append("language", language);

      try {
        const response = await apiFetch(
          `${API_URL}/speech-to-text`,
          {
            method: "POST",
            body: formData,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.detail || "Speech recognition failed",
          );
        }

        const transcript = String(result.transcript || "").trim();
        if (!transcript) {
          throw new Error("No speech detected. Please try again.");
        }

        setQuestion(transcript);

        setStatus(
          result.engine === "whisper"
            ? "✅ Whisper recognized your voice. Sending your question..."
            : "✅ Sarvam recognized your voice. Sending your question...",
        );
        await askAI(transcript);
      } catch (error) {
        console.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Voice recognition failed.";
        setStatus(`❌ ${message}`);
      }

      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();

    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 7000);
  } catch (error) {
    console.error(error);

    setStatus("❌ Microphone permission denied.");
  }
}

  // Speak AI Response
async function speakAnswer(text: string) {
  if (!text.trim()) {
    return;
  }

  const cleanText = text
    .replace(/\*\*/g, "")
    .replace(/#/g, "")
    .replace(/\n/g, " ");

  const voiceLanguage = detectVoiceLanguage(
    cleanText,
    language,
  );

  async function playBrowserTTS() {
    if (!("speechSynthesis" in window)) {
      setStatus("❌ Browser voice output is not supported.");
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = getVoiceLanguageCode(voiceLanguage);

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const timeout = window.setTimeout(
          () => resolve(window.speechSynthesis.getVoices()),
          1000,
        );
        window.speechSynthesis.addEventListener(
          "voiceschanged",
          () => {
            window.clearTimeout(timeout);
            resolve(window.speechSynthesis.getVoices());
          },
          { once: true },
        );
      });
    }

    const matchingVoice = voices.find((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(
          utterance.lang.toLowerCase().split("-")[0],
        ),
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    } else if (voiceLanguage !== "en") {
      setIsSpeaking(false);
      setStatus(
        "❌ Online voice is unavailable and this device has no matching language voice.",
      );
      return;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus("🔊 Playing browser voice...");
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus("");
    };

    utterance.onerror = (event) => {
      console.error("Browser TTS error:", event);
      setIsSpeaking(false);
      setStatus("❌ Browser voice output failed.");
    };

    window.speechSynthesis.speak(utterance);
  }

  try {
    setIsSpeaking(true);
    setStatus("🔊 Generating voice response...");

    const response = await apiFetch(
      `${API_URL}/speak`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          language: voiceLanguage,
        }),
      },
    );

    if (!response.ok) {
      console.warn(
        "Sarvam TTS failed. Using browser TTS.",
      );

      void playBrowserTTS();
      return;
    }

    const voiceEngine =
      response.headers.get("X-Voice-Engine") ||
      "voice service";
    const voiceCode =
      response.headers.get("X-Voice-Language") ||
      getVoiceLanguageCode(voiceLanguage);
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      setIsSpeaking(false);
      setStatus("");
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      void playBrowserTTS();
    };

    setStatus(
      `🔊 Playing ${voiceCode} using ${voiceEngine}...`,
    );
    await audio.play();
  } catch (error) {
    console.error(
      "Sarvam unavailable; browser fallback started:",
      error,
    );

    void playBrowserTTS();
  }
}

  return (
    <DashboardLayout>
      <section className="chat-area">
        <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border border-emerald-200 rounded-2xl mb-4 shadow-md">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all duration-300 font-bold text-sm sm:text-base shadow-md group cursor-pointer"
          >
            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            <span>{t("Back")}</span>
          </button>
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
            <span className="text-xl">🤖</span>
            <span>{t("AI Assistant")}</span>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.type === "user"
                  ? "message-row user-row"
                  : "message-row ai-row"
              }
            >
              {message.type === "ai" && (
                <div className="message-avatar ai-avatar">🤖</div>
              )}
              <div
                className={
                  message.type === "user"
                    ? "message user-message"
                    : "message ai-message"
                }
              >
                <p>{message.text}</p>
                {message.type === "ai" && index !== 0 && (
                  <button
                    className="speak-message-btn"
                    disabled={isSpeaking || loading || isRecording}
                    onClick={() => speakAnswer(message.text)}
                  >
                    🔊 {t("Listen")}
                  </button>
                )}
                {message.type === "ai" && index !== 0 && message.id && (
                  <div className="feedback-actions">
                    <span>{t("Was this helpful?")}</span>
                    <button
                      className={`feedback-btn ${message.feedback === true ? "selected" : ""}`}
                      aria-label="Mark this response as helpful"
                      onClick={() => rateResponse(index, true)}
                    >
                      👍
                    </button>
                    <button
                      className={`feedback-btn ${message.feedback === false ? "selected" : ""}`}
                      aria-label="Mark this response as not helpful"
                      onClick={() => rateResponse(index, false)}
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
              {message.type === "user" && (
                <div className="message-avatar user-avatar">👤</div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message-row ai-row">
              <div className="message-avatar ai-avatar">🤖</div>
              <div className="message ai-message thinking">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* STATUS */}
        {status && <div className="chat-status">{t(status)}</div>}

        {/* INPUT AREA */}

        <p className="ai-disclaimer">
          🌱 {t("AI recommendations should be verified before making important farming decisions.")}
        </p>

        <div className="voice-first-controls">
          <button
            type="button"
            className={isRecording ? "voice-btn recording" : "voice-btn"}
            onClick={() => {
              void recordAudio();
            }}
            disabled={
              !isOnline ||
              loading ||
              isRecording ||
              isSpeaking ||
              sessionId === null
            }
            aria-label={
              isRecording
                ? "Recording voice question"
                : "Tap to ask your farming question by voice"
            }
            title={isRecording ? "Listening..." : "Tap and speak"}
          >
            <Mic size={34} strokeWidth={2.1} />
            <span>{isRecording ? "Listening…" : "Ask by voice"}</span>
          </button>

          <div className="text-fallback-label">
            <span>or type your question</span>
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "te"
                  ? "మీ వ్యవసాయ ప్రశ్నను అడగండి..."
                  : language === "hi"
                    ? "अपना कृषि प्रश्न पूछें..."
                    : "Ask your farming question..."
              }
            />
            <button
              type="button"
              className="send-btn"
              onClick={() => askAI()}
              disabled={
                !isOnline ||
                loading ||
                !question.trim() ||
                sessionId === null
              }
              aria-label="Send question"
            >
              {loading ? "..." : "➤"}
            </button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="chat-loading">Loading AgriAdvisor�</main>}>
      <ChatContent />
    </Suspense>
  );
}
