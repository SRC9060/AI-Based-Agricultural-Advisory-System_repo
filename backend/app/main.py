from app.schemas import UserRegister, UserLogin, ChatRequest
from services.pipeline import process_query
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from services.text_to_speech import text_to_speech
from services.sarvam_speech_to_text import speech_to_text
from pydantic import BaseModel
import os

from fastapi.responses import FileResponse

from app.database import create_users_table, register_user, login_user


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpeakRequest(BaseModel):
    text: str
    language: str
# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_users_table()


@app.get("/")
def home():
    return {"message": "AI Agricultural Advisory System Backend Running"}


@app.post("/register")
def register(user: UserRegister):

    register_user(
        user.name,
        user.email,
        user.password,
        user.language
    )

    return {
        "message": "User Registered Successfully"
    }

@app.post("/login")
def login(user: UserLogin):

    existing_user = login_user(
        user.email,
        user.password
    )

    if existing_user:
        return {
            "message": "Login Successful"
        }

    return {
        "message": "Invalid Email or Password"
    }


@app.post("/chat")
def chat(request: ChatRequest):

    response = process_query(
    request.message,
    request.language
)

    return response


@app.post("/speak")
def speak(request: SpeakRequest):

    audio_path = text_to_speech(
        request.text,
        request.language
    )

    return FileResponse(
        audio_path,
        media_type="audio/wav",
        filename="answer.wav"
    )


@app.post("/speech-to-text")
async def speech_to_text_api(
    file: UploadFile = File(...),
    language: str = Form(...)
):

    extension = file.filename.split(".")[-1]
    temp_path = f"temp_audio.{extension}"

    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    transcript = speech_to_text(
        temp_path,
        language
    )

    os.remove(temp_path)

    return {
        "text": transcript
    }