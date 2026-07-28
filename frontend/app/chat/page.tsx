"use client";

import { API_URL } from "@/lib/api";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  const [isOnline, setIsOnline] = useState(true);
  const searchParams = useSearchParams();
  const hasAutoAsked = useRef(false);
  const cacheReady = useRef(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    const syncConnection = () => setIsOnline(navigator.onLine);
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
      const userId = localStorage.getItem("user_id") || "guest";
      try {
        const response = await fetch(
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
        const selectedLanguage = localStorage.getItem("language") || "en";
        console.log("Sending Language:", selectedLanguage);
        const userId = localStorage.getItem("user_id");
        const response = await fetch(`${API_URL}/chat`, {
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
    [isOnline, question, sessionId],
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

  async function rateResponse(index: number, helpful: boolean) {
    const message = messages[index];
    const userId = localStorage.getItem("user_id");
    if (!message.id || !userId) return;
    try {
      const response = await fetch(`${API_URL}/chat/feedback`, {
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

async function recordAudio() {
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

  // Chrome and Edge can recognize microphone input directly. This keeps
  // voice input working when the remote STT quota or local ffmpeg is absent.
  if (SpeechRecognitionConstructor) {
    const recognition = new SpeechRecognitionConstructor();
    const selectedLanguage = localStorage.getItem("language") || "en";
    const languageMap: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      kn: "kn-IN",
      te: "te-IN",
      ta: "ta-IN",
      ml: "ml-IN",
      mr: "mr-IN",
      gu: "gu-IN",
    };

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = languageMap[selectedLanguage] || "en-IN";
    recognition.onstart = () => {
      setIsRecording(true);
      setStatus("🎙 Listening...");
    };
    recognition.onresult = (
      event: BrowserSpeechRecognitionResultEvent,
    ) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuestion(transcript);
        setStatus("✅ Voice recognized.");
      } else {
        setStatus("❌ No speech detected. Please try again.");
      }
    };
    recognition.onerror = (
      event: BrowserSpeechRecognitionErrorEvent,
    ) => {
      console.error("Browser speech recognition error:", event.error);
      setStatus(
        event.error === "not-allowed"
          ? "❌ Microphone permission denied."
          : "❌ Voice recognition failed. Please try again.",
      );
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognition.start();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const mediaRecorder = new MediaRecorder(stream);

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

      const selectedLanguage =
        localStorage.getItem("language") || "en";

      const extension =
        mediaRecorder.mimeType.includes("webm")
          ? "webm"
          : "wav";

      const audioFile = new File(
        [audioBlob],
        `recording.${extension}`,
        {
          type: mediaRecorder.mimeType,
        },
      );

      const formData = new FormData();

      formData.append("file", audioFile);
      formData.append("language", selectedLanguage);

      try {
        const response = await fetch(
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

        setQuestion(result.transcript);

        setStatus(
          result.engine === "whisper"
            ? "✅ Whisper recognized your voice."
            : "✅ Sarvam recognized your voice.",
        );
      } catch (error) {
        console.error(error);

        setStatus("❌ Voice recognition failed.");
      }

      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();

    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 5000);
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

  const selectedLanguage =
    localStorage.getItem("language") || "en";

  const languageMap: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    kn: "kn-IN",
    te: "te-IN",
    ta: "ta-IN",
    ml: "ml-IN",
    mr: "mr-IN",
    gu: "gu-IN",
  };

  function playBrowserTTS() {
    if (!("speechSynthesis" in window)) {
      setStatus("❌ Browser voice output is not supported.");
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang =
      languageMap[selectedLanguage] || "en-IN";

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const matchingVoice = voices.find((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(
          utterance.lang.toLowerCase().split("-")[0],
        ),
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
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

    const response = await fetch(
      `${API_URL}/speak`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          language: selectedLanguage,
        }),
      },
    );

    if (!response.ok) {
      console.warn(
        "Sarvam TTS failed. Using browser TTS.",
      );

      playBrowserTTS();
      return;
    }

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
      playBrowserTTS();
    };

    setStatus("🔊 Playing Sarvam voice...");
    await audio.play();
  } catch (error) {
    console.error(
      "Sarvam unavailable; browser fallback started:",
      error,
    );

    playBrowserTTS();
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
                {message.type === "ai" && index !== 0 && message.id && (
                  <div className="feedback-actions">
                    <span>Was this helpful?</span>
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
            disabled={!isOnline || loading || isRecording || isSpeaking}
            aria-label={isRecording ? "Recording voice question" : "Ask using your voice"}
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
            disabled={!isOnline || loading || !question.trim() || sessionId === null}
          >
            {loading ? "..." : "➤"}
          </button>
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
