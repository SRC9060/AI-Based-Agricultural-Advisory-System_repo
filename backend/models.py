from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    user_id: str
    message: str

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