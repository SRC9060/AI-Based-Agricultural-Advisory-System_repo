# AgriAdvisor — AI-Based Agricultural Advisory System

> A multilingual, voice-enabled agricultural advisory platform that helps farmers get practical guidance on crops, diseases, pests, soil, fertilizers, irrigation, government schemes, weather, and market prices.

## Overview

AgriAdvisor is a full-stack agricultural advisory application built for farmers. The system accepts text and voice queries, detects the user's language and agricultural intent, extracts relevant entities such as crops or diseases, retrieves relevant knowledge from a curated agricultural knowledge base, and generates a farmer-friendly response.

The platform also connects to live services for weather and market information and provides authentication, farmer profiles, chat history, feedback, notifications, government-scheme search, and crop-disease image analysis.

The architecture is split into:

- **Frontend:** Next.js / React / TypeScript progressive web app
- **Backend:** FastAPI / Python
- **Structured data:** SQLAlchemy with SQLite locally and PostgreSQL in the Render deployment
- **Knowledge retrieval:** LangChain + ChromaDB + Hugging Face embeddings
- **AI providers:** Groq, Gemini, Sarvam, and OpenAI with fallback handling
- **Voice:** Sarvam Speech-to-Text / Text-to-Speech with local Whisper and Edge TTS fallbacks
- **Live data:** OpenWeather and AGMARKNET
- **Deployment:** Render with separate backend and frontend services, PostgreSQL, Redis, and persistent disk

## Core Features

### Farmer Chat Assistant

- Natural-language agricultural questions
- Agriculture-domain validation
- Language detection
- English normalization/translation for processing
- Intent classification
- Agricultural entity extraction
- RAG-based knowledge retrieval
- LLM-generated responses
- Translation back to the user's language
- Conversation/session history
- Response-quality and feedback tracking

### Agricultural Topics

The advisory pipeline supports intents including:

- Crop management
- Planting and harvesting
- Crop varieties
- Diseases
- Pest control
- Fertilizers
- Soil health
- Irrigation
- Organic farming
- Weed management
- Government schemes
- Weather
- Market prices
- General agriculture

### Multilingual and Voice Support

The application is designed for English and Indian-language interaction, including Hindi, Kannada, Telugu, Tamil, Malayalam, Marathi, and Gujarati support across language-processing and voice components.

Voice flow:

```text
Farmer speaks
    ↓
Speech-to-Text
    ↓
Language / intent / entity processing
    ↓
RAG or live-data routing
    ↓
LLM response
    ↓
Translation when required
    ↓
Text-to-Speech
    ↓
Audio response
```

Sarvam AI is used for cloud speech processing and translation-related functionality. Local Whisper is available as an STT fallback, while Edge TTS provides a multilingual speech fallback when Sarvam TTS is unavailable.

### Weather

The backend provides:

- Current weather
- Forecast data
- Localized weather formatting
- City normalization for multilingual input

Weather requests are handled through the OpenWeather integration.

### Market Prices

The application integrates with AGMARKNET for market-price data.

The market flow supports:

- Commodity
- State
- District
- Market
- Minimum price
- Maximum price
- Modal price
- Arrival date

The backend first attempts an exact commodity/state/district lookup and uses broader state-level fallbacks when necessary.

### Government Schemes

Government-scheme queries are routed through the scheme-agent / knowledge-base path and can retrieve scheme-specific information from the indexed agricultural documents.

### Crop-Disease Image Analysis

The backend exposes a crop-disease detection endpoint that:

1. Validates the uploaded image.
2. Checks for local trained vision-model weights.
3. Uses the modular local-model path when weights are available.
4. Uses a demo prediction mapping when no local model weights are loaded.
5. Queries the agricultural RAG pipeline for symptoms, causes, treatment, prevention, and precautions.

**Important:** the current repository does not guarantee that trained vision-model weights are present. Without local model weights, the disease detector uses its built-in demo mappings rather than a learned production classifier.

## RAG Architecture

RAG means **Retrieval-Augmented Generation**.

Instead of sending a farmer's question directly to an LLM, the system first searches its agricultural knowledge base and supplies the most relevant passages as context.

### Knowledge-base pipeline

```text
PDF / TXT / MD documents
        ↓
Document loading
        ↓
Recursive text splitting
        ↓
Chunks (500 characters, 100-character overlap)
        ↓
Embeddings
        ↓
ChromaDB
```

The project uses:

- LangChain document loaders
- `RecursiveCharacterTextSplitter`
- `sentence-transformers/all-MiniLM-L6-v2`
- ChromaDB through `langchain_chroma`
- Metadata such as source file and knowledge-base folder

### Query pipeline

```text
Farmer query
     ↓
Embedding / similarity search
     ↓
Relevant knowledge chunks
     ↓
Context construction
     ↓
LLM
     ↓
Agricultural answer
```

Crop-aware retrieval is also implemented for several crops, and government-scheme searches can be restricted to the `Government_Schemes` knowledge-base folder.

## AI / NLP Pipeline

A typical chat request follows this flow:

```text
User Query
   ↓
Language Detection
   ↓
Translation to English when required
   ↓
Intent Classification
   ↓
Agricultural Entity Extraction
   ↓
Agriculture-Domain Check
   ↓
Request Routing
   ├── Weather → Weather service
   ├── Market → AGMARKNET
   └── Agriculture / schemes / pests / diseases / soil
           ↓
          RAG
           ↓
          LLM
   ↓
Translate response back to user language
   ↓
Save chat + quality information
   ↓
Return response
```

Intent classification uses deterministic keyword/phrase rules first and a Hugging Face zero-shot classifier using `facebook/bart-large-mnli` as a fallback.

The agricultural entity extractor identifies entities such as:

- Crop
- Disease
- Pest
- Fertilizer
- Government scheme
- Equipment

## LLM Provider Fallback

The current LLM layer attempts providers in this order:

```text
Groq
  ↓
Gemini
  ↓
Sarvam
  ↓
OpenAI
```

If an earlier provider is unavailable or fails, the application attempts the next configured provider. A local extractive / crop-specific fallback response is also available through the RAG pipeline.

## Authentication and Security

The backend implements application-level authentication using signed access tokens.

Key security-related components include:

- Password hashing with PBKDF2-SHA256
- Signed access tokens with an expiry time
- Bearer-token authentication for protected API routes
- User-access checks so one farmer cannot access another farmer's protected records
- Rate limiting
- CORS configuration
- Environment-based secret/API-key configuration

The frontend also protects authenticated pages by checking the `agriadvisor_session` cookie before allowing access to protected routes.

## Data Storage

The application uses two different storage systems for different purposes.

### Structured application database

SQLAlchemy is used as the ORM.

Local default:

```text
DATABASE_URL=sqlite:///users.db
```

Main structured records include:

- Users
- Chat sessions
- Chat messages
- Notifications
- Feedback
- Response feedback
- Unanswered queries

### Vector database

ChromaDB stores the searchable vector representation of the agricultural knowledge base.

```text
knowledge_base/
    ↓
document chunks + embeddings
    ↓
backend/chroma_db/
```

The frontend never talks directly to SQLite/PostgreSQL or ChromaDB. It communicates with the FastAPI backend, which performs database and retrieval operations.

## Project Structure

```text
AI-Based-Agricultural-Advisory-System_repo/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── req.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── knowledge_base/
│   ├── services/
│   │   ├── knowledge_base.py
│   │   ├── rag_pipeline.py
│   │   ├── llm.py
│   │   ├── router.py
│   │   ├── intent_classifier.py
│   │   ├── agri_entities.py
│   │   ├── language_detection.py
│   │   ├── translation.py
│   │   ├── speech_to_text.py
│   │   ├── text_to_speech.py
│   │   ├── weather_service.py
│   │   ├── agmarknet.py
│   │   ├── disease_detection.py
│   │   └── agents/
│   └── ...
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── scripts/
│   ├── public/
│   ├── package.json
│   ├── next.config.mjs
│   ├── proxy.ts
│   ├── Dockerfile
│   └── ...
├── render.yaml
└── README.md
```

## Frontend

The frontend is a **Next.js 16** application using **React 19** and **TypeScript**.

Key frontend technologies include:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React
- Framer Motion
- `next-view-transitions`
- `@ducanh2912/next-pwa`
- Vercel Analytics

The root layout provides:

- Language provider
- Session guard
- Offline banner
- View transitions
- PWA metadata
- Global fonts/styles
- Analytics

Authenticated pages include dashboard, weather, market prices, schemes, chat, profile, feedback, queries, and settings.

## Backend

The backend is built with **FastAPI** and **Python**.

The API includes endpoints for:

- Authentication: register, login, token verification
- Profile and farm information
- Notifications
- Chat sessions and messages
- Chat responses
- Speech-to-text
- Text-to-speech
- Weather and forecast
- Market prices and market options
- Government schemes
- Feedback
- Crop-disease detection
- Recent activity
- Admin analytics
- Knowledge-base administration
- User data export and account deletion

The backend starts with Uvicorn and automatically builds the vector database when it does not already exist.

## Representative API Endpoints

```text
GET    /
POST   /register
POST   /login
GET    /auth/verify

GET    /profile/{user_id}
PUT    /profile/{user_id}

POST   /chat/session
GET    /chat/sessions/{user_id}
GET    /chat/session/{session_id}/messages
DELETE /chat/session/{session_id}

POST   /chat
POST   /speech-to-text
POST   /speak

GET    /weather
GET    /weather/forecast

POST   /market-price
GET    /market-options

POST   /schemes/search
POST   /disease-detection

POST   /feedback
POST   /chat/feedback

GET    /recent-activity/{user_id}
```

Administrative endpoints for analytics and knowledge-base management are protected by the admin API key.

## Local Development

### 1. Clone

```bash
git clone https://github.com/SRC9060/AI-Based-Agricultural-Advisory-System_repo.git
cd AI-Based-Agricultural-Advisory-System_repo
```

### 2. Backend

Windows PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r req.txt
```

Linux/macOS:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r req.txt
```

Create a local `backend/.env` from `backend/.env.example` and add the API keys/services you want to enable.

Start the backend:

```bash
python -m uvicorn app:app --reload
```

Backend:

```text
http://localhost:8000
```

### 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

The frontend reads the backend URL from `NEXT_PUBLIC_API_URL` when configured.

## Environment Configuration

The repository provides `backend/.env.example`.

Important variables include:

```text
OPENAI_API_KEY=
SARVAM_API_KEY=
OPENWEATHER_API_KEY=
HF_TOKEN=
AGMARKNET_API_KEY=
AGMARKNET_BASE_URL=
ADMIN_API_KEY=
AUTH_SECRET_KEY=
AUTH_TOKEN_TTL_SECONDS=86400

ALLOWED_ORIGINS=

RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_TRUST_PROXY=false

REDIS_URL=

DATABASE_URL=sqlite:///users.db

KNOWLEDGE_BASE_PATH=knowledge_base
CHROMA_DB_PATH=chroma_db

GEMINI_API_KEY=
GROQ_API_KEY=
```

Never commit a real `.env` file or API credentials.

## Production Deployment

The repository includes a root `render.yaml` defining the deployment architecture.

### Services

- **agriadvisor-backend** — Docker-based FastAPI service
- **agriadvisor-pwa** — Docker-based Next.js frontend
- **agriadvisor-redis** — Redis key-value service
- **agriadvisor-database** — PostgreSQL database

The backend uses a persistent disk mounted at `/var/data` so the knowledge base and Chroma database can remain durable across restarts.

Production paths configured by Render:

```text
KNOWLEDGE_BASE_PATH=/var/data/knowledge_base
CHROMA_DB_PATH=/var/data/chroma_db
```

The frontend receives the backend URL through:

```text
NEXT_PUBLIC_API_URL
```

The backend is started with Uvicorn inside its Docker image, while the frontend uses the Next.js standalone production build.

## Knowledge-Base Administration

The backend exposes protected administrative operations for the knowledge base:

```text
GET  /admin/knowledge-base
POST /admin/knowledge-base/upload
POST /admin/knowledge-base/rebuild
```

This allows administrators to upload agricultural PDFs and rebuild the vector index when the knowledge base changes.

## Important Implementation Notes

- The normal SQL database and ChromaDB serve different purposes.
- The agricultural knowledge base can contain PDF, TXT, and Markdown documents.
- Chroma retrieval uses similarity scores and crop-aware metadata filtering.
- Weather and market data are fetched from external services rather than being generated by the LLM.
- The image disease detector is modular: local model weights can be used when available, while the current repository includes a demo fallback mapping.
- The application is designed to keep secrets in environment variables rather than source code.

## License

No explicit open-source license is currently declared in the repository. Add a license file if you intend to publish the project under a specific open-source license.
