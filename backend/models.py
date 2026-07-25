from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    language: str = "English"

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

class ChatRequest(BaseModel):
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

