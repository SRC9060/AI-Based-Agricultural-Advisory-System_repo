from datetime import datetime
import re
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, ForeignKey

# ==========================================
# Data Schema Models
# ==========================================

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Enter a Valid Mail Address")
        return email

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    language: str = "English"
    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if any(ord(character) < 32 for character in cleaned):
            raise ValueError("Name Contains Unsupported Characters")
        return cleaned
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Enter a Valid Mail Address")
        return email

class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = ""
    state: str | None = ""
    district: str | None = ""
    city: str | None = ""
    language: str | None = "English"
    farmer_type: str | None = ""
    crop: str | None = ""
    farm_size: str | None = ""
    soil_type: str | None = ""
    farm_name: str | None = ""
    farm_size_unit: str | None = "Acres"
    irrigation_type: str | None = ""
    farming_type: str | None = ""
    crop_variety: str | None = ""
    sowing_date: str | None = ""
    expected_harvest_date: str | None = ""
    crop_area: str | None = ""
    growth_stage: str | None = ""

class ProfileUpdateRequest(BaseModel):
    phone: str | None = None
    state: str | None = None
    district: str | None = None
    city: str | None = None
    language: str | None = None
    farmer_type: str | None = None
    crop: str | None = None
    farm_size: str | None = None
    soil_type: str | None = None
    farm_name: str | None = None
    farm_size_unit: str | None = None
    irrigation_type: str | None = None
    farming_type: str | None = None
    crop_variety: str | None = None
    sowing_date: str | None = None
    expected_harvest_date: str | None = None
    crop_area: str | None = None
    growth_stage: str | None = None

class ChatRequest(BaseModel):
    session_id: str
    user_id: str
    message: str = Field(min_length=1, max_length=2000)
    language: str = "en"

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, value: str) -> str:
        cleaned = "".join(
            character for character in value.strip()
            if character in "\n\t" or ord(character) >= 32
        )
        if not cleaned:
            raise ValueError("Message cannot be empty.")
        return cleaned

class MarketRequest(BaseModel):
    commodity: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    language: str = "en"

    @field_validator("commodity", "state", "district")
    @classmethod
    def sanitize_market_value(cls, value: str) -> str:
        return " ".join(value.strip().split())

class MarketResponse(BaseModel):
    commodity: str
    state: str
    district: str
    market: str
    min_price: float
    max_price: float
    modal_price: float
    arrival_date: str

class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: str = "en"

    @field_validator("text")
    @classmethod
    def sanitize_speech_text(cls, value: str) -> str:
        cleaned = "".join(
            character for character in value.strip()
            if character in "\n\t" or ord(character) >= 32
        )
        if not cleaned:
            raise ValueError("Speech text cannot be empty.")
        return cleaned


class TranslationBatchRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=20)
    source_language: str = "en"
    target_language: str = "en"

    @field_validator("texts")
    @classmethod
    def sanitize_texts(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip()[:1000] for value in values]
        if any(not value for value in cleaned):
            raise ValueError("Translation text cannot be empty.")
        return cleaned


class SchemeSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    language: str = "en"
    source_language: str | None = None

class FeedbackRequest(BaseModel):
    user_id: int
    message: str = Field(min_length=1, max_length=2000)
    category: str = Field(min_length=1, max_length=50)
    rating: int = Field(ge=1, le=5)

    @field_validator("message")
    @classmethod
    def sanitize_feedback(cls, value: str) -> str:
        cleaned = "".join(
            character for character in value.strip()
            if character in "\n\t" or ord(character) >= 32
        )
        if not cleaned:
            raise ValueError("Feedback cannot be empty.")
        return cleaned

class ResponseFeedbackRequest(BaseModel):
    user_id: int
    message_id: int
    helpful: bool

# ==========================================
# Database Models
# ==========================================

from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    phone = Column(String, default="")
    state = Column(String, default="")
    district = Column(String, default="")
    city = Column(String, default="")
    language = Column(String, default="English")
    farmer_type = Column(String, default="")
    crop = Column(String, default="")
    farm_size = Column(String, default="")
    soil_type = Column(String, default="")
    farm_name = Column(String, default="")
    farm_size_unit = Column(String, default="Acres")
    irrigation_type = Column(String, default="")
    farming_type = Column(String, default="")
    crop_variety = Column(String, default="")
    sowing_date = Column(String, default="")
    expected_harvest_date = Column(String, default="")
    crop_area = Column(String, default="")
    growth_stage = Column(String, default="")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer,
        ForeignKey("chat_sessions.id"),
        nullable=False,
        index=True,
    )
    role = Column(String, nullable=False)
    intent = Column(String, nullable=True, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    category = Column(String, nullable=False, default="Suggestion")
    rating = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ResponseFeedback(Base):
    __tablename__ = "response_feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=False, index=True)
    helpful = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class UnansweredQuery(Base):
    __tablename__ = "unanswered_queries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
