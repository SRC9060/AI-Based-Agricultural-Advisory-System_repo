import os

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.language_detection import detect_language
from services.translation import translate_text
from services.speech_to_text import speech_to_text
from services.text_to_speech import text_to_speech
from services.intent_classifier import classify_intent
from services.ner import extract_entities
from services.session_manager import (
    create_session,
    add_message,
    get_session
)
from database import SessionLocal
from user_model import Notification, User
from services.rag_pipeline import generate_response
from services.weather_service import get_weather,get_forecast
from services.agri_entities import extract_agri_entities
from services.router import route_query
from services.response_quality import calculate_response_quality
from config import Config
from models import (LoginRequest,RegisterRequest,ProfileResponse,ProfileUpdateRequest,ChatRequest,)
from services.agmarknet import get_market_price
from services.agmarknet import get_market_options
from services.agents.scheme_agent import ( scheme_agent,scheme_titles_agent,)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Farmer Advisory Chatbot API is running!"
    }
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
            detail="Email already registered"
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
        message="Complete your profile to receive personalised weather, market, and scheme updates."
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

    if user is None:
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )

    if user.password != request.password:
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
            detail="User not found"
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
        return {"message": "Notification marked as read"}
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
        return {"message": "All notifications marked as read"}
    finally:
        db.close()

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
            detail="User not found"
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

@app.get("/schemes/{user_id}")
def get_schemes(user_id: int):

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
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

        answer = scheme_titles_agent(query)

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


@app.post("/chat")
def chat(request: ChatRequest):
    user_message = request.message
    language = request.language or detect_language(user_message)
    print("Selected language:", language)
    print("Selected Language:", request.language)
    create_session(request.user_id, language)
    add_message(request.user_id, user_message)
    session = get_session(request.user_id)
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
    translated_text = user_message
    source_language = lang_map.get(language, "en-IN")
    if source_language != "en-IN":
        result = translate_text(
            user_message,
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
    if intent_result["intent"] == "weather_query":
        city = None
        for entity in entities:
            if entity["entity_group"] == "LOC":
                city = entity["word"].replace(".", "").strip()
                break
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
        if intent_result["intent"] == "crop_management_query":
            response_text = route_query(
                intent=intent_result["intent"],
                query=translated_text
            )
        elif intent_result["intent"] == "pest_control_query":
            response_text = route_query(
                intent=intent_result["intent"],
                query=translated_text
            )
        elif intent_result["intent"] == "government_scheme_query":
            response_text = route_query(
                intent=intent_result["intent"],
                query=translated_text
            )
        elif intent_result["intent"] == "market_price_query":

            response_text = route_query(
                intent=intent_result["intent"],
                commodity=agri_entities.get("crop"),
                state=market_state,
                district=market_district
            )
        else:
            response_text = generate_response(translated_text)
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
    print("\n================ RESPONSE TEXT ================\n")
    print(translated_response)
    print("\n===============================================\n")
    print("Character Count:", len(translated_response))
    tts_result = text_to_speech(translated_response)
    print("TTS Result:", tts_result)
    # Calculate response quality
    quality_result = calculate_response_quality(
        intent_result["score"],
        english_response
    )
    print("\n===== RESPONSE QUALITY =====")
    print(quality_result)
    print("============================\n")
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
        "response_quality": quality_result
    }

@app.post("/voice-chat")
async def voice_chat(
    user_id: str,
    audio: UploadFile = File(...)
):
    os.makedirs("uploads", exist_ok=True)
    upload_path = os.path.join("uploads", audio.filename)
    with open(upload_path, "wb") as buffer:
        buffer.write(await audio.read())
    stt_result = speech_to_text(upload_path)
    if isinstance(stt_result, str):
        return {
            "status": "error",
            "details": stt_result
        }
    user_message = stt_result.transcript
    language = detect_language(user_message)
    create_session(user_id, language)
    add_message(user_id, user_message)
    session = get_session(user_id)
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
    translated_text = user_message
    source_language = lang_map.get(language, "en-IN")
    if source_language != "en-IN":
        result = translate_text(
            user_message,
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
    if intent_result["intent"] == "weather_query":
        city = None
        for entity in entities:
            if entity["entity_group"] == "LOC":
                city = entity["word"].replace(".", "").strip()
                break
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
        if intent_result["intent"] == "crop_management_query":
            response_text = route_query(
                intent=intent_result["intent"],
                query=translated_text
            )
        elif intent_result["intent"] == "pest_control_query":
            response_text = route_query(
                intent=intent_result["intent"],
                query=translated_text
            )
        elif intent_result["intent"] == "government_scheme_query":
            response_text = route_query(
                intent=intent_result["intent"],
                query=translated_text
            )
        elif intent_result["intent"] == "market_price_query":
            response_text = route_query(
                intent=intent_result["intent"],
                commodity=agri_entities.get("crop"),
                state=market_state,
                district=market_district
            )
        else:
            response_text = generate_response(translated_text)
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
    print("\n================ RESPONSE TEXT ================\n")
    print(translated_response)
    print("\n===============================================\n")
    print("Character Count:", len(translated_response))
    tts_result = text_to_speech(translated_response)
    print("TTS Result:", tts_result)
    # Calculate response quality
    quality_result = calculate_response_quality(
        intent_result["score"],
        english_response
    )
    return {
        "user_id": user_id,
        "message": user_message,
        "detected_language": language,
        "translated_text": translated_text,
        "intent": intent_result["intent"],
        "confidence_score": float(intent_result["score"]),
        "entities": entities,
        "agricultural_entities": agri_entities,
        "english_response": english_response,
        "response_in_user_language": translated_response,
        "audio_file": tts_result.get("audio_file"),
        "session": session,
        "response_quality": quality_result
    }

class SpeakRequest(BaseModel):
    text: str
    language: str = "en"


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


class MarketRequest(BaseModel):
    commodity: str
    state: str
    district: str

@app.post("/market-price")
def market_price(request: MarketRequest):

    try:

        response = get_market_price(
        commodity=request.commodity,
        state=request.state,
        district=request.district
        )

        return {
    "commodity": response.commodity,
    "state": response.state,
    "district": response.district,
    "market": response.market,
    "min_price": response.min_price,
    "max_price": response.max_price,
    "modal_price": response.modal_price,
    "arrival_date": response.arrival_date
}

    except Exception as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
@app.get("/market-options")
def market_options():

    return get_market_options()

from database import engine
from user_model import Base


Base.metadata.create_all(bind=engine)
