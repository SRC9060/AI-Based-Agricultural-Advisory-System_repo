"use client";

import { API_URL } from "@/lib/api";

import { useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function Dashboard() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);


  async function askAI() {
  if (!question.trim()) {
    alert("Please enter a question.");
    return;
  }

  try {
    setLoading(true);
    setAnswer("");

    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: question,
        language: language,
      }),
    });

    const data = await response.json();

    setAnswer(data.answer);
  } catch (error) {
    alert("Unable to connect to AI server.");
    console.log(error);
  } finally {
    setLoading(false);
  }
}

  async function recordAudio() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition is not supported in this browser. Please use Google Chrome.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang =
    language === "te"
      ? "te-IN"
      : language === "hi"
      ? "hi-IN"
      : "en-IN";

  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  setIsRecording(true);

  recognition.start();

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setQuestion(transcript);
  };

  recognition.onerror = (event: any) => {
    console.log(event.error);
    alert("Speech recognition failed.");
    setIsRecording(false);
  };

  recognition.onend = () => {
    setIsRecording(false);
  };
}

  async function speakAnswer() {
    try {
      const cleanText = answer
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/\n/g, " ");

      const response = await fetch(`${API_URL}/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          language: language,
        }),
      });

      if (!response.ok) {
        alert("Failed to generate speech.");
        return;
      }

      const audioBlob = await response.blob();

      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error(error);
      alert("Unable to connect to speech service.");
    }
  }


  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#d8f3dc,#b7e4c7,#95d5b2)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px",
      }}
    >
      <div
        style={{
          width: "850px",
          maxWidth: "95%",
          background: "#ffffff",
          padding: "35px",
          borderRadius: "18px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              color: "#1b5e20",
              fontSize: "38px",
              marginBottom: "5px",
            }}
          >
            🌾 AI Agricultural Advisor
          </h1>

          <p
            style={{
              color: "#2d6a4f",
              fontSize: "18px",
            }}
          >
            Smart Farming Assistant
          </p>
        </div>

        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <label
            style={{
              fontWeight: "bold",
              color: "#1b5e20",
              fontSize: "17px",
            }}
          >
            🌐 Language
          </label>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "2px solid #2E7D32",
              color: "#222",
              background: "#fff",
              fontWeight: "600",
            }}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="te">Telugu</option>
          </select>
        </div>

        <input
          type="text"
          placeholder={
            language === "te"
              ? "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి..."
              : language === "hi"
              ? "अपना प्रश्न यहाँ लिखें..."
              : "Ask your agriculture question..."
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "10px",
            border: "2px solid #2E7D32",
            marginBottom: "20px",
            fontSize: "17px",
            color: "#111",
            background: "#ffffff",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

                <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={askAI}
            style={{
              flex: 1,
              padding: "14px",
              backgroundColor: "#2E7D32",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold",
            }}
           disabled={loading}>
            {loading ? "⏳ Thinking..." : "📤 Send"}
          </button>

          <button
            onClick={recordAudio}
            style={{
              width: "170px",
              padding: "14px",
              backgroundColor: isRecording ? "#C62828" : "#1565C0",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {isRecording ? "⏹ Stop" : "🎤 Speak"}
          </button>
        </div>

        <div
          style={{
            marginTop: "30px",
            padding: "25px",
            backgroundColor: "#edf7ed",
            borderRadius: "12px",
            border: "1px solid #b7e4c7",
          }}
        >
          <h2
            style={{
              color: "#1b5e20",
              marginBottom: "15px",
            }}
          >
            🌱 AI Recommendation
          </h2>

          <p
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.8",
              color: "#111111",
              fontSize: "17px",
              fontWeight: "500",
            }}

            >
            {loading ? "🤖 AI is analysing your question..." : answer}
          </p>
                    {answer && (
            <button
              onClick={speakAnswer}
              style={{
                marginTop: "20px",
                padding: "12px 24px",
                backgroundColor: "#1565C0",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              🔊 Speak
            </button>
          )}

          <p
            style={{
              marginTop: "20px",
              color: "#2E7D32",
              fontSize: "13px",
            }}
          >
            🌱 AI recommendations are generated using agricultural knowledge
            and should be verified before making important farming decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
