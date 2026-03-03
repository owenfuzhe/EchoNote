"""
EchoNote Backend - Main Application
Combines Auth and Notes modules
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Create main app
app = FastAPI(
    title="EchoNote API",
    description="EchoNote 智能语音笔记后端 API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for audio files
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Import and include routers
# Note: auth routes are defined in auth.py
# For now, we'll create a simple auth router here

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

# Auth configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

auth_router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None

# Mock user database (replace with real DB)
MOCK_USERS = {}

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """用户登录"""
    # TODO: 验证用户凭据
    # 这里简化处理，直接返回 token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "test-user-id", "email": credentials.email},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@auth_router.post("/register", response_model=UserResponse)
async def register(credentials: LoginRequest):
    """用户注册"""
    # TODO: 创建用户
    return {
        "id": "new-user-id",
        "email": credentials.email,
        "full_name": None
    }

# Include auth router
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])

# Include notes router
from notes_api import router as notes_router
app.include_router(notes_router, prefix="/api", tags=["笔记"])

# Include AI router
from ai import router as ai_router
app.include_router(ai_router, prefix="/api", tags=["AI"])

@app.get("/")
async def root():
    return {
        "message": "EchoNote API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
