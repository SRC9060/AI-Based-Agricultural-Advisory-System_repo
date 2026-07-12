"use client";

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
  const [status, setStatus] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  
  async function askAI() {
  if (!question.trim()) {
    alert("Please enter a question.");
    return;
  }

  try {
    setLoading(true);
    setAnswer("");
    setStatus("📤 Sending your question...");

    const response = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: question,
        language: language,
      }),
    });


    setStatus("🧠 Understanding your question...");
    await new Promise(resolve => setTimeout(resolve,500));

    const data = await response.json();

    setStatus("🌾 Preparing agricultural recommendation...");
    await new Promise(resolve => setTimeout(resolve,500));

    setAnswer(data.answer);
    setStatus("✅ Recommendation Ready");
  } catch (error) {
    setStatus("❌ Unable to connect to AI server.");
    console.log(error);
  } finally {
    setTimeout(() => {
      setLoading(false);
      setStatus("");
  }, 1200);
  }
}

  async function recordAudio() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setStatus("❌ Please use Google Chrome for voice input.");
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

  recognition.onerror = (event:any)=>{

  console.log(event.error);

  if(
  event.error==="no-speech" ||
  event.error==="aborted"
  ){

  setIsRecording(false);

  return;

  }

  setStatus("⚠ Please speak again.");

    setTimeout(()=>{

  setStatus("");

  },2000);

  setIsRecording(false);

  };

  recognition.onend = () => {
    setIsRecording(false);
  };
}

  async function speakAnswer() {
    setIsSpeaking(true);

    setStatus("🔊 Generating voice...");
    try {
      const cleanText = answer
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/\n/g, " ");

      const response = await fetch("http://127.0.0.1:8000/speak", {
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

      setStatus("▶ Playing response...");
      audio.play();

      audio.onended = () => {

        URL.revokeObjectURL(audioUrl);

        setStatus("✅ Voice Finished");

        setIsSpeaking(false);

        setTimeout(()=>{

        setStatus("");

        },1500);

      };
    } catch (error) {
      console.error(error);
      setStatus("❌ Unable to generate voice.");
      setIsSpeaking(false);
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

            background:"#FFFFFF",
            color: "#111111",

            padding:"18px",

            borderRadius:"10px",

            marginBottom:"20px",

            border:"2px solid #66BB6A",

            boxShadow:"0 4px 12px rgba(0,0,0,0.08)",

          }}

          >

          <h3
          style={{
            color: "#000000",
            fontWeight: "bold",
            fontSize: "20px",
          }}
          >

            💡 Example Questions

          </h3>

          {language === "en" && (
            <ul
              style={{
                color: "#000000",
                fontSize: "17px",
                fontWeight: "600",
              }}
            >
              <li>🌾 What fertilizer is best for paddy?</li>
              <li>🐛 How can I control pests naturally?</li>
              <li>🍅 My tomato leaves are turning yellow.</li>
            </ul>
          )}

          {language === "hi" && (
            <ul
            style={{
              color: "#000000",
              fontSize: "17px",
              fontWeight: "600",
            }}
            >
              <li>धान के लिए सबसे अच्छा उर्वरक कौन सा है?</li>
              <li>प्राकृतिक तरीके से कीट नियंत्रण कैसे करें?</li>
              <li>टमाटर की पत्तियां पीली हो रही हैं।</li>
            </ul>
          )}

          {language === "te" && (
            <ul
            style={{
              color: "#000000",
              fontSize: "17px",
              fontWeight: "600",
            }}
            >
              <li>🌾 వరికి ఏ ఎరువు మంచిది?</li>
              <li>🐛 సహజంగా పురుగులను ఎలా నియంత్రించాలి?</li>
              <li>🍅 టమోటా ఆకులు పసుపు రంగులోకి మారుతున్నాయి.</li>
            </ul>
          )}

        </div>

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
            disabled={loading || isRecording || isSpeaking}
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
            {
              isRecording
              ?
              "🎙 Listening..."
              :
              "🎤 Speak"
              }
          </button>
        </div>

        <div
          style={{
            marginTop: "30px",
            padding: "25px",
            background:"linear-gradient(135deg,#F8FFF5,#ECFFF0)",
            borderRadius: "12px",
            border:"2px solid #81C784",
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
            
          {
            status &&

            <div

            style={{

              padding:"12px",

              background:"#E8F5E9",

              borderRadius:"10px",

              marginBottom:"15px",

              fontWeight:"bold",

              color:"#1565C0"

            }}

            >

              {status}

            </div>

          }

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
              disabled={loading || isRecording || isSpeaking}
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
              {
                isSpeaking
                ?
                "⏳ Generating Voice..."
                :
                "🔊 Speak"
              }
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
