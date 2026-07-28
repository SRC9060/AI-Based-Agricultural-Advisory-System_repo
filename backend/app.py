import os
import re
from pathlib import Path
# os.environ["HF_HUB_OFFLINE"] = "1"
# os.environ["TRANSFORMERS_OFFLINE"] = "1"

from services.knowledge_base import (
    CHROMA_DB_PATH,
    KNOWLEDGE_BASE_PATH,
    rebuild_vector_database,
)
if os.path.exists(CHROMA_DB_PATH):
    print("Using Existing Vector Database")
else:
    print("No Vector Database Found, Building...")
    rebuild_vector_database()

from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from services.language_detection import detect_language
from services.translation import translate_text
from services.text_to_speech import text_to_speech
from services.intent_classifier import classify_intent
from services.ner import extract_entities
from services.rag_pipeline import generate_response
from services.weather_service import get_weather, get_forecast
from services.agri_entities import extract_agri_entities
from services.router import route_query
from services.response_quality import calculate_response_quality
from services.agmarknet import get_market_price
from services.agmarknet import get_market_options
from services.agents.scheme_agent import scheme_titles_agent
from services.speech_to_text import (
    speech_to_text,
    whisper_speech_to_text,
)
from services.security import enforce_rate_limit, require_admin_key
from config import Config

from database import SessionLocal, engine
from models import *

app = FastAPI()
app.middleware("http")(enforce_rate_limit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Farmer Advisory Chatbot API is Running!"
    }

@app.get("/feedback/{user_id}")
def get_feedback(user_id: int):
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
def create_feedback(request: FeedbackRequest):
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
def create_response_feedback(request: ResponseFeedbackRequest):
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

@app.get("/weather")
def weather(city: str):
    result = get_weather(city)
    if "error" in result:
        raise HTTPException(
            status_code=400,
            detail=result["error"]
        )
    return result

@app.get("/weather/forecast")
def weather_forecast(city: str):
    result = get_forecast(city)
    if "error" in result:
        raise HTTPException(
            status_code=400,
            detail=result["error"]
        )
    return result

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
        password=request.password,
        language=request.language
    )
    db.add(new_user)
    db.flush()
    db.add(Notification(
        user_id=new_user.id,
        title="Welcome to AgriAdvisor",
        message="Complete your profile to receive personalised weather, market and scheme updates."
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
    if user is None or user.password != request.password:
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )
    response = {
        "message": "Login Successful",
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

@app.get("/profile/{user_id}", response_model=ProfileResponse)
def get_profile(user_id: int):
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
        phone=user.phone,
        state=user.state,
        district=user.district,
        city=user.city,
        language=user.language,
        farmer_type=user.farmer_type,
        crop=user.crop,
        farm_size=user.farm_size,
        soil_type=user.soil_type
    )
    db.close()
    return response

@app.put("/profile/{user_id}")
def update_profile(
    user_id: int,
    request: ProfileUpdateRequest
):
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
    profile_changed = any([
        user.phone != request.phone,
        user.state != request.state,
        user.district != request.district,
        user.city != request.city,
        user.crop != request.crop,
        user.farmer_type != request.farmer_type,
        user.farm_size != request.farm_size,
        user.soil_type != request.soil_type,
    ])
    user.phone = request.phone
    user.state = request.state
    user.district = request.district
    user.city = request.city
    user.language = request.language
    user.farmer_type = request.farmer_type
    user.crop = request.crop
    user.farm_size = request.farm_size
    user.soil_type = request.soil_type
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

@app.get("/profile-status/{user_id}")
def profile_status(user_id: int):
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
def get_notifications(user_id: int):
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
def mark_notification_read(notification_id: int):
    db = SessionLocal()
    try:
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
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
def mark_all_notifications_read(user_id: int):
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
def get_schemes(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User Not Found"
            )
        query = f"""
Government schemes for farmers.

Farmer Details:
State: {user.state}
Crop: {user.crop}
Farmer Type: {user.farmer_type}
Farm Size: {user.farm_size}

Return only the most relevant government scheme names.
One scheme per line.
No explanation.
"""
        try:
            answer = scheme_titles_agent(query)
        except Exception as error:
            # The scheme index is a generated local cache.  Do not let an
            # index failure break the whole dashboard while it is rebuilt.
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
def create_chat_session(user_id: int):
    db = SessionLocal()
    session = ChatSession(
        user_id=user_id,
        title="New Chat"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    db.close()
    return {
        "session_id": session.id
    }

@app.post("/speech-to-text")
async def transcribe_speech(
    file: UploadFile = File(...),
    language: str = Form("unknown"),
):
    language_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "kn": "kn-IN",
        "te": "te-IN",
        "ta": "ta-IN",
        "ml": "ml-IN",
        "mr": "mr-IN",
        "gu": "gu-IN",
        "unknown": "unknown",
    }

    language_code = language_map.get(language, "unknown")

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

    if file.content_type not in allowed_content_types:
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
    content_type = file.content_type or "audio/webm"

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
def chat(request: ChatRequest):
    db = SessionLocal()
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == request.session_id)
        .first()
    )
    if session is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Session Not Found"
        )
    user_message = request.message
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
        and len(user_message.split()) <= 12
        and user_message.lower().strip().startswith(
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

    language = request.language or detect_language(processing_message)
    print("User Query:", user_message)
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
    translated_text = processing_message
    source_language = lang_map.get(language, "en-IN")
    if source_language != "en-IN":
        result = translate_text(
            processing_message,
            source_language,
            "en-IN"
        )
        translated_text = result.translated_text
    intent_result = classify_intent(translated_text)
    if intent_result["intent"] == "government_scheme_query":
        entities = []
    else:
        entities = extract_entities(translated_text)
    agri_entities = extract_agri_entities(translated_text)
    user = db.query(User).filter(User.id == int(request.user_id)).first()
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
    requested_location = (
        location_match.group(1).strip()
        if location_match
        else (user.city or user.district if user else "")
    )
    weather_location_aliases = {
        "uttarakannada": "Karwar",
        "uttara kannada": "Karwar",
        "bangalore": "Bengaluru",
        "mysore": "Mysuru",
    }
    requested_location = weather_location_aliases.get(
        requested_location.lower(),
        requested_location,
    )

    comparison_locations = []
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
                    state=(user.state if user and user.state else "Karnataka"),
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
                        state=(user.state if user and user.state else "Karnataka"),
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
                response_text = (
                    f"Current weather in {weather['city']}.\n"
                    f"Temperature: {weather['temperature']}°C.\n"
                    f"Humidity: {weather['humidity']}%.\n"
                    f"Weather: {weather['weather']}.\n"
                    f"Wind Speed: {weather['wind_speed']} m/s."
                )
    else:
        if intent_result["intent"] == "market_price_query":
            response_text = route_query(
                intent=intent_result["intent"],
                commodity=agri_entities.get("crop"),
                state=(
                    market_state
                    or (user.state if user and user.state else "Karnataka")
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
    if target_language != "en-IN":
        result = translate_text(
            response_text,
            "en-IN",
            target_language
        )
        translated_response = result.translated_text
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
            user_id=int(request.user_id),
            session_id=session.id,
            query=user_message,
            response=translated_response,
        ))
    db.commit()
    db.close()
    print("Bot Response:", translated_response)
    tts_result = text_to_speech(translated_response)
    print("TTS Result:", tts_result)
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
        "session": session,
        "response_quality": quality_result,
        "assistant_message_id": assistant_message_id,
    }

@app.post("/speak")
def speak(request: SpeakRequest):
    lang_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "te": "te-IN",
        "kn": "kn-IN",
        "ta": "ta-IN",
    }
    target_language = lang_map.get(request.language, "en-IN")
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
        media_type="audio/wav",
        filename="speech.wav"
    )

@app.post("/market-price")
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

@app.get("/market-options")
def market_options():
    return get_market_options()

@app.get("/recent-activity/{user_id}")
def get_chat_activity(user_id: int, limit: int = 20):
    db = SessionLocal()
    try:
        sessions = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .all()
        )
        if not sessions:
            return []
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

Base.metadata.create_all(bind=engine)
