import os
import re
from pathlib import Path
from typing import Optional
# os.environ["HF_HUB_OFFLINE"] = "1"
# os.environ["TRANSFORMERS_OFFLINE"] = "1"

import threading

from services.knowledge_base import (
    CHROMA_DB_PATH,
    KNOWLEDGE_BASE_PATH,
    rebuild_vector_database,
)

KNOWLEDGE_BASE_READY = threading.Event()
_INIT_LOCK = threading.Lock()

def initialize_knowledge_base():
    with _INIT_LOCK:
        if KNOWLEDGE_BASE_READY.is_set():
            return
        try:
            if os.path.exists(CHROMA_DB_PATH):
                print("[RAG] Using existing vector database.")
            else:
                print("[RAG] Vector database initialization started.")
                print("No Vector Database Found, Building...")
                rebuild_vector_database()
                print("[RAG] Vector database initialization completed.")
            KNOWLEDGE_BASE_READY.set()
        except Exception as e:
            print(f"[RAG] Vector database initialization failed: {e}")

from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from starlette.background import BackgroundTask

from services.language_detection import detect_language
from services.translation import translate_text
from services.text_to_speech import text_to_speech
from services.intent_classifier import classify_intent
from services.ner import extract_entities
from services.rag_pipeline import generate_response
from services.weather_service import get_weather, get_forecast
from services.localized_weather import format_current_weather
from services.agri_entities import extract_agri_entities
from services.router import route_query
from services.response_quality import calculate_response_quality
from services.agmarknet import get_market_price
from services.agmarknet import (
    MarketServiceUnavailable,
    get_fallback_market_options,
    get_market_options,
)
from services.agents.scheme_agent import scheme_agent, scheme_titles_agent
from services.speech_to_text import (
    speech_to_text,
    whisper_speech_to_text,
)
from services.voice_languages import (
    VOICE_LANGUAGE_CODES,
    get_voice_language_code,
)
from services.security import enforce_rate_limit, require_admin_key
from services.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    password_is_hashed,
    verify_password,
)
from config import Config

from database import SessionLocal, engine
from models import *

app = FastAPI()

@app.on_event("startup")
def startup_event():
    threading.Thread(target=initialize_knowledge_base, daemon=True).start()

app.middleware("http")(enforce_rate_limit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Voice-Engine", "X-Voice-Language"],
)

AGRICULTURE_DOMAIN_TERMS = {
    "agriculture", "agricultural", "agri", "apmc", "crop", "crops",
    "cultivation", "disease", "diseases", "fertilizer", "fertiliser", "farm",
    "farmer", "farming", "harvest", "harvesting", "irrigation", "kcc", "kisan",
    "kvk", "mandi", "market price", "pest", "pests", "pesticide", "pm kisan",
    "pm-kisan", "pmfby", "rain", "rainfall", "scheme", "schemes", "soil", "spray",
    "spraying", "subsidy", "subsidies", "machinery", "machine", "machines",
    "mechanization", "mechanisation", "equipment", "implements", "smam",
    "weather", "weed", "yojana", "seed", "seeds", "sowing",
    "npk", "urea", "dap", "potash", "yield", "acre", "hectare", "monsoon",
    "tractor", "plough", "plowing", "organic", "compost", "livestock", "cattle",
    "cow", "dairy", "poultry", "goat", "sheep", "fodder", "kharif", "rabi",
    "zaid", "bazaar", "bhav", "dam", "drip", "sprinkler", "borewell", "pump",
    "rotavator", "harvester", "tiller", "power tiller", "thresher", "seeder",
    "fungus", "fungicide", "insect", "insecticide", "worm", "rot", "wilt",
    "blight", "bacterial blight", "rust", "yellow rust", "virus", "mosaic virus",
    "mildew", "powdery mildew", "downy mildew", "mite", "mites", "borer", "stem borer",
    "weevil", "caterpillar", "locust", "thrips", "whitefly", "aphid", "aphids",
    "blast", "bollworm", "leaf curl", "leaf spot", "canker", "scab", "damping off",
    "yellowing", "chilli", "cotton", "groundnut", "maize", "onion", "paddy",
    "potato", "rice", "sugarcane", "tomato", "wheat", "mustard", "pulses",
    "gram", "turmeric", "garlic", "ginger", "banana", "mango", "apple", "papaya",
    "grapes", "guava", "pomegranate", "lemon", "soybean", "sunflower", "jute",
    "tea", "coffee", "cabbage", "brinjal", "cluster beans", "bitter gourd",
    "cauliflower", "ridge gourd", "ladies finger", "lady finger", "watermelon",
    "water melon",
    # Indic language terms (Kannada, Hindi, Telugu, Tamil, Malayalam, Marathi, Gujarati)
    "ಬೆಳೆ", "ಕೃಷಿ", "ರೈತ", "ಬೀಜ", "ಮಣ್ಣು", "ಗೊಬ್ಬರ", "ಕೀಟನಾಶಕ", "ರೋಗ", "ಕೀಟ",
    "ನೀರಾವರಿ", "ಹವಾಮಾನ", "ಮಳೆ", "ಮಾರುಕಟ್ಟೆ", "ಬೆಲೆ", "ಯೋಜನೆ", "ಎಲೆ", "ಮುರುಟು", "ಯಂತ್ರೋಪಕರಣ",
    "ಫಸಲ", "फसल", "खेती", "कृषि", "किसान", "बीज", "मिट्टी", "खाद", "उर्वरक",
    "कीटनाशक", "बीमारी", "रोग", "कीड़ा", "सिंचाई", "मौसम", "बारिश", "मंडी",
    "भाव", "दाम", "योजना", "पत्ता", "पिके", "शेतकरी", "मशीनरी", "यंत्रसामग्री", "పంట", "వ్యవసాయం", "రైతు",
    "విత్తనం", "నేల", "ఎరువు", "పురుగుమందు", "తెగులు", "పురుగు", "నీటిపారుదల",
    "వాతావరణం", "వర్షం", "మార్కెట్", "ధర", "పథకం", "యంత్రాలు", "பயிர்", "விவசாயம்", "உழவர்",
    "விதை", "மண்", "உரம்", "பூச்சிகொல்லி", "நோய்", "பூச்சி", "பாசனம்", "வானிலை",
    "மழை", "சந்தை", "விலை", "திட்டம்", "இயந்திரங்கள்", "വിള", "കൃഷി", "കർഷകൻ", "വിത്ത്", "മണ്ണ്",
    "വളം", "കീടനാശിനി", "രോഗം", "കീടം", "കാലാവസ്ഥ", "മഴ", "മാർക്കറ്റ്", "വില",
    "പദ്ധതി", "യന്ത്രങ്ങൾ", "પાક", "ખેતી", "ખેડૂત", "બિયારણ", "જમીન", "ખાતર", "જંતુનાશક",
    "રોગ", "જીવાત", "સિંચાઈ", "હવામાન", "વરસાદ", "બજાર", "ભાવ", "યોજના", "મશીનરી",
}

OUT_OF_DOMAIN_KEYWORDS = {
    "virat", "kohli", "cricket", "football", "soccer", "actor", "actress",
    "movie", "cinema", "song", "singing", "singer", "music", "president",
    "prime minister", "capital of", "who is", "what is python", "coding",
    "programming", "recipe", "game", "bollywood", "hollywood", "modi",
    "trump", "biden", "dhoni", "rohit", "sharma", "ipl", "match", "score",
    "hero", "heroine", "film", "politics", "election", "crypto", "bitcoin",
}


def is_agriculture_domain_query(
    english_text: str,
    original_text: str,
    agri_entities: dict,
    intent_name: str = "",
) -> tuple[bool, str]:
    norm_english = english_text.lower().strip() if english_text else ""
    norm_original = original_text.lower().strip() if original_text else ""

    if not norm_english and not norm_original:
        return False, "Empty query text"

    combined = f"{norm_english} {norm_original}".strip()

    # 1. Check if explicit non-agricultural keywords are present
    has_out_of_domain = any(keyword in combined for keyword in OUT_OF_DOMAIN_KEYWORDS)

    # 2. Check if agricultural terms exist using word boundaries for ASCII terms
    has_agri_entities = bool(agri_entities)
    has_agri_terms = False
    for term in AGRICULTURE_DOMAIN_TERMS:
        if term.isascii():
            if re.search(r'\b' + re.escape(term) + r'\b', combined):
                has_agri_terms = True
                break
        else:
            if term in combined:
                has_agri_terms = True
                break

    valid_intents = {
        "disease_query", "fertilizer_query", "government_scheme_query",
        "weather_query", "soil_query", "pest_control_query",
        "crop_management_query", "market_price_query", "irrigation_query",
        "seed_query", "harvesting_query", "crop_variety_query",
        "organic_farming_query", "planting_query", "weed_management_query",
        "general_agriculture_query"
    }
    has_agri_intent = intent_name in valid_intents

    # Rejection rule:
    # If explicit out-of-domain keyword is present AND no agri entity/terms exist -> Reject
    if has_out_of_domain and not has_agri_entities and not has_agri_terms:
        return False, "Matched non-agricultural keyword without agricultural context"

    # Acceptance rule:
    if has_agri_entities or has_agri_terms or (has_agri_intent and not has_out_of_domain):
        return True, "Valid agricultural query"

    # Default rule: If no explicit non-agri keywords match, treat as general agriculture query
    if not has_out_of_domain:
        return True, "No non-agricultural keywords detected (defaulting to agriculture domain)"

    return False, "Failed all agricultural domain checks"


def out_of_domain_response() -> str:
    return (
        "I am an AI-powered Agricultural Advisory Assistant. I can only answer "
        "questions related to farming, crops, soil health, pest management, "
        "weather, government schemes, and market prices. Please ask an "
        "agriculture-related question."
    )


def require_authenticated_user(
    authorization: str | None = Header(default=None),
) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        user_id = decode_access_token(authorization.removeprefix("Bearer ").strip())
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error

    db = SessionLocal()
    try:
        if not db.query(User).filter(User.id == user_id).first():
            raise HTTPException(status_code=401, detail="User account not found")
    finally:
        db.close()
    return user_id


def ensure_user_access(authenticated_user_id: int, requested_user_id: int | str):
    try:
        matches = authenticated_user_id == int(requested_user_id)
    except (TypeError, ValueError):
        matches = False
    if not matches:
        raise HTTPException(status_code=403, detail="Access to this farmer account is forbidden")


@app.get("/")
def home():
    return {
        "message": "Farmer Advisory Chatbot API is Running!"
    }

@app.get("/feedback/{user_id}")
def get_feedback(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        entries = (
            db.query(Feedback)
            .filter(Feedback.user_id == user_id)
            .order_by(Feedback.created_at.desc())
            .all()
        )
        return {
            "feedback": [
                {
                    "id": entry.id,
                    "message": entry.message,
                    "category": entry.category,
                    "rating": entry.rating,
                    "created_at": entry.created_at,
                }
                for entry in entries
            ]
        }
    finally:
        db.close()

@app.post("/feedback")
def create_feedback(
    request: FeedbackRequest,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, request.user_id)
    if len(request.message.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Feedback must contain at least 3 characters"
        )
    if not 1 <= request.rating <= 5:
        raise HTTPException(
            status_code=400,
            detail="Rating must be between 1 and 5"
        )
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        entry = Feedback(
            user_id=request.user_id,
            message=request.message.strip(),
            category=request.category,
            rating=request.rating,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return {
            "message": "Feedback saved successfully", "id": entry.id
        }
    finally:
        db.close()

@app.post("/chat/feedback")
def create_response_feedback(
    request: ResponseFeedbackRequest,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, request.user_id)
    db = SessionLocal()
    try:
        message = db.query(ChatMessage).join(
            ChatSession, ChatSession.id == ChatMessage.session_id
        ).filter(
            ChatMessage.id == request.message_id,
            ChatMessage.role == "assistant",
            ChatSession.user_id == request.user_id,
        ).first()
        if not message:
            raise HTTPException(status_code=404, detail="Assistant response not found")
        existing = db.query(ResponseFeedback).filter(
            ResponseFeedback.user_id == request.user_id,
            ResponseFeedback.message_id == request.message_id,
        ).first()
        if existing:
            existing.helpful = request.helpful
        else:
            db.add(ResponseFeedback(
                user_id=request.user_id,
                message_id=request.message_id,
                helpful=request.helpful,
            ))
        db.commit()
        return {"message": "Response feedback saved"}
    finally:
        db.close()

def normalize_city_query(city: str) -> str:
    cleaned = city.strip()
    if not cleaned:
        return cleaned
    if any(ord(char) > 127 for char in cleaned):
        try:
            translated = translate_text(cleaned, "auto", "en-IN").translated_text
            if translated and translated.strip():
                return translated.strip()
        except Exception:
            pass
    return cleaned

@app.get("/weather", dependencies=[Depends(require_authenticated_user)])
def weather(city: str):
    search_city = normalize_city_query(city)
    result = get_weather(search_city)
    if "error" in result:
        raise HTTPException(
            status_code=result.get("status_code", 400),
            detail=result["error"]
        )
    return result

@app.get("/weather/forecast", dependencies=[Depends(require_authenticated_user)])
def weather_forecast(city: str):
    search_city = normalize_city_query(city)
    result = get_forecast(search_city)
    if "error" in result:
        raise HTTPException(
            status_code=result.get("status_code", 400),
            detail=result["error"]
        )
    return result


def translate_batch(
    request: TranslationBatchRequest,
    _user_id: int = Depends(require_authenticated_user),
):
    source_language = get_voice_language_code(request.source_language)
    target_language = get_voice_language_code(request.target_language)
    cache = {}
    translations = []
    degraded = False

    for text in request.texts:
        if text not in cache:
            result = translate_text(text, source_language, target_language)
            cache[text] = result.translated_text
            degraded = degraded or result.used_fallback
        translations.append(cache[text])

    return {
        "translations": translations,
        "source_language": source_language,
        "target_language": target_language,
        "degraded": degraded,
    }


@app.post("/schemes/search")
def search_schemes(
    request: SchemeSearchRequest,
    _user_id: int = Depends(require_authenticated_user),
):
    if not KNOWLEDGE_BASE_READY.is_set():
        raise HTTPException(status_code=503, detail="Knowledge base is still initializing. Please try again shortly.")
    print(f"[SchemesSearch] Request received: query='{request.query}', lang='{request.language}', source_lang='{request.source_language}'")
    target_language = get_voice_language_code(request.language)
    source_language = get_voice_language_code(
        request.source_language or request.language
    )
    english_query = request.query

    if source_language != "en-IN":
        try:
            english_query = translate_text(
                request.query,
                source_language,
                "en-IN",
            ).translated_text
        except Exception as err:
            print(f"[SchemesSearch] Input translation failed: {err}")
            english_query = request.query

    print(f"[SchemesSearch] Search started with query='{english_query}'")
    try:
        answer = scheme_agent(english_query)
        print(f"[SchemesSearch] Search finished. Answer length={len(answer) if answer else 0}")
    except Exception as error:
        print(f"[SchemesSearch] Exception during scheme_agent: {error}")
        raise HTTPException(
            status_code=503,
            detail="Government scheme information is temporarily unavailable.",
        ) from error

    if target_language != "en-IN":
        try:
            answer = translate_text(
                answer,
                "en-IN",
                target_language,
            ).translated_text
        except Exception as err:
            print(f"[SchemesSearch] Output translation failed: {err}")

    print(f"[SchemesSearch] Response returned for query='{request.query}'")
    return {
        "query": request.query,
        "answer": answer,
        "language": target_language,
    }

@app.post("/register")
def register(request: RegisterRequest):
    db = SessionLocal()
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )
    if existing_user:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Email Already Registered"
        )
    new_user = User(
        name=request.name,
        email=request.email,
        password=hash_password(request.password),
        language=request.language
    )
    db.add(new_user)
    db.flush()
    db.add(Notification(
        user_id=new_user.id,
        title="Welcome to AgriAdvisor",
        message="Complete Your Profile to Receive Personalised Weather, Market and Scheme Updates"
    ))
    db.commit()
    db.refresh(new_user)
    db.close()
    return {
        "message": "Registration Successful"
    }

@app.post("/login")
def login(request: LoginRequest):
    db = SessionLocal()
    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )
    if user is None or not verify_password(request.password, user.password):
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )
    if not password_is_hashed(user.password):
        user.password = hash_password(request.password)
        db.commit()

    response = {
        "message": "Login Successful",
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "language": user.language,
            "phone": user.phone,
            "state": user.state,
            "district": user.district,
            "city": user.city
        }
    }
    db.close()
    return response


@app.get("/auth/verify")
def verify_authenticated_session(
    user_id: int = Depends(require_authenticated_user),
):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        return {
            "valid": True,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "language": user.language,
            },
        }
    finally:
        db.close()

@app.get("/profile/{user_id}", response_model=ProfileResponse)
def get_profile(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    user = db.query(User).filter(
        User.id == user_id
    ).first()
    if not user:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="User Not Found"
        )
    response = ProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone or "",
        state=user.state or "",
        district=user.district or "",
        city=user.city or "",
        language=user.language or "English",
        farmer_type=user.farmer_type or "",
        crop=user.crop or "",
        farm_size=user.farm_size or "",
        soil_type=user.soil_type or "",
        farm_name=getattr(user, "farm_name", "") or "",
        farm_size_unit=getattr(user, "farm_size_unit", "Acres") or "Acres",
        irrigation_type=getattr(user, "irrigation_type", "") or "",
        farming_type=getattr(user, "farming_type", "") or getattr(user, "farmer_type", "") or "",
        crop_variety=getattr(user, "crop_variety", "") or "",
        sowing_date=getattr(user, "sowing_date", "") or "",
        expected_harvest_date=getattr(user, "expected_harvest_date", "") or "",
        crop_area=getattr(user, "crop_area", "") or "",
        growth_stage=getattr(user, "growth_stage", "") or ""
    )
    db.close()
    return response

@app.put("/profile/{user_id}")
def update_profile(
    user_id: int,
    request: ProfileUpdateRequest,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    user = db.query(User).filter(
        User.id == user_id
    ).first()
    if not user:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    profile_changed = False
    if request.phone is not None and user.phone != request.phone:
        user.phone = request.phone
        profile_changed = True
    if request.state is not None and user.state != request.state:
        user.state = request.state
        profile_changed = True
    if request.district is not None and user.district != request.district:
        user.district = request.district
        profile_changed = True
    if request.city is not None and user.city != request.city:
        user.city = request.city
        profile_changed = True
    if request.language is not None and user.language != request.language:
        user.language = request.language
    if request.farmer_type is not None and user.farmer_type != request.farmer_type:
        user.farmer_type = request.farmer_type
        profile_changed = True
    if request.crop is not None and user.crop != request.crop:
        user.crop = request.crop
        profile_changed = True
    if request.farm_size is not None and user.farm_size != request.farm_size:
        user.farm_size = request.farm_size
        profile_changed = True
    if request.soil_type is not None and user.soil_type != request.soil_type:
        user.soil_type = request.soil_type
        profile_changed = True
    if hasattr(user, "farm_name") and request.farm_name is not None and user.farm_name != request.farm_name:
        user.farm_name = request.farm_name
        profile_changed = True
    if hasattr(user, "farm_size_unit") and request.farm_size_unit is not None and user.farm_size_unit != request.farm_size_unit:
        user.farm_size_unit = request.farm_size_unit
        profile_changed = True
    if hasattr(user, "irrigation_type") and request.irrigation_type is not None and user.irrigation_type != request.irrigation_type:
        user.irrigation_type = request.irrigation_type
        profile_changed = True
    if hasattr(user, "farming_type") and request.farming_type is not None and user.farming_type != request.farming_type:
        user.farming_type = request.farming_type
        user.farmer_type = request.farming_type
        profile_changed = True
    if hasattr(user, "crop_variety") and request.crop_variety is not None and user.crop_variety != request.crop_variety:
        user.crop_variety = request.crop_variety
        profile_changed = True
    if hasattr(user, "sowing_date") and request.sowing_date is not None and user.sowing_date != request.sowing_date:
        user.sowing_date = request.sowing_date
        profile_changed = True
    if hasattr(user, "expected_harvest_date") and request.expected_harvest_date is not None and user.expected_harvest_date != request.expected_harvest_date:
        user.expected_harvest_date = request.expected_harvest_date
        profile_changed = True
    if hasattr(user, "crop_area") and request.crop_area is not None and user.crop_area != request.crop_area:
        user.crop_area = request.crop_area
        profile_changed = True
    if hasattr(user, "growth_stage") and request.growth_stage is not None and user.growth_stage != request.growth_stage:
        user.growth_stage = request.growth_stage
        profile_changed = True

    if profile_changed:
        db.add(Notification(
            user_id=user.id,
            title="Profile updated",
            message="Your farming profile has been updated successfully."
        ))
    db.commit()
    db.close()
    return {
        "message": "Profile Updated Successfully"
    }

@app.get("/farm/{user_id}", response_model=ProfileResponse)
def get_farm_details(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    return get_profile(user_id=user_id, authenticated_user_id=authenticated_user_id)

@app.put("/farm/{user_id}")
def update_farm_details(
    user_id: int,
    request: ProfileUpdateRequest,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    return update_profile(user_id=user_id, request=request, authenticated_user_id=authenticated_user_id)

@app.get("/profile-status/{user_id}")
def profile_status(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    user = db.query(User).filter(
        User.id == user_id
    ).first()
    if not user:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="User Not Found"
        )
    print("Phone:", user.phone)
    print("State:", user.state)
    print("District:", user.district)
    print("City:", user.city)
    print("Language:", user.language)
    print("Crop:", user.crop)
    completed = all([
        user.phone,
        user.state,
        user.district,
        user.city,
        user.language,
        user.crop
    ])
    db.close()
    return {
        "profile_completed": completed
    }

@app.get("/notifications/{user_id}")
def get_notifications(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        notifications = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(20)
            .all()
        )
        return [
            {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
            }
            for notification in notifications
        ]
    finally:
        db.close()

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    db = SessionLocal()
    try:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == authenticated_user_id,
        ).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        notification.is_read = True
        db.commit()
        return {
            "message": "Notification marked as read"
        }
    finally:
        db.close()

@app.put("/notifications/{user_id}/read-all")
def mark_all_notifications_read(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({Notification.is_read: True}, synchronize_session=False)
        db.commit()
        return {
            "message": "All notifications marked as read"
        }
    finally:
        db.close()

@app.get("/schemes/{user_id}")
def get_schemes(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    if not KNOWLEDGE_BASE_READY.is_set():
        raise HTTPException(status_code=503, detail="Knowledge base is still initializing. Please try again shortly.")
    print(f"[GetSchemes] Request received for user_id={user_id}")
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"[GetSchemes] Exception: User {user_id} not found")
            raise HTTPException(
                status_code=404,
                detail="User Not Found"
            )
        if not user.state and not user.crop:
            return {
                "count": 0,
                "schemes": [],
                "available": False,
                "message": "Please set your location and primary crop in Profile settings to view relevant government schemes."
            }

        details_parts = []
        if user.state:
            details_parts.append(f"State: {user.state}")
        if user.crop:
            details_parts.append(f"Crop: {user.crop}")
        if user.farmer_type:
            details_parts.append(f"Farmer Type: {user.farmer_type}")
        if user.farm_size:
            details_parts.append(f"Farm Size: {user.farm_size}")

        query = f"""
Government schemes for farmers.

Farmer Details:
{chr(10).join(details_parts) if details_parts else "General farming schemes in India"}

Return only the most relevant government scheme names.
One scheme per line.
No explanation.
"""
        print(f"[GetSchemes] Search started for user {user_id}")
        try:
            answer = scheme_titles_agent(query)
        except Exception as error:
            print(f"Scheme search unavailable: {error}")
            return {"count": 0, "schemes": [], "available": False}
        scheme_list = []
        for line in answer.split("\n"):
            line = line.strip()
            if line:
                scheme_list.append({
                    "title": line
                })
        return {
            "count": len(scheme_list),
            "schemes": scheme_list
        }
    finally:
        db.close()

@app.post("/chat/session")
def create_chat_session(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    print(f"[CreateChatSession] Request received for user_id={user_id} (authenticated as {authenticated_user_id})")
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        session = ChatSession(
            user_id=user_id,
            title="New Chat"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        print(f"[CreateChatSession] Session created successfully with session_id={session.id}")
        return {
            "session_id": session.id
        }
    except Exception as error:
        print(f"[CreateChatSession] Error creating session for user_id={user_id}: {error}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create chat session"
        ) from error
    finally:
        db.close()

@app.get("/chat/sessions/{user_id}")
def get_user_chat_sessions(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        sessions = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
            .all()
        )
        return [
            {
                "id": session.id,
                "title": session.title or "New Chat",
                "created_at": session.created_at.isoformat() if session.created_at else "",
                "updated_at": session.updated_at.isoformat() if session.updated_at else "",
            }
            for session in sessions
        ]
    finally:
        db.close()

@app.get("/chat/session/{session_id}/messages")
def get_session_messages(
    session_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    db = SessionLocal()
    try:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == authenticated_user_id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
            .all()
        )
        return {
            "session_id": session.id,
            "title": session.title,
            "messages": [
                {
                    "id": msg.id,
                    "type": "user" if msg.role == "user" else "ai",
                    "text": msg.message,
                    "created_at": msg.created_at.isoformat() if msg.created_at else "",
                }
                for msg in messages
            ],
        }
    finally:
        db.close()

@app.delete("/chat/session/{session_id}")
def delete_chat_session(
    session_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    db = SessionLocal()
    try:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == authenticated_user_id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete(synchronize_session=False)
        db.delete(session)
        db.commit()
        return {"message": "Session deleted successfully"}
    finally:
        db.close()

@app.post("/speech-to-text", dependencies=[Depends(require_authenticated_user)])
async def transcribe_speech(
    file: UploadFile = File(...),
    language: str = Form("unknown"),
):
    language_code = (
        "unknown"
        if language == "unknown"
        else get_voice_language_code(language, default="unknown")
    )

    allowed_content_types = {
        "audio/webm",
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/ogg",
        "audio/m4a",
        "audio/x-m4a",
        "audio/aac",
    }

    normalized_content_type = (file.content_type or "").split(";", 1)[0].lower()

    if normalized_content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {file.content_type}",
        )

    audio_bytes = await file.read()

    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty.",
        )

    filename = file.filename or "recording.webm"
    content_type = normalized_content_type or "audio/webm"

    # First try Sarvam STT
    result = speech_to_text(
        audio_bytes=audio_bytes,
        filename=filename,
        content_type=content_type,
        language_code=language_code,
    )

    # If Sarvam fails, use local Whisper
    if not result.get("success"):
        print("Sarvam STT failed:", result.get("error"))
        print("Using local Whisper fallback...")

        result = whisper_speech_to_text(
            audio_bytes=audio_bytes,
            filename=filename,
            language_code=language_code,
        )

    # If both Sarvam and Whisper fail
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get(
                "error",
                "Unable to convert speech to text.",
            ),
        )

    return result

@app.post("/chat")
def chat(
    request: ChatRequest,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    if not KNOWLEDGE_BASE_READY.is_set():
        raise HTTPException(status_code=503, detail="Knowledge base is still initializing. Please try again shortly.")
    ensure_user_access(authenticated_user_id, request.user_id)
    db = SessionLocal()
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == request.session_id,
            ChatSession.user_id == authenticated_user_id,
        )
        .first()
    )
    if session is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Session Not Found"
        )
    user_message = request.message
    translated_text = user_message or ""
    if session.title == "New Chat" or not session.title:
        session.title = user_message[:45] + ("..." if len(user_message) > 45 else "")
    session.updated_at = datetime.utcnow()
    db.commit()
    processing_message = user_message
    recent_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
        .all()
    )
    previous_user_message = next(
        (
            message
            for message in recent_messages
            if message.role == "user"
        ),
        None,
    )
    conversation_context = "\n".join(
        f"{message.role.title()}: {message.message}"
        for message in reversed(recent_messages)
    )
    is_contextual_follow_up = (
        previous_user_message is not None
        and len(user_message.split()) <= 15
        and (
            user_message.lower().strip().startswith(
                (
                    "what about",
                    "how about",
                    "can i",
                    "should i",
                    "how much",
                    "when should",
                    "why",
                    "and ",
                    "also ",
                )
            )
            or any(term in user_message.lower() for term in ("rain", "weather", "tomorrow", "ಮಳೆ", "ಹವಾಮಾನ", "ನಾಳೆ", "ತಾಪಮಾನ", "ಗೋಧಿ", "ಬೆಳೆ"))
            or any(term in (translated_text or "").lower() for term in ("rain", "weather", "tomorrow", "forecast", "temperature"))
        )
    )
    previous_user_message_from_query = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.session_id == session.id,
            ChatMessage.role == "user",
        )
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    is_short_location_reply = (
        len(user_message.split()) <= 4
        and bool(re.fullmatch(r"[A-Za-z .-]+", user_message.strip()))
    )
    if (
        is_short_location_reply
        and previous_user_message_from_query
        and any(
            term in previous_user_message_from_query.message.lower()
            for term in ("weather", "forecast", "harvest", "rain", "price")
        )
    ):
        processing_message = (
            f"{previous_user_message_from_query.message}\n"
            f"Location: {user_message.strip()}"
        )
    elif is_contextual_follow_up:
        processing_message = (
            f"{previous_user_message.message}\n"
            f"Follow-up question: {user_message.strip()}"
        )

    requested_language = (request.language or "").strip().lower()
    detected_input_language = detect_language(user_message)
    # A non-Latin script is unambiguous for these languages. Prefer the
    # language that the farmer actually typed over a stale browser preference.
    # Hindi and Marathi share Devanagari, so retain an explicit Marathi choice.
    if detected_input_language in {"kn", "te", "ta", "ml", "gu"}:
        language = detected_input_language
    elif detected_input_language == "hi" and requested_language == "mr":
        language = "mr"
    else:
        language = requested_language or detected_input_language
    print("User Query:", user_message.encode("ascii", errors="replace").decode("ascii"))
    print("Selected Language:", language)
    lang_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "kn": "kn-IN",
        "ta": "ta-IN",
        "te": "te-IN",
        "ml": "ml-IN",
        "mr": "mr-IN",
        "gu": "gu-IN",
        "bn": "bn-IN",
        "pa": "pa-IN",
        "or": "od-IN",
        "as": "as-IN",
        "ur": "ur-IN",
        "ne": "ne-IN"
    }
    translated_text = processing_message or ""
    source_language = lang_map.get(language, "en-IN")
    if source_language != "en-IN":
        try:
            result = translate_text(
                processing_message,
                source_language,
                "en-IN"
            )
            if result and result.translated_text:
                translated_text = result.translated_text
        except Exception as error:
            print("Translation to English failed in /chat:", error)
            translated_text = processing_message

    translated_text = translated_text or ""
    intent_result = classify_intent(translated_text)
    if intent_result["intent"] == "government_scheme_query":
        entities = []
    else:
        entities = extract_entities(translated_text)
    agri_entities = extract_agri_entities(translated_text)
    is_agri, rejection_reason = is_agriculture_domain_query(
        translated_text,
        user_message,
        agri_entities,
        intent_result.get("intent", ""),
    )

    print("Original Query:", user_message)
    print("Translated Query:", translated_text)
    print(f"Detected Intent: {intent_result['intent']} (score: {intent_result.get('score', 0.0)})")
    print("Domain Classification:", "Agriculture" if is_agri else "Out of Domain")
    print("Reason for rejection:", rejection_reason if not is_agri else "None")

    if not is_agri:
        response_text = out_of_domain_response()
        target_language = lang_map.get(language, "en-IN")
        translated_response = response_text
        if target_language != "en-IN":
            try:
                res = translate_text(
                    response_text,
                    "en-IN",
                    target_language,
                )
                if res and res.translated_text:
                    translated_response = res.translated_text
            except Exception as error:
                print("Out-of-domain response translation failed:", error)
                translated_response = response_text
        user_id_int = int(request.user_id) if str(request.user_id).isdigit() else None
        user_chat = ChatMessage(
            session_id=session.id,
            role="user",
            intent="out_of_domain",
            message=user_message
        )
        db.add(user_chat)
        assistant_chat = ChatMessage(
            session_id=session.id,
            role="assistant",
            intent="out_of_domain",
            message=translated_response
        )
        db.add(assistant_chat)
        db.flush()
        assistant_message_id = assistant_chat.id
        session_payload = {
            "id": session.id,
            "user_id": session.user_id,
            "title": session.title,
        }
        db.add(UnansweredQuery(
            user_id=user_id_int,
            session_id=session.id,
            query=user_message,
            response=translated_response,
        ))
        db.commit()
        db.close()
        return {
            "user_id": str(request.user_id),
            "message": str(user_message),
            "detected_language": str(language),
            "translated_text": str(translated_text),
            "intent": "out_of_domain",
            "confidence_score": 1.0,
            "entities": entities,
            "agricultural_entities": agri_entities,
            "english_response": response_text,
            "response_in_user_language": translated_response,
            "audio_file": None,
            "session": session_payload,
            "response_quality": calculate_response_quality(1.0, response_text),
            "assistant_message_id": assistant_message_id,
        }
    user_id_int = int(request.user_id) if str(request.user_id).isdigit() else None
    user = db.query(User).filter(User.id == user_id_int).first() if user_id_int else None
    market_state = None
    market_district = None
    locs = []
    for entity in entities:
        if entity["entity_group"] == "LOC":
            locs.append(entity["word"].replace(".", "").strip())
    if len(locs) >= 2:
        market_district = locs[0]
        market_state = locs[1]
    elif len(locs) == 1:
        market_district = locs[0]
    query_lower = translated_text.lower()
    is_compound_scheme_query = (
        intent_result["intent"] == "government_scheme_query"
        and any(
            term in query_lower
            for term in (
                "disease", "spots", "leaves", "fungicide", "pesticide",
                "pest", "crop", "paddy", "rice", "wheat", "maize",
                "cotton", "irrigation", "fertilizer",
            )
        )
    )

    wants_weather = any(
        term in query_lower
        for term in ("weather", "forecast", "rain", "temperature", "humidity")
    )
    wants_market = any(
        term in query_lower
        for term in ("market price", "price", "mandi", "sell")
    )
    wants_harvest = "harvest" in query_lower
    wants_crop_action = any(
        term in query_lower
        for term in ("spray", "disease", "fungicide", "pesticide")
    )
    is_live_compound_query = wants_weather and (
        wants_market or wants_harvest or wants_crop_action
    )

    location_match = re.search(
        r"Location:\s*([A-Za-z .-]+)",
        translated_text,
        flags=re.IGNORECASE,
    )
    weather_location_aliases = {
        "uttarakannada": "Karwar",
        "uttara kannada": "Karwar",
        "bangalore": "Bengaluru",
        "mysore": "Mysuru",
        "bagalkot": "Bagalkot",
        "bagalkote": "Bagalkot",
        "ಬಾಗಲಕೋಟೆ": "Bagalkot",
        "ಬಾಗಲಕೋಟೆಯ": "Bagalkot",
        "ಬೆಂಗಳೂರು": "Bengaluru",
        "ಮೈಸೂರು": "Mysuru",
        "ಬೆಳಗಾವಿ": "Belagavi",
        "ಧಾರವಾಡ": "Dharwad",
        "ಹುಬ್ಬಳ್ಳಿ": "Hubli",
        "ಕಲಬುರಗಿ": "Kalaburagi",
        "ಕೋಲಾರ": "Kolar",
        "ಮಂಡ್ಯ": "Mandya",
        "ಹಾಸನ": "Hassan",
        "ಉಡುಪಿ": "Udupi",
        "ಮಂಗಳೂರು": "Mangalore",
        "ಶಿವಮೊಗ್ಗ": "Shivamogga",
        "ದಾವಣಗೆರೆ": "Davanagere",
        "ಚಿತ್ರದುರ್ಗ": "Chitradurga",
        "ರಾಯಚೂರು": "Raichur",
        "ಬಳ್ಳಾರಿ": "Ballari",
        "ಕೊಪ್ಪಳ": "Koppal",
        "ಯಾದಗಿರಿ": "Yadgir",
    }

    # Extract location from query text, recent conversation history, or fallback to user default
    found_city = None
    for alias_key, canonical_city in weather_location_aliases.items():
        if alias_key in user_message.lower() or alias_key in translated_text.lower():
            found_city = canonical_city
            break

    # Look up location mentioned in previous chat turns for contextual follow-ups
    previous_location = None
    if not found_city and recent_messages:
        for msg in recent_messages:
            msg_text_lower = msg.message.lower()
            for alias_key, canonical_city in weather_location_aliases.items():
                if alias_key in msg_text_lower:
                    previous_location = canonical_city
                    break
            if previous_location:
                break

    requested_location = (
        found_city
        or previous_location
        or (location_match.group(1).strip() if location_match else (user.city or user.district if user else None))
    )
    if requested_location:
        requested_location = weather_location_aliases.get(
            requested_location.lower(),
            requested_location,
        )

    comparison_locations = []
    response_is_localized = False
    for aliases, canonical in (
        (("bangalore", "bengaluru"), "Bangalore"),
        (("mysore", "mysuru"), "Mysore"),
    ):
        if any(alias in query_lower for alias in aliases):
            comparison_locations.append(canonical)

    if wants_market and len(comparison_locations) >= 2:
        commodity = agri_entities.get("crop") or "Tomato"
        market_results = []
        for district in comparison_locations:
            try:
                price = get_market_price(
                    commodity=commodity,
                    state=(user.state if user and user.state else None),
                    district=district,
                )
                market_results.append(price)
            except Exception as error:
                print(f"Market comparison unavailable for {district}: {error}")

        if len(market_results) == 2:
            first, second = market_results
            better = first if first.modal_price >= second.modal_price else second
            other = second if better is first else first
            difference = better.modal_price - other.modal_price
            response_text = (
                f"{first.market}, {first.district}: modal price "
                f"₹{first.modal_price:.0f} per quintal on {first.arrival_date}. "
                f"{second.market}, {second.district}: modal price "
                f"₹{second.modal_price:.0f} per quintal on {second.arrival_date}. "
                f"{better.market} has the higher reported modal price by "
                f"₹{difference:.0f} per quintal. Sell there only if that "
                "difference exceeds transport, commission, and spoilage costs."
            )
        else:
            response_text = (
                "I could not retrieve comparable current tomato records for "
                "both Bangalore and Mysore from the live market feed. I cannot "
                "safely recommend a market without same-date prices. Please "
                "check both APMC quotes and subtract transport, commission, and "
                "spoilage costs before choosing."
            )
    elif is_live_compound_query and requested_location:
        live_context_parts = []
        current_weather = get_weather(requested_location)
        forecast_data = get_forecast(requested_location)
        if "error" not in current_weather:
            live_context_parts.append(
                "Current weather for {city}: {weather}, {temperature}°C, "
                "humidity {humidity}%, wind {wind_speed} m/s.".format(
                    **current_weather
                )
            )
        else:
            live_context_parts.append(
                f"Current weather unavailable: {current_weather['error']}."
            )
        if "error" not in forecast_data:
            forecast_lines = [
                (
                    f"{item['date']}: {item['weather']}, "
                    f"{item['temperature']}°C, humidity {item['humidity']}%."
                )
                for item in forecast_data["forecast"][:3]
            ]
            live_context_parts.append(
                "Three-day forecast for "
                f"{forecast_data['city']}: {' '.join(forecast_lines)}"
            )
        else:
            live_context_parts.append(
                f"Forecast unavailable: {forecast_data['error']}."
            )

        if wants_market:
            commodity = agri_entities.get("crop") or (user.crop if user else None)
            if commodity:
                try:
                    price = get_market_price(
                        commodity=commodity,
                        state=(user.state if user and user.state else None),
                        district=requested_location,
                    )
                    live_context_parts.append(
                        f"Market price for {price.commodity} at {price.market}: "
                        f"minimum ₹{price.min_price:.0f}, maximum "
                        f"₹{price.max_price:.0f}, modal ₹{price.modal_price:.0f} "
                        f"per quintal on {price.arrival_date}."
                    )
                except Exception as error:
                    print(f"Market data unavailable: {error}")
                    live_context_parts.append(
                        "Today's requested crop price is unavailable from the "
                        "live market feed; do not invent a price."
                    )

        response_text = generate_response(
            translated_text,
            supplemental_context="\n".join(
                part for part in (
                    (
                        "Recent conversation:\n" + conversation_context
                        if conversation_context
                        else ""
                    ),
                    "\n".join(live_context_parts),
                )
                if part
            ),
        )
    elif is_live_compound_query:
        response_text = (
            "Please tell me the city or district so I can combine its live "
            "weather forecast with the crop and market advice."
        )
    elif is_compound_scheme_query:
        response_text = generate_response(
            translated_text,
            supplemental_context=(
                "Recent conversation:\n" + conversation_context
                if conversation_context
                else ""
            ),
        )
    elif intent_result["intent"] == "weather_query":
        city = None
        for entity in entities:
            if entity["entity_group"] == "LOC":
                city = entity["word"].replace(".", "").strip()
                break
        if city is None and requested_location:
            city = requested_location
        if city is None:
            response_text = "Please tell me the city name to get the weather information."
        else:
            weather = get_weather(city)
            if "error" in weather:
                response_text = weather["error"]
            else:
                is_specific_weather_question = (
                    is_contextual_follow_up
                    or any(
                        term in translated_text.lower()
                        for term in ("rain", "tomorrow", "forecast", "will it", "should i", "can i", "spray", "harvest", "hot", "cold", "humidity")
                    )
                )
                if is_specific_weather_question:
                    live_weather_info = (
                        f"Current Live Weather Data for {city}:\n"
                        f"- Temperature: {weather.get('temperature')}°C\n"
                        f"- Humidity: {weather.get('humidity')}%\n"
                        f"- Condition: {weather.get('description')}\n"
                        f"- Wind Speed: {weather.get('wind_speed')} m/s\n"
                    )
                    response_text = generate_response(
                        translated_text,
                        supplemental_context=(
                            f"{live_weather_info}\n"
                            f"Recent Conversation History:\n{conversation_context}"
                        ),
                    )
                else:
                    response_text = format_current_weather(weather, language)
                    response_is_localized = language != "en"
    else:
        if intent_result["intent"] == "market_price_query":
            response_text = route_query(
                intent=intent_result["intent"],
                commodity=agri_entities.get("crop") or (user.crop if user else None),
                state=(
                    market_state
                    or (user.state if user and user.state else None)
                ),
                district=(
                    market_district
                    or (user.district if user else None)
                )
            )
        else:
            # All non-live farming topics share one grounded RAG path. This
            # avoids losing secondary intents and makes ordinary follow-ups
            # work across crops, pests, soil, irrigation, schemes, and harvest.
            response_text = generate_response(
                translated_text,
                supplemental_context=(
                    "Recent conversation:\n" + conversation_context
                    if conversation_context
                    else ""
                ),
            )
    english_response = response_text
    translated_response = response_text
    target_language = lang_map.get(language, "en-IN")
    if target_language != "en-IN" and not response_is_localized:
        try:
            result = translate_text(
                response_text,
                "en-IN",
                target_language
            )
            if result and result.translated_text:
                translated_response = result.translated_text
        except Exception as error:
            print("Response translation failed:", error)
            translated_response = response_text
    user_chat = ChatMessage(
        session_id=session.id,
        role="user",
        intent=str(intent_result["intent"]),
        message=user_message
    )
    db.add(user_chat)
    assistant_chat = ChatMessage(
        session_id=session.id,
        role="assistant",
        intent=str(intent_result["intent"]),
        message=translated_response
    )
    db.add(assistant_chat)
    db.flush()
    assistant_message_id = assistant_chat.id
    session_payload = {
        "id": session.id,
        "user_id": session.user_id,
        "title": session.title,
    }
    if any(
        marker in translated_response.lower()
        for marker in (
            "could not find",
            "do not have enough",
            "don't have enough",
            "unavailable",
            "unable to",
        )
    ):
        db.add(UnansweredQuery(
            user_id=user_id_int,
            session_id=session.id,
            query=user_message,
            response=translated_response,
        ))
    db.commit()
    db.close()
    print("Bot Response:", translated_response.encode("ascii", errors="replace").decode("ascii"))
    # Voice is requested through /speak after the text is rendered. Generating
    # audio here too used twice the TTS quota and could overwrite another
    # farmer's audio during concurrent chats.
    tts_result = {"audio_file": None}
    quality_result = calculate_response_quality(
        intent_result["score"],
        english_response
    )
    print("Response Quality:", quality_result)
    return {
        "user_id": str(request.user_id),
        "message": str(user_message),
        "detected_language": str(language),
        "translated_text": str(translated_text),
        "intent": str(intent_result["intent"]),
        "confidence_score": float(intent_result["score"]),
        "entities": entities,
        "agricultural_entities": agri_entities,
        "english_response": str(english_response),
        "response_in_user_language": str(translated_response),
        "audio_file": tts_result.get("audio_file"),
        # Do not return the SQLAlchemy instance after its database session has
        # been committed and closed. Serializing an expired/detached model can
        # raise a 500 after the answer has already been generated and saved.
        "session": session_payload,
        "response_quality": quality_result,
        "assistant_message_id": assistant_message_id,
    }

@app.post("/speak", dependencies=[Depends(require_authenticated_user)])
def speak(request: SpeakRequest):
    if request.language not in VOICE_LANGUAGE_CODES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported voice language. Choose one of: "
                + ", ".join(VOICE_LANGUAGE_CODES)
            ),
        )
    target_language = get_voice_language_code(request.language)
    result = text_to_speech(
        request.text,
        target_language
    )
    if "error" in result:
        raise HTTPException(
            status_code=500,
            detail=result["error"]
        )
    return FileResponse(
        result["audio_file"],
        media_type=result.get("media_type", "audio/wav"),
        filename=result.get("filename", "speech.wav"),
        headers={
            "X-Voice-Engine": result.get("engine", "sarvam"),
            "X-Voice-Language": target_language,
        },
        background=BackgroundTask(
            Path(result["audio_file"]).unlink,
            missing_ok=True,
        ),
    )

@app.post("/market-price", dependencies=[Depends(require_authenticated_user)])
def market_price(request: MarketRequest):
    try:
        response = get_market_price(
            commodity=request.commodity,
            state=request.state,
            district=request.district
        )
        return {
            "available": True,
            "commodity": response.commodity,
            "state": response.state,
            "district": response.district,
            "market": response.market,
            "min_price": response.min_price,
            "max_price": response.max_price,
            "modal_price": response.modal_price,
            "arrival_date": response.arrival_date
        }
    except Exception as error:
        # Agmarknet may have no record for a valid crop/location/date.  This
        # is not a client error and should be rendered as an empty result.
        print(f"Market price unavailable: {error}")
        return {
            "available": False,
            "commodity": request.commodity,
            "state": request.state,
            "district": request.district,
            "market": None,
            "min_price": None,
            "max_price": None,
            "modal_price": None,
            "arrival_date": None,
        }

@app.get("/market-options", dependencies=[Depends(require_authenticated_user)])
def market_options():
    try:
        return {
            "live": True,
            "options": get_market_options(),
            "message": None,
        }
    except MarketServiceUnavailable as error:
        print(f"Market options fallback active: {error}")
        return {
            "live": False,
            "options": get_fallback_market_options(),
            "message": (
                "Live AGMARKNET selections are temporarily unavailable. "
                "Showing common Karnataka crops and districts."
            ),
        }

from services.disease_detection import analyze_crop_disease_image

@app.post("/disease-detection", dependencies=[Depends(require_authenticated_user)])
async def detect_crop_disease(
    file: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
):
    try:
        content_type = file.content_type or "image/jpeg"
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")
        
        result = analyze_crop_disease_image(
            image_bytes=image_bytes,
            content_type=content_type,
            crop_name=crop or "",
        )

        if user_id:
            db = SessionLocal()
            try:
                session = (
                    db.query(ChatSession)
                    .filter(ChatSession.user_id == user_id)
                    .order_by(ChatSession.updated_at.desc())
                    .first()
                )
                if not session:
                    session = ChatSession(user_id=user_id, title="Disease Detection")
                    db.add(session)
                    db.commit()
                    db.refresh(session)
                
                activity_msg = f"{result['crop']} - {result['disease']}"
                user_msg = ChatMessage(
                    session_id=session.id,
                    role="user",
                    intent="disease_query",
                    message=f"Crop Disease Detection: {activity_msg}"
                )
                db.add(user_msg)
                db.commit()
            except Exception as err:
                print("Failed to record disease detection activity:", err)
            finally:
                db.close()

        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as error:
        print("Disease detection error:", error)
        raise HTTPException(
            status_code=500,
            detail="Unable to analyze this image. Please upload a clear image of the crop leaf."
        ) from error

@app.get("/recent-activity/{user_id}")
def get_chat_activity(
    user_id: int,
    limit: int = 20,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        sessions = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .all()
        )
        if not sessions:
            return {"count": 0, "activities": []}
        query = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.session_id.in_(
                    select(ChatSession.id).where(ChatSession.user_id == user_id)
                ),
                ChatMessage.role == "user"
            )
        )
        total = query.count()
        messages = (
            query.order_by(ChatMessage.created_at.desc())
            .limit(max(1, min(limit, 100)))
            .all()
        )
        return {
            "count": total,
            "activities": [
                {
                    "id": message.id,
                    "message": message.message,
                    "type": message.intent,
                    "created_at": message.created_at.isoformat() + "Z",
                }
                for message in messages
            ],
        }
    finally:
        db.close()

@app.get("/admin/analytics", dependencies=[Depends(require_admin_key)])
def admin_analytics():
    db = SessionLocal()
    try:
        helpful = db.query(ResponseFeedback).filter(
            ResponseFeedback.helpful == True
        ).count()
        unhelpful = db.query(ResponseFeedback).filter(
            ResponseFeedback.helpful == False
        ).count()
        return {
            "users": db.query(User).count(),
            "sessions": db.query(ChatSession).count(),
            "messages": db.query(ChatMessage).count(),
            "unanswered_queries": db.query(UnansweredQuery).count(),
            "response_feedback": {
                "helpful": helpful,
                "unhelpful": unhelpful,
                "satisfaction_percent": round(
                    helpful * 100 / max(helpful + unhelpful, 1),
                    1,
                ),
            },
        }
    finally:
        db.close()

@app.get("/admin/unanswered", dependencies=[Depends(require_admin_key)])
def admin_unanswered(limit: int = 100):
    db = SessionLocal()
    try:
        rows = (
            db.query(UnansweredQuery)
            .order_by(UnansweredQuery.created_at.desc())
            .limit(max(1, min(limit, 500)))
            .all()
        )
        return [
            {
                "id": row.id,
                "query": row.query,
                "response": row.response,
                "created_at": row.created_at.isoformat() + "Z",
            }
            for row in rows
        ]
    finally:
        db.close()

@app.get("/admin/knowledge-base", dependencies=[Depends(require_admin_key)])
def admin_knowledge_base():
    return [
        {
            "name": path.name,
            "folder": str(path.parent.relative_to(KNOWLEDGE_BASE_PATH)),
            "size_bytes": path.stat().st_size,
        }
        for path in sorted(Path(KNOWLEDGE_BASE_PATH).rglob("*.pdf"))
    ]

@app.post("/admin/knowledge-base/upload", dependencies=[Depends(require_admin_key)])
async def admin_upload_knowledge(
    file: UploadFile = File(...),
    folder: str = Form("Admin_Uploads"),
):
    filename = Path(file.filename or "").name
    safe_folder = re.sub(r"[^A-Za-z0-9_-]", "_", folder).strip("_")
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    if not safe_folder:
        raise HTTPException(status_code=400, detail="Invalid folder name")
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF must be 25 MB or smaller")
    destination_dir = Path(KNOWLEDGE_BASE_PATH) / safe_folder
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / filename
    if destination.exists():
        raise HTTPException(
            status_code=409,
            detail="A PDF with this name already exists in that folder.",
        )
    destination.write_bytes(content)
    return {
        "message": "PDF uploaded. Rebuild the knowledge index to use it.",
        "filename": filename,
    }

@app.post("/admin/knowledge-base/rebuild", dependencies=[Depends(require_admin_key)])
def admin_rebuild_knowledge():
    rebuild_vector_database(replace_existing=True)
    return {"message": "Knowledge-base index rebuilt"}

# ==========================================
# Privacy & Data Controls Routes
# ==========================================

@app.delete("/chat/sessions/{user_id}")
def clear_all_chat_sessions(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        session_ids = [
            s.id for s in db.query(ChatSession.id).filter(ChatSession.user_id == user_id).all()
        ]
        if session_ids:
            db.query(ChatMessage).filter(ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ResponseFeedback).filter(ResponseFeedback.user_id == user_id).delete(synchronize_session=False)
            db.query(UnansweredQuery).filter(UnansweredQuery.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ChatSession).filter(ChatSession.user_id == user_id).delete(synchronize_session=False)
            db.commit()
        return {"message": "Chat history cleared successfully."}
    finally:
        db.close()


@app.delete("/recent-activity/{user_id}")
def clear_recent_activity(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        session_ids = [
            s.id for s in db.query(ChatSession.id).filter(ChatSession.user_id == user_id).all()
        ]
        if session_ids:
            db.query(ChatMessage).filter(ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ResponseFeedback).filter(ResponseFeedback.user_id == user_id).delete(synchronize_session=False)
            db.query(UnansweredQuery).filter(UnansweredQuery.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ChatSession).filter(ChatSession.user_id == user_id).delete(synchronize_session=False)
            db.commit()
        return {"message": "Activity history cleared successfully."}
    finally:
        db.close()


@app.get("/user/export-data/{user_id}")
def export_user_data(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Profile & Farm info (No password, token, or secret)
        profile_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone or "",
            "language": user.language or "English",
            "state": user.state or "",
            "district": user.district or "",
            "city": user.city or "",
            "farmer_type": user.farmer_type or "",
            "crop": user.crop or "",
            "farm_size": user.farm_size or "",
            "soil_type": user.soil_type or "",
            "farm_name": user.farm_name or "",
            "farm_size_unit": user.farm_size_unit or "Acres",
            "irrigation_type": user.irrigation_type or "",
            "farming_type": user.farming_type or "",
            "crop_variety": user.crop_variety or "",
            "sowing_date": user.sowing_date or "",
            "expected_harvest_date": user.expected_harvest_date or "",
            "crop_area": user.crop_area or "",
            "growth_stage": user.growth_stage or "",
        }

        # Activity summary
        chat_sessions_count = db.query(ChatSession).filter(ChatSession.user_id == user_id).count()
        feedbacks = [
            {
                "category": f.category,
                "rating": f.rating,
                "created_at": f.created_at.isoformat() if f.created_at else "",
            }
            for f in db.query(Feedback).filter(Feedback.user_id == user_id).all()
        ]

        recent_activities = [
            {
                "id": m.id,
                "message": m.message,
                "intent": m.intent,
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in db.query(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .filter(ChatSession.user_id == user_id, ChatMessage.role == "user")
            .order_by(ChatMessage.created_at.desc())
            .limit(50)
            .all()
        ]

        return {
            "app_name": "AgriAdvisor",
            "export_date": datetime.utcnow().isoformat() + "Z",
            "profile": profile_data,
            "activity_summary": {
                "total_chat_sessions": chat_sessions_count,
                "feedbacks_submitted": len(feedbacks),
                "recent_queries": recent_activities,
            },
            "feedback_history": feedbacks,
        }
    finally:
        db.close()


@app.delete("/user/account/{user_id}")
def delete_user_account(
    user_id: int,
    authenticated_user_id: int = Depends(require_authenticated_user),
):
    ensure_user_access(authenticated_user_id, user_id)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Delete all user related records
        session_ids = [
            s.id for s in db.query(ChatSession.id).filter(ChatSession.user_id == user_id).all()
        ]
        if session_ids:
            db.query(ChatMessage).filter(ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ResponseFeedback).filter(ResponseFeedback.user_id == user_id).delete(synchronize_session=False)
            db.query(UnansweredQuery).filter(UnansweredQuery.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ChatSession).filter(ChatSession.user_id == user_id).delete(synchronize_session=False)

        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
        db.query(Feedback).filter(Feedback.user_id == user_id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
        db.commit()

        return {"message": "Account deleted successfully."}
    finally:
        db.close()

Base.metadata.create_all(bind=engine)
