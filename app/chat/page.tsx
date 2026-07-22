"use client";

import { useState } from "react";
import Link from "next/link";
import "./chat.css";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface Message {
  type: "user" | "ai";
  text: string;
}

export default function ChatPage() {

  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState("en");

  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      text: "Hello! 👋 I am your AI Agricultural Advisor. Ask me anything about crops, farming, weather, diseases, market information or government schemes.",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("");

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

      const response = await fetch(
        "http://127.0.0.1:8000/chat",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message: currentQuestion,
            language: language,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();

      setMessages((previous) => [
        ...previous,
        {
          type: "ai",
          text:
            data.answer ||
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

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

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

    recognition.onresult = (event: any) => {

      const transcript =
        event.results[0][0].transcript;

      setQuestion(transcript);

      setStatus("");

    };

    recognition.onerror = (event: any) => {

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
// ==========================================
// LOGOUT
// ==========================================

function handleLogout() {
  sessionStorage.clear();
  window.location.href = "/login";
}

  return (

    <div className="chat-dashboard">

      {/* ================= SIDEBAR ================= */}

      <aside className="chat-sidebar">

        <div>

          <div className="sidebar-logo">

            <span>🌾</span>

            <div>
              <h2>AgriAI</h2>
              <p>Smart Farming</p>
            </div>

          </div>


          <div className="sidebar-menu">

  <Link href="/dashboard" className="sidebar-link">
    🏠 Dashboard
  </Link>

  <Link href="/chat" className="sidebar-link active">
    💬 AI Assistant
  </Link>

  <Link href="/voice" className="sidebar-link">
    🎤 Voice Advisory
  </Link>

  <Link href="/weather" className="sidebar-link">
    🌦 Weather
  </Link>

  <Link href="/crop" className="sidebar-link">
    🌾 Crop Advisory
  </Link>

  <Link href="/market" className="sidebar-link">
    💰 Market Prices
  </Link>

  <Link href="/schemes" className="sidebar-link">
    🏛 Government Schemes
  </Link>

</div>

        </div>


        <div className="sidebar-bottom">

          <Link
            href="/"
            className="sidebar-home"
          >
            ← Back to Home
          </Link>

        </div>

      </aside>


      {/* ================= MAIN ================= */}

      <main className="chat-main">


        {/* HEADER */}

        <header className="chat-header">

          <div>

            <h1>
              🤖 Agricultural AI Assistant
            </h1>

            <p>
              Ask farming questions and receive
              intelligent agricultural guidance.
            </p>

          </div>


          <div className="header-controls">

            <label>
              🌐 Language
            </label>

            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value)
              }
            >

              <option value="en">
                English
              </option>

              <option value="hi">
                Hindi
              </option>

              <option value="te">
                Telugu
              </option>

            </select>

          </div>

        </header>


        {/* CHAT AREA */}

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

          </div>


          {/* STATUS */}

          {status && (

            <div className="chat-status">
              {status}
            </div>

          )}


          {/* INPUT AREA */}

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


          <p className="ai-disclaimer">

            🌱 AI recommendations should be
            verified before making important
            farming decisions.

          </p>

        </section>

      </main>

    </div>

  );

}