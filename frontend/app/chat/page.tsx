"use client";

import { useEffect, useRef, useState } from "react";
import "@/app/globals.css";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNavbar from "@/components/dashboard/TopNavbar";
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

  const [question, setQuestion] = useState("");
  const [language] = useState("en");

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ==========================================
  // ASK AI
  // ==========================================

  async function askAI() {
    if (!question.trim()) {
      return;
    }
    const currentQuestion = question;
    setMessages((previous) => [
      ...previous,
      {
        type: "user",
        text: currentQuestion,
      },
    ]);
    setQuestion("");
    try {
      setLoading(true);
      setStatus("🧠 AI is analysing your question...");
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "guest",
          message: currentQuestion,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error("Backend Error:", error);
        throw new Error("Backend error");
      }
      const data = await response.json();
      setMessages((previous) => [
        ...previous,
        {
          type: "ai",
          text:
            data.response_in_user_language ||
            data.english_response ||
            "Sorry, I could not generate a recommendation.",
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
          text:
            "Unable to connect to the agricultural AI server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // ENTER KEY
  // ==========================================

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {

    if (event.key === "Enter" && !loading) {

      askAI();

    }

  }


  // ==========================================
  // VOICE INPUT
  // ==========================================

  function recordAudio() {

    const speechRecognitionWindow =
      window as unknown as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechRecognitionWindow.SpeechRecognition ||
      speechRecognitionWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      setStatus(
        "❌ Please use Google Chrome for voice input."
      );

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      language === "te"
        ? "te-IN"
        : language === "hi"
        ? "hi-IN"
        : "en-IN";

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    setIsRecording(true);

    setStatus("🎙 Listening...");

    recognition.start();

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {

      const transcript =
        event.results[0][0].transcript;

      setQuestion(transcript);

      setStatus("");

    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {

      console.log(event.error);

      setIsRecording(false);

      if (
        event.error !== "no-speech" &&
        event.error !== "aborted"
      ) {

        setStatus(
          "⚠ Unable to recognize speech. Please try again."
        );

      }

    };

    recognition.onend = () => {

      setIsRecording(false);

      setStatus("");

    };

  }


  // ==========================================
  // SPEAK AI RESPONSE
  // ==========================================

  async function speakAnswer(text: string) {

    if (!text) {
      return;
    }

    try {

      setIsSpeaking(true);

      setStatus("🔊 Generating voice response...");

      const cleanText = text
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/\n/g, " ");

      const response = await fetch(
        "http://127.0.0.1:8000/speak",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            text: cleanText,
            language: language,
          }),
        }
      );

      if (!response.ok) {

        throw new Error(
          "Failed to generate speech"
        );

      }

      const audioBlob =
        await response.blob();

      const audioUrl =
        URL.createObjectURL(audioBlob);

      const audio =
        new Audio(audioUrl);

      setStatus("🔊 Playing AI response...");

      audio.play();

      audio.onended = () => {

        URL.revokeObjectURL(audioUrl);

        setIsSpeaking(false);

        setStatus("");

      };

    } catch (error) {

      console.error(error);

      setStatus(
        "❌ Unable to generate voice response."
      );

      setIsSpeaking(false);

    }

  }


  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <TopNavbar />

        <main className="flex-1 p-6">
          <section className="chat-area">


          <div className="chat-messages">

            {messages.map(
              (message, index) => (

                <div
                  key={index}
                  className={
                    message.type === "user"
                      ? "message-row user-row"
                      : "message-row ai-row"
                  }
                >

                  {message.type === "ai" && (

                    <div className="message-avatar ai-avatar">
                      🤖
                    </div>

                  )}


                  <div
                    className={
                      message.type === "user"
                        ? "message user-message"
                        : "message ai-message"
                    }
                  >

                    <p>
                      {message.text}
                    </p>


                    {message.type === "ai" &&
                      index !== 0 && (

                        <button
                          className="speak-message-btn"

                          disabled={
                            isSpeaking ||
                            loading ||
                            isRecording
                          }

                          onClick={() =>
                            speakAnswer(
                              message.text
                            )
                          }
                        >
                          🔊 Listen
                        </button>

                      )}

                  </div>


                  {message.type === "user" && (

                    <div className="message-avatar user-avatar">
                      👤
                    </div>

                  )}

                </div>

              )
            )}


            {loading && (

              <div className="message-row ai-row">

                <div className="message-avatar ai-avatar">
                  🤖
                </div>

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

          {status && (

            <div className="chat-status">
              {status}
            </div>

          )}


          {/* INPUT AREA */}

          <p className="ai-disclaimer">

            🌱 AI recommendations should be
            verified before making important
            farming decisions.

          </p>

          <div className="chat-input-container">


            <button
              className={
                isRecording
                  ? "voice-btn recording"
                  : "voice-btn"
              }

              onClick={recordAudio}

              disabled={
                loading ||
                isRecording ||
                isSpeaking
              }
            >

              {isRecording
                ? "🎙"
                : "🎤"}

            </button>


            <input
              type="text"

              value={question}

              onChange={(e) =>
                setQuestion(e.target.value)
              }

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

              onClick={askAI}

              disabled={
                loading ||
                !question.trim()
              }
            >

              {loading
                ? "..."
                : "➤"}

            </button>

          </div>
        </section>
        </main>
      </div>
    </div>
  );


}
