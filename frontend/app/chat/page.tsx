"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import "@/app/globals.css";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import "./chat.css";

interface SpeechRecognitionWindow {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}

interface SpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface Message {
  type: "user" | "ai";
  text: string;
}

export default function ChatPage() {
  const { language, t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [storedLanguage] = useState(() => {
    if (typeof window === "undefined")
      return "en";
    return localStorage.getItem("language") || "en";
  });
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
  const searchParams = useSearchParams();
  const hasAutoAsked = useRef(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  useEffect(() => {
    setMessages((previous) =>
      previous.length === 1 && previous[0].type === "ai"
        ? [{ type: "ai", text: t("Chat greeting") }]
        : previous
    );
  }, [language, t]);

  useEffect(() => {
    async function createSession() {
      const userId = localStorage.getItem("user_id") || "guest";
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/chat/session?user_id=" + userId,
          {
            method: "POST",
          },
        );
        if (!response.ok) {
          throw new Error("Failed to Create Chat Session");
        }
        const data = await response.json();
        setSessionId(data.session_id);
      } catch (err) {
        console.error(err);
      }
    }
    createSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Ask AI Query
  const askAI = useCallback(
    async (customQuestion?: string) => {
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
        const selectedLanguage = localStorage.getItem("language") || "en";
        console.log("Sending Language:", selectedLanguage);
        const userId = localStorage.getItem("user_id");
        const response = await fetch("http://127.0.0.1:8000/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: String(sessionId),
            user_id: String(userId),
            message: currentQuestion,
            language: selectedLanguage,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          console.error("Backend Error:", error);
          throw new Error("Backend error");
        }
        const data = await response.json();

        window.dispatchEvent(new Event("activityUpdated"));

        setMessages((previous) => [
        ...previous,
        {
          type: "ai",
          text:
            data.response_in_user_language ||
            data.english_response ||
            "Sorry, I could not generate a recommendation.",

          confidenceScore: data.confidence_score,
          confidenceLevel: data.response_quality?.confidence_level,
          needsHumanReview: data.response_quality?.needs_human_review,
        },
      ]);

setStatus("");
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
    [question, sessionId],
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
    if (!sessionId) {
      setStatus("Creating Chat Session...");
      return;
    }
    if (event.key === "Enter" && !loading) {
      askAI();
    }
  }

  // Voice Input
  function recordAudio() {
    const speechRecognitionWindow =
      window as unknown as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechRecognitionWindow.SpeechRecognition ||
      speechRecognitionWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("❌ Please use Google Chrome for Voice Input.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang =
      language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsRecording(true);
    setStatus("🎙 Listening...");
    recognition.start();
    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      setStatus("");
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log(event.error);
      setIsRecording(false);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setStatus("⚠ Unable to Recognize Speech. Please Try Again.");
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      setStatus("");
    };
  }

  // Speak AI Response
  async function speakAnswer(text: string) {
    if (!text) {
      return;
    }
    try {
      setIsSpeaking(true);
      setStatus("🔊 Generating Voice Response...");
      const cleanText = text
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/\n/g, " ");
      const selectedLanguage = localStorage.getItem("language") || "en";
      console.log("TTS Language:", selectedLanguage);
      const response = await fetch("http://127.0.0.1:8000/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          language: selectedLanguage,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to Generate Speech");
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        setStatus("");
      };
      audio.onerror = (e) => {
        console.error("Audio Error:", e);
        URL.revokeObjectURL(audioUrl);
        setStatus("❌ Audio playback failed.");
        setIsSpeaking(false);
      };
      try {
        setStatus("🔊 Playing AI response...");
        await audio.play();
      } catch (err) {
        console.error("Play Error:", err);
        URL.revokeObjectURL(audioUrl);
        setStatus("❌ Browser blocked audio playback.");
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Unable to generate voice response.");
      setIsSpeaking(false);
    }
  }

  return (
    <DashboardLayout>
      <section className="chat-area">
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
                    🔊 Listen
                  </button>
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
        {status && <div className="chat-status">{status}</div>}

        {/* INPUT AREA */}

        <p className="ai-disclaimer">
          🌱 AI recommendations should be verified before making important
          farming decisions.
        </p>

        <div className="chat-input-container">
          <button
            className={isRecording ? "voice-btn recording" : "voice-btn"}
            onClick={recordAudio}
            disabled={loading || isRecording || isSpeaking}
          >
            {isRecording ? "🎙" : "🎤"}
          </button>
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
            className="send-btn"
            onClick={() => askAI()}
            disabled={loading || !question.trim() || sessionId === null}
          >
            {loading ? "..." : "➤"}
          </button>
        </div>
      </section>
    </DashboardLayout>
  );
}
