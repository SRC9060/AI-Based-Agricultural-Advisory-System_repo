import os

from fastapi import FastAPI, UploadFile, File, HTTPException
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
from services.rag_pipeline import generate_response
from services.weather_service import get_weather,get_forecast
from services.agri_entities import extract_agri_entities
from services.router import route_query
from services.response_quality import calculate_response_quality
from config import Config
from models import LoginRequest, ChatRequest
from services.agmarknet import get_market_price
from services.agmarknet import get_market_options

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
@app.post("/login")
def login(request: LoginRequest):
    user = Config.USERS.get(request.email)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )
    if user["password"] != request.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )
    return {
        "message": "Login Successful",
        "user": {
            "email": request.email,
            "name": user["name"]
        }
    }

@app.post("/chat")
def chat(request: ChatRequest):
    user_message = request.message
    language = detect_language(user_message)
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