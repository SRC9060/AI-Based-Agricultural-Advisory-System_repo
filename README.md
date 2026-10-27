# 🌾 AgriAdvisor

### AI-Powered Agricultural Advisory System

> **A multilingual, voice-enabled AI assistant that helps farmers understand their crops, identify problems, and make better farming decisions.**

AgriAdvisor combines **Generative AI, RAG, multilingual NLP, voice interaction, semantic search, and live agricultural data** into one farmer-focused platform.

## 🚀 Try the App

### 🌐 Live Demo

**[👉 Open AgriAdvisor](https://ai-based-agricultural-advisory-syst-liard.vercel.app/)**

Create an account and start with a simple question about a crop, disease, pest, fertilizer, weather, market price, or government scheme.

---

## 🌱 What Can AgriAdvisor Do?

### 🤖 AI Agricultural Assistant

Ask questions naturally, just like you would ask an agricultural advisor:

> **“My rice leaves are turning yellow. What should I do?”**

AgriAdvisor does more than send the question directly to an LLM. It combines **language detection, intent classification, agricultural entity extraction, knowledge retrieval, and AI generation** before returning the answer.

### 🛠️ Autonomous Tool-Calling Agent (`/agent/chat`)

For complex, multi-faceted queries requiring dynamic information retrieval, the backend provides a schema-driven AI agent. Powered by standard function-calling protocols (compatible with Groq and OpenAI), the agent autonomously selects, validates, and executes domain tools in a bounded reasoning loop:

- **Agricultural Knowledge Search:** Semantic RAG retrieval over curated agronomic guidance.
- **Government Scheme Assistance:** Subsidy, eligibility, and program search across central and state schemes.
- **Live Weather Forecasts:** Real-time conditions and agricultural weather advisories via OpenWeather.
- **Commodity Market Prices:** Mandi rates and modal price tracking via AGMARKNET.

> For complete architectural details, sequence diagrams, and API specifications, see the [Agent Tool-Calling Documentation](docs/agent-tool-calling.md).

### ⏳ Asynchronous Background Jobs (`/agent/jobs`)

For long-running or mobile-friendly operations, queries can also be dispatched asynchronously. The API validates the query and client `Idempotency-Key`, returns an immediate `job_id` (`202 Accepted`), and lets an independent worker (`python -m services.agent_worker`) process the query in the background with atomic lease claiming, exponential retry backoff, and crash recovery.

> For queue architecture, idempotency rules, and worker commands, see the [Background Jobs Documentation](docs/background-jobs.md).

### ⚙️ Configurable AI Workflows (`/agent/workflows`)

To prevent tool overload and reduce reasoning latency, queries can be routed through declarative, schema-validated AI workflows (such as `general_advisory`, `crop_care`, and `market_and_weather`). Each workflow defines a strict allowlist of registered tools, bounded reasoning rounds, and specialized system prompts without code changes.

> For workflow definitions, schema constraints, and API requests, see the [Configurable Workflows Documentation](docs/agent-workflows.md).

### 💬 Chat Interface: Standard Chat & AI Agent Mode

The web application (`/chat`) allows farmers and agricultural officers to interact in two distinct modes:
- **Standard Chat (Default):** Retains the familiar, fast synchronous response pipeline.
- **AI Agent Mode:** Submits queries to the database-backed background job queue with client-side idempotency, polls for status updates, dynamically loads available workflows (`general_advisory`, `crop_care`, `market_and_weather`), and renders verified tool execution metadata with expandable diagnostics and text-to-speech audio playback.

### 📚 RAG-Powered Agricultural Knowledge

The system uses **Retrieval-Augmented Generation (RAG)** to ground AI responses in a curated agricultural knowledge base.

**LangChain + ChromaDB + embeddings** are used to retrieve relevant agricultural information before the response is generated.

It also supports **semantic similarity search**, so relevant information can be found by meaning rather than only exact keyword matches.

### 🎙️ Voice-First Interaction

Farmers can interact using voice instead of typing.

```text
🎙️ Farmer speaks
      ↓
📝 Speech-to-Text
      ↓
🧠 Query understanding
      ↓
📚 Knowledge retrieval / live service
      ↓
🤖 AI response
      ↓
🔊 Text-to-Speech
```

**Sarvam AI** is used for cloud speech processing, with **Whisper** and **Edge TTS** available as fallback components.

### 🌍 Multilingual Support

AgriAdvisor is designed for English and multiple Indian languages, including:

**Hindi • Kannada • Telugu • Tamil • Malayalam • Marathi • Gujarati**

The system can detect the input language, process the query, and return the response in the user's language.

### 🧠 Intelligent Query Understanding

Before answering, the backend identifies what the farmer is asking about.

It supports intents such as:

**Disease • Fertilizer • Pest Control • Weather • Soil • Irrigation • Crop Management • Market Price • Government Schemes • Seeds • Harvesting • Planting • Organic Farming • Weed Management**

It also extracts useful agricultural entities such as:

**Crop • Disease • Pest • Fertilizer • Government Scheme • Equipment**

The intent pipeline combines **rule-based detection** with **Hugging Face zero-shot classification using facebook/bart-large-mnli** as a fallback.

### 🌦️ Live Weather & 📈 Market Prices

AgriAdvisor connects the AI experience with real-world data.

- **Weather:** current conditions and forecasts through the OpenWeather integration
- **Market prices:** agricultural market information through **AGMARKNET**

### 🏛️ Government Scheme Assistance

Farmers can ask about agricultural schemes, subsidies, insurance, machinery support, and related government assistance using the dedicated scheme-search flow and agricultural knowledge base.

### 📷 Crop-Disease Image Analysis

The application also supports **crop/leaf image analysis** and returns disease-related information such as symptoms, causes, treatment guidance, prevention, precautions, and recommended actions.

> The current repository includes a modular disease-analysis implementation. Dedicated trained vision-model weights are not guaranteed to be present, so the system can use its built-in demo prediction mappings when weights are unavailable.

### 👨‍🌾 Farmer-Centric Features

The platform also includes:

- Farmer profiles and farm details
- Conversation sessions and chat history
- Notifications
- Feedback and response-quality tracking
- Recent activity
- Data export and account-management features
- PWA support for a mobile-friendly experience

---

## 🔥 Why This Project Is Interesting

AgriAdvisor is not just a chatbot.

It brings several technologies together into one end-to-end system:

**Generative AI + RAG + Semantic Search + Multilingual NLP + Voice AI + Live APIs + PWA**

The application combines **domain-specific knowledge retrieval** with **live external data** so different types of agricultural questions can be handled by the appropriate part of the system.

---

## 🏗️ High-Level Architecture

```text
                    Farmer
                       │
                Text / Voice / Image
                       │
                       ▼
              Next.js / React PWA
                       │
                       ▼
                  FastAPI
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
     NLP / AI         RAG        Live Services
          │            │             │
          │        ChromaDB     Weather / AGMARKNET
          │        + LangChain
          │
          ▼
   Language / Intent /
   Entity Processing
          │
          ▼
        LLM
          │
          ▼
    Farmer-friendly response
```

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- PWA with next-pwa

**Backend**
- FastAPI
- Python
- Uvicorn
- SQLAlchemy

**AI / NLP**
- RAG with LangChain
- ChromaDB
- Sentence Transformers
- Hugging Face
- LLM APIs: Groq, Gemini, Sarvam, OpenAI

**Voice**
- Sarvam AI
- Whisper
- Edge TTS

**Live Data**
- OpenWeather
- AGMARKNET

**Deployment**
- Docker
- Render
- PostgreSQL
- Redis

---

## 💻 Run Locally

### 1. Clone

```bash
git clone https://github.com/SRC9060/AI-Based-Agricultural-Advisory-System_repo.git
cd AI-Based-Agricultural-Advisory-System_repo
```

### 2. Backend

```bash
cd backend
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
pip install -r req.txt
python -m uvicorn app:app --reload
```

Linux/macOS:

```bash
source venv/bin/activate
pip install -r req.txt
python -m uvicorn app:app --reload
```

Backend: http://localhost:8000

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

> Configure the required API keys and settings in backend/.env using backend/.env.example.

---

## 🌾 Example Questions

> **“What fertilizer is best for tomato?”**

> **“मेरे धान में बीमारी है, क्या करूं?”**

> **“Will it rain in my area today?”**

> **“What is the market price of rice?”**

> **“How can I control whiteflies in cotton?”**

> **“Which government scheme can help with farm machinery?”**

You can also ask through the **voice interface**.

---

## 📌 Project Highlights

- **Full-stack AI application** built with Next.js and FastAPI
- **Autonomous tool-calling agent** with Pydantic parameter validation and bounded reasoning ([details](docs/agent-tool-calling.md))
- **Asynchronous background job queue** with idempotent submission, worker lease recovery, and retry backoff ([details](docs/background-jobs.md))
- **RAG-based agricultural advisory** using LangChain and ChromaDB
- **Semantic similarity search** over a curated agricultural knowledge base
- **Multilingual NLP** for Indian-language farmer queries
- **Voice AI** with Speech-to-Text and Text-to-Speech
- **Live weather and market-price integrations**
- **Crop/leaf disease analysis**
- **PWA-ready, responsive user experience**
- **Production deployment with Docker, Render, PostgreSQL, and Redis**

---

## 👨‍💻 Repository

**GitHub:**  
https://github.com/SRC9060/AI-Based-Agricultural-Advisory-System_repo

<p align="center">
  <strong>🌱 AI for agriculture. Built for real farmer problems.</strong>
</p>