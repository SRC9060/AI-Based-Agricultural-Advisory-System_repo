from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, ForeignKey

# ==========================================
# Data Schema Models
# ==========================================

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    language: str = "English"

class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    state: str
    district: str
    city: str
    language: str
    farmer_type: str
    crop: str
    farm_size: str
    soil_type: str

class ProfileUpdateRequest(BaseModel):
    phone: str
    state: str
    district: str
    city: str
    language: str
    farmer_type: str
    crop: str
    farm_size: str
    soil_type: str

class ChatRequest(BaseModel):
    session_id: str
    user_id: str
    message: str
    language: str = "en"

class MarketRequest(BaseModel):
    commodity: str
    state: str
    district: str

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
    text: str
    language: str = "en"

class FeedbackRequest(BaseModel):
    user_id: int
    message: str
    category: str
    rating: int

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