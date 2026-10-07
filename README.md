# 🌾 AgriAdvisor

### AI-Powered Agricultural Advisory for Farmers

> **Ask. Understand. Act.**
>
> AgriAdvisor is a multilingual, voice-enabled agricultural assistant that helps farmers get practical guidance on crops, diseases, pests, soil, fertilizers, irrigation, weather, government schemes, and market prices.

<p align="center">
  <strong>🌱 Agriculture • 🤖 AI • 🎙️ Voice • 🌍 Multilingual • 📈 Live Data</strong>
</p>

---

## 🚀 Try AgriAdvisor

### 🌐 Live App

**[👉 Open AgriAdvisor](https://ai-based-agricultural-advisory-syst-liard.vercel.app/)**

Open the app in a browser, create an account, and start asking agriculture-related questions.

### 💻 Run It Locally

~~~bash
git clone https://github.com/SRC9060/AI-Based-Agricultural-Advisory-System_repo.git
cd AI-Based-Agricultural-Advisory-System_repo
~~~

Then start the backend and frontend in two terminals.

**Backend**

~~~bash
cd backend
python -m venv venv
~~~

Windows PowerShell:

~~~powershell
.\\venv\\Scripts\\Activate.ps1
pip install -r req.txt
python -m uvicorn app:app --reload
~~~

Linux/macOS:

~~~bash
source venv/bin/activate
pip install -r req.txt
python -m uvicorn app:app --reload
~~~

Backend runs at:

~~~text
http://localhost:8000
~~~

**Frontend**

~~~bash
cd frontend
npm install
npm run dev
~~~

Frontend runs at:

~~~text
http://localhost:3000
~~~

> Create **backend/.env** from **backend/.env.example** and add the API keys/services you want to use locally.

---

## 🌱 What Is AgriAdvisor?

Farmers often need answers to simple but important questions:

- What disease is affecting my crop?
- Which fertilizer should I use?
- Will it rain today?
- What is today's market price?
- How can I control this pest?
- Which government scheme can I apply for?
- What should I do if my crop leaves are turning yellow?

AgriAdvisor brings these use cases together in one farmer-focused application.

Instead of giving a generic chatbot experience, the system combines **agricultural knowledge retrieval, intent detection, multilingual processing, live data services, and voice interaction** to make the experience more practical.

---

## ✨ Why It Stands Out

### 🤖 AI Agricultural Assistant

Ask natural questions such as:

> “My rice leaves are turning yellow. What should I do?”

The system detects the agricultural intent, identifies relevant entities, searches the agricultural knowledge base, and generates a practical response.

### 🗣️ Talk to the Assistant

AgriAdvisor supports a voice-first experience.

~~~text
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
~~~

Sarvam AI is used for cloud speech processing, with Whisper and Edge TTS available as fallback components.

### 🌍 Built for Indian Languages

The application supports multilingual interaction across English and Indian languages including:

**Hindi • Kannada • Telugu • Tamil • Malayalam • Marathi • Gujarati**

A farmer can ask questions in their preferred language and receive the response in that language.

### 📚 Answers Grounded in Agricultural Knowledge

AgriAdvisor uses **RAG (Retrieval-Augmented Generation)** instead of relying only on an LLM.

~~~text
Agricultural PDFs / documents
            ↓
       Split into chunks
            ↓
         Embeddings
            ↓
         ChromaDB
            ↓
    Relevant knowledge
            ↓
           LLM
            ↓
     Farmer-friendly answer
~~~

This gives the AI access to the application's curated agricultural knowledge base while generating the final answer.

### 🌦️ Live Weather Information

Farmers can check current weather and forecasts for a location.

The backend connects to an external weather service and returns localized weather information rather than asking the LLM to invent live weather data.

### 📈 Market Price Information

AgriAdvisor integrates with **AGMARKNET** for agricultural market-price data.

The system can work with:

- Commodity
- State
- District
- Market
- Minimum price
- Maximum price
- Modal price
- Arrival date

### 🏛️ Government Scheme Assistance

Farmers can ask questions about government agricultural schemes, subsidies, insurance, machinery support, and related programs.

The application includes scheme-specific retrieval through its agricultural knowledge and scheme-agent flow.

### 📷 Crop-Disease Image Analysis

The application also supports crop image analysis.

A farmer can upload a crop/leaf image and receive:

- Predicted disease
- Confidence information
- Alternative predictions
- Symptoms
- Causes
- Treatment guidance
- Prevention
- Precautions
- Recommended actions

> **Current implementation note:** when trained vision-model weights are not present in the repository, the disease detector uses its built-in demo prediction mappings and then uses the agricultural RAG pipeline to generate disease guidance.

### 👨‍🌾 Personal Farmer Profile

The app can store farmer information such as:

- Crop
- Farm size
- Soil type
- Irrigation type
- Farming type
- Crop variety
- Sowing date
- Expected harvest date
- Growth stage
- Location

This creates a foundation for more personalized agricultural assistance.

### 💬 Chat History

Conversations are organized into sessions so farmers can return to previous questions instead of starting from zero every time.

### 🔔 Notifications & Feedback

The platform includes notifications, feedback collection, response feedback, recent activity, and data-management features.

---

## 🧠 How a Farmer's Question Is Processed

A typical text query follows this path:

~~~text
Farmer Question
      ↓
Language Detection
      ↓
Translate to English when required
      ↓
Intent Classification
      ↓
Agricultural Entity Extraction
      ↓
Agriculture-Domain Validation
      ↓
Request Routing
      ├── Weather ───────→ Weather Service
      ├── Market Price ──→ AGMARKNET
      └── Other Agri ────→ RAG Pipeline
                              ↓
                         Knowledge Base
                              ↓
                             LLM
      ↓
Translate response when required
      ↓
Save conversation / quality data
      ↓
Return answer to farmer
~~~

---

## 🔎 Intelligent Query Understanding

The backend does more than simply send the question to an LLM.

### Intent Classification

The application recognizes intents such as:

~~~text
disease_query
fertilizer_query
government_scheme_query
weather_query
soil_query
pest_control_query
crop_management_query
market_price_query
irrigation_query
seed_query
harvesting_query
crop_variety_query
organic_farming_query
planting_query
weed_management_query
general_agriculture_query
~~~

Keyword and phrase rules are applied first, with a Hugging Face zero-shot classifier using **facebook/bart-large-mnli** as a fallback path.

### Agricultural Entity Extraction

The system can identify entities such as:

~~~text
Crop
Disease
Pest
Fertilizer
Government Scheme
Equipment
~~~

For example:

> “What fertilizer should I use for tomato affected by leaf curl?”

can be understood as:

~~~text
Crop      → tomato
Disease   → leaf curl
Intent    → disease_query / fertilizer-related context
~~~

---

## 📚 RAG + Vector Search

AgriAdvisor's agricultural knowledge base supports:

- PDF documents
- TXT files
- Markdown files

The system loads documents, splits them into smaller chunks, creates embeddings, and stores them in ChromaDB.

### Embedding Model

~~~text
sentence-transformers/all-MiniLM-L6-v2
~~~

### Retrieval

The backend uses semantic similarity search so the system can find information that is **similar in meaning**, not only information containing the exact same words.

It also includes crop-aware retrieval and separate government-scheme filtering.

### In One Line

> **Knowledge Base = information → ChromaDB = retrieval → LLM = generation**

---

## 🤖 LLM Fallback Strategy

The application supports multiple LLM providers.

Current fallback order:

~~~text
Groq
  ↓
Gemini
  ↓
Sarvam
  ↓
OpenAI
~~~

If a configured provider is unavailable, the backend can try the next provider.

The RAG layer also includes a local extractive/crop-specific fallback response path.

---

## 🏗️ Tech Stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16 |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Animations | Framer Motion |
| PWA | next-pwa |
| Backend | FastAPI + Python |
| API Server | Uvicorn |
| ORM | SQLAlchemy |
| Local DB | SQLite |
| Production DB | PostgreSQL |
| Vector DB | ChromaDB |
| RAG | LangChain |
| Embeddings | Hugging Face / Sentence Transformers |
| Intent Classification | Hugging Face Zero-Shot + rule-based routing |
| Speech-to-Text | Sarvam AI + Whisper fallback |
| Text-to-Speech | Sarvam AI + Edge TTS fallback |
| Weather | OpenWeather integration |
| Market Data | AGMARKNET |
| Deployment | Render + Docker |
| Infrastructure | Redis + persistent disk |

---

## 🖥️ Application Areas

The application includes dedicated pages and flows for:

~~~text
🏠 Landing / Home
🔐 Login & Registration
📊 Farmer Dashboard
💬 AI Chat
🌦️ Weather
📈 Market Prices
🏛️ Government Schemes
👨‍🌾 Farmer Profile
🔔 Notifications
📝 Feedback
📷 Disease Detection
⚙️ Settings
~~~

The frontend is implemented as a responsive Next.js application and is configured as a PWA with an offline fallback page.

---

## 🗄️ Data & Storage

AgriAdvisor uses different storage systems for different jobs.

### Structured application data

Stored through SQLAlchemy in:

~~~text
SQLite → local development
PostgreSQL → deployed environment
~~~

Used for:

- Users
- Farmer profiles
- Chat sessions
- Chat messages
- Notifications
- Feedback
- Response feedback
- Unanswered queries

### Agricultural knowledge

Stored separately as:

~~~text
Knowledge documents
      ↓
Chunks + embeddings
      ↓
ChromaDB
~~~

The browser does **not** connect directly to the database or vector database.

~~~text
Next.js
   ↓
FastAPI
   ↓
Database / RAG / External APIs
~~~

---

## 🔐 Security

The application includes:

- Password hashing using PBKDF2-SHA256
- Signed access tokens with expiration
- Bearer-token authentication
- User-access checks
- Rate limiting
- CORS configuration
- Environment-based secrets and API keys

Never place real API keys or secrets inside the repository.

---

## 📁 Project Structure

~~~text
AI-Based-Agricultural-Advisory-System_repo/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── req.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── knowledge_base/
│   └── services/
│       ├── knowledge_base.py
│       ├── rag_pipeline.py
│       ├── llm.py
│       ├── router.py
│       ├── intent_classifier.py
│       ├── agri_entities.py
│       ├── language_detection.py
│       ├── translation.py
│       ├── speech_to_text.py
│       ├── text_to_speech.py
│       ├── weather_service.py
│       ├── agmarknet.py
│       ├── disease_detection.py
│       └── agents/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── scripts/
│   ├── package.json
│   ├── next.config.mjs
│   ├── proxy.ts
│   └── Dockerfile
│
├── render.yaml
└── README.md
~~~

---

## 🔌 Important API Areas

The FastAPI backend exposes routes for:

~~~text
Authentication
├── POST /register
├── POST /login
└── GET  /auth/verify

Profile / Farm
├── GET /profile/{user_id}
├── PUT /profile/{user_id}
├── GET /farm/{user_id}
└── PUT /farm/{user_id}

AI Chat
├── POST /chat/session
├── GET  /chat/sessions/{user_id}
├── GET  /chat/session/{session_id}/messages
└── POST /chat

Voice
├── POST /speech-to-text
└── POST /speak

Live Data
├── GET  /weather
├── GET  /weather/forecast
├── POST /market-price
└── GET  /market-options

Agriculture
├── POST /schemes/search
└── POST /disease-detection

Feedback
├── POST /feedback
└── POST /chat/feedback
~~~

Administrative routes provide analytics and protected knowledge-base management.

---

## ☁️ Deployment

The repository includes a Render configuration with separate services for the application.

~~~text
                    Internet
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
     Next.js PWA            FastAPI API
        Service                 Service
             │                   │
             │          ┌────────┼─────────┐
             │          ↓        ↓         ↓
             │      PostgreSQL  Redis    Chroma
             │
             └──────────────────────────────
~~~

The deployed backend uses a persistent disk for the agricultural knowledge base and Chroma database.

---

## 🌾 Example Questions to Try

Once the app is open, try questions like:

> **“What fertilizer is best for tomato?”**

> **“मेरे धान में बीमारी है, क्या करूं?”**

> **“Will it rain in my area today?”**

> **“What is the market price of rice?”**

> **“How can I control whiteflies in cotton?”**

> **“Which government scheme can help with farm machinery?”**

Or use the **voice feature** and simply ask your question.

---

## 🎯 The Goal

AgriAdvisor is designed around a simple idea:

> **Make reliable agricultural guidance easier to access for farmers, especially through local languages and voice interaction.**

It brings together:

**AI + RAG + Multilingual NLP + Voice + Live Weather + Market Data + Agricultural Knowledge**

into one farmer-focused application.

---

## 📌 Current Status

The project is a working full-stack application with the major features and integrations described above.

The repository also contains modular fallback implementations so the application can continue operating when some external AI services are unavailable.

For the crop-disease image feature, trained vision weights are not guaranteed to be included in the repository; without them, the current implementation uses its demo prediction mappings and then generates agricultural guidance through the RAG pipeline.

---

## 🛠️ Future Improvements

- Add and deploy a dedicated trained crop-disease vision model.
- Improve personalization using farmer history, location, crop stage, and farm profile.
- Expand agricultural knowledge coverage.
- Add more regional-language support.
- Continue improving live-data integrations and production observability.

---

## 👨‍💻 Repository

**GitHub:**  
https://github.com/SRC9060/AI-Based-Agricultural-Advisory-System_repo

**Live App:**  
https://ai-based-agricultural-advisory-syst-liard.vercel.app/

---

<p align="center">
  <strong>🌱 Built to make agricultural advice more accessible, practical, and farmer-friendly.</strong>
</p>
