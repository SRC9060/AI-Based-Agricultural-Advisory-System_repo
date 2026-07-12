from pydantic import BaseModel


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    language: str


class UserLogin(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    message: str
    language: str = "en"