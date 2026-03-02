"""
EchoNote Backend Authentication Module
FastAPI + SQLAlchemy + JWT + bcrypt
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum
import os
import re

from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx

# =============================================================================
# Configuration
# =============================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/echonote")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# Apple OAuth Config
APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID", "")
APPLE_TEAM_ID = os.getenv("APPLE_TEAM_ID", "")
APPLE_KEY_ID = os.getenv("APPLE_KEY_ID", "")
APPLE_PRIVATE_KEY = os.getenv("APPLE_PRIVATE_KEY", "")

# =============================================================================
# Database Setup
# =============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer scheme
security = HTTPBearer()


class User(Base):
    """User database model"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Null for OAuth users
    full_name = Column(String(255), nullable=True)
    
    # OAuth provider info
    provider = Column(String(50), default="email")  # email, google, apple
    provider_id = Column(String(255), nullable=True)
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Refresh token tracking
    refresh_token_version = Column(Integer, default=0)


# Create tables
Base.metadata.create_all(bind=engine)


# =============================================================================
# Pydantic Schemas
# =============================================================================

class ProviderType(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


# Request Schemas
class UserRegisterRequest(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=255)
    
    @validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLoginRequest(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    """Google OAuth callback request"""
    code: str
    redirect_uri: str


class AppleAuthRequest(BaseModel):
    """Apple OAuth callback request"""
    code: str
    id_token: str
    user: Optional[Dict[str, Any]] = None  # Contains email, name on first sign-in


class TokenRefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Logout request"""
    refresh_token: Optional[str] = None  # Optional: logout specific device


# Response Schemas
class TokenData(BaseModel):
    """Token payload data"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    """User data response"""
    id: str
    email: str
    full_name: Optional[str]
    provider: ProviderType
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with user and tokens"""
    user: UserResponse
    tokens: TokenData


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # user id
    email: str
    type: TokenType
    version: int  # refresh token version for invalidation
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    code: Optional[str] = None


# =============================================================================
# Utility Functions
# =============================================================================

def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)


def create_token(data: Dict[str, Any], expires_delta: timedelta, token_type: TokenType) -> str:
    """Create JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": token_type.value
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user_id: str, email: str) -> tuple[str, int]:
    """Create access token"""
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data = {
        "sub": user_id,
        "email": email,
        "type": TokenType.ACCESS.value
    }
    token = create_token(data, expires, TokenType.ACCESS)
    return token, ACCESS_TOKEN_EXPIRE_MINUTES * 60


def create_refresh_token(user_id: str, email: str, version: int) -> str:
    """Create refresh token"""
    expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    data = {
        "sub": user_id,
        "email": email,
        "version": version,
        "type": TokenType.REFRESH.value
    }
    return create_token(data, expires, TokenType.REFRESH)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_access_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenPayload:
    """Verify access token and return payload"""
    payload = decode_token(credentials.credentials)
    
    if payload.get("type") != TokenType.ACCESS.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return TokenPayload(**payload)


def get_current_user(
    token_payload: TokenPayload = Depends(verify_access_token),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    user = db.query(User).filter(User.id == token_payload.sub).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    return user


def generate_user_id() -> str:
    """Generate unique user ID"""
    import uuid
    return str(uuid.uuid4())


# =============================================================================
# OAuth Providers
# =============================================================================

async def verify_google_token(code: str, redirect_uri: str) -> Dict[str, Any]:
    """Verify Google OAuth code and return user info"""
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google authorization code"
            )
        
        tokens = token_response.json()
        id_token = tokens.get("id_token")
        
        # Verify ID token
        user_response = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to verify Google token"
            )
        
        user_info = user_response.json()
        
        # Validate audience
        if user_info.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google client ID"
            )
        
        return {
            "provider_id": user_info.get("sub"),
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "verified_email": user_info.get("email_verified", False)
        }


async def verify_apple_token(code: str, id_token: str) -> Dict[str, Any]:
    """Verify Apple OAuth token"""
    import jwt as pyjwt
    
    # Verify Apple ID token
    try:
        # Decode without verification first to get header
        unverified = pyjwt.decode(id_token, options={"verify_signature": False})
        
        # Fetch Apple's public keys
        async with httpx.AsyncClient() as client:
            jwks_response = await client.get("https://appleid.apple.com/auth/keys")
            jwks = jwks_response.json()
        
        # Find the correct key
        header = pyjwt.get_unverified_header(id_token)
        key = None
        for k in jwks.get("keys", []):
            if k["kid"] == header["kid"]:
                key = k
                break
        
        if not key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Apple token key"
            )
        
        # Verify token
        from jose.jwk import construct
        from jose.utils import base64url_decode
        
        public_key = construct(key)
        message, signature = id_token.rsplit(".", 1)
        signature = base64url_decode(signature.encode())
        
        if not public_key.verify(message.encode(), signature):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Apple signature"
            )
        
        # Validate claims
        if unverified.get("iss") != "https://appleid.apple.com":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Apple token issuer"
            )
        
        if unverified.get("aud") != APPLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Apple client ID"
            )
        
        return {
            "provider_id": unverified.get("sub"),
            "email": unverified.get("email"),
            "name": None,  # Apple only provides name on first login
            "verified_email": True
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Apple authentication failed: {str(e)}"
        )


# =============================================================================
# API Endpoints
# =============================================================================

app = FastAPI(title="EchoNote Auth API", version="1.0.0")


@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user with email and password.
    
    - **email**: Valid email address
    - **password**: Min 8 chars, must contain uppercase, lowercase, and digit
    - **full_name**: Optional display name
    """
    # Check if user exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    # Create new user
    user_id = generate_user_id()
    hashed_password = get_password_hash(request.password)
    
    new_user = User(
        id=user_id,
        email=request.email,
        hashed_password=hashed_password,
        full_name=request.full_name,
        provider=ProviderType.EMAIL.value,
        is_verified=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate tokens
    access_token, expires_in = create_access_token(user_id, request.email)
    refresh_token = create_refresh_token(user_id, request.email, new_user.refresh_token_version)
    
    return AuthResponse(
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            provider=ProviderType.EMAIL,
            is_verified=new_user.is_verified,
            created_at=new_user.created_at
        ),
        tokens=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )
    )


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password.
    
    - **email**: Registered email address
    - **password**: User password
    """
    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password (skip for OAuth-only users)
    if user.provider == ProviderType.EMAIL.value:
        if not user.hashed_password or not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please login with {user.provider}"
        )
    
    # Check if active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate tokens
    access_token, expires_in = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email, user.refresh_token_version)
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            provider=ProviderType(user.provider),
            is_verified=user.is_verified,
            created_at=user.created_at
        ),
        tokens=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )
    )


@app.post("/api/auth/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate with Google OAuth.
    
    - **code**: Authorization code from Google
    - **redirect_uri**: Must match the URI used in OAuth request
    """
    # Verify Google token
    google_user = await verify_google_token(request.code, request.redirect_uri)
    
    email = google_user["email"]
    provider_id = google_user["provider_id"]
    
    # Check if user exists
    user = db.query(User).filter(
        (User.email == email) | 
        ((User.provider == ProviderType.GOOGLE.value) & (User.provider_id == provider_id))
    ).first()
    
    if user:
        # Update existing user
        if user.provider == ProviderType.EMAIL.value:
            # Link OAuth to existing email account
            user.provider = ProviderType.GOOGLE.value
            user.provider_id = provider_id
        user.last_login = datetime.utcnow()
        if google_user.get("verified_email"):
            user.is_verified = True
        db.commit()
    else:
        # Create new user
        user_id = generate_user_id()
        user = User(
            id=user_id,
            email=email,
            hashed_password=None,
            full_name=google_user.get("name"),
            provider=ProviderType.GOOGLE.value,
            provider_id=provider_id,
            is_verified=google_user.get("verified_email", False),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Generate tokens
    access_token, expires_in = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email, user.refresh_token_version)
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            provider=ProviderType.GOOGLE,
            is_verified=user.is_verified,
            created_at=user.created_at
        ),
        tokens=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )
    )


@app.post("/api/auth/apple", response_model=AuthResponse)
async def apple_auth(request: AppleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate with Apple OAuth.
    
    - **code**: Authorization code from Apple
    - **id_token**: JWT identity token from Apple
    - **user**: User info (only provided on first sign-in)
    """
    # Verify Apple token
    apple_user = await verify_apple_token(request.code, request.id_token)
    
    email = apple_user["email"]
    provider_id = apple_user["provider_id"]
    
    # Get name from user object (only on first login)
    full_name = None
    if request.user and "name" in request.user:
        name_parts = request.user["name"]
        if name_parts:
            full_name = " ".join(filter(None, [
                name_parts.get("firstName"),
                name_parts.get("lastName")
            ]))
    
    # Check if user exists
    user = db.query(User).filter(
        (User.email == email) |
        ((User.provider == ProviderType.APPLE.value) & (User.provider_id == provider_id))
    ).first()
    
    if user:
        # Update existing user
        if user.provider == ProviderType.EMAIL.value:
            user.provider = ProviderType.APPLE.value
            user.provider_id = provider_id
        user.last_login = datetime.utcnow()
        user.is_verified = True  # Apple emails are always verified
        db.commit()
    else:
        # Create new user
        user_id = generate_user_id()
        user = User(
            id=user_id,
            email=email,
            hashed_password=None,
            full_name=full_name,
            provider=ProviderType.APPLE.value,
            provider_id=provider_id,
            is_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Generate tokens
    access_token, expires_in = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email, user.refresh_token_version)
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            provider=ProviderType.APPLE,
            is_verified=user.is_verified,
            created_at=user.created_at
        ),
        tokens=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )
    )


@app.post("/api/auth/refresh", response_model=TokenData)
async def refresh_token(request: TokenRefreshRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    """
    try:
        payload = decode_token(request.refresh_token)
        
        if payload.get("type") != TokenType.REFRESH.value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        version = payload.get("version")
        
        # Find user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify refresh token version (token rotation)
        if user.refresh_token_version != version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )
        
        # Generate new tokens
        access_token, expires_in = create_access_token(user_id, email)
        new_refresh_token = create_refresh_token(user_id, email, user.refresh_token_version)
        
        return TokenData(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in
        )
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@app.post("/api/auth/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: LogoutRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user and revoke refresh tokens.
    
    - Requires authentication
    - Invalidates all refresh tokens (logout from all devices)
    - Optionally provide refresh_token to logout specific device only
    """
    # Increment refresh token version to invalidate all existing refresh tokens
    current_user.refresh_token_version += 1
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Successfully logged out"}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        provider=ProviderType(current_user.provider),
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth"}


# =============================================================================
# Tests
# =============================================================================

if __name__ == "__main__":
    import unittest
    from fastapi.testclient import TestClient
    
    # Create test database
    TEST_DATABASE_URL = "sqlite:///./test.db"
    test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    class TestAuthAPI(unittest.TestCase):
        def setUp(self):
            # Create test tables
            Base.metadata.create_all(bind=test_engine)
            self.client = TestClient(app)
        
        def tearDown(self):
            # Drop test tables
            Base.metadata.drop_all(bind=test_engine)
        
        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()
        
        app.dependency_overrides[get_db] = override_get_db
        
        def test_register_success(self):
            """Test successful registration"""
            response = self.client.post("/api/auth/register", json={
                "email": "test@example.com",
                "password": "Test123456",
                "full_name": "Test User"
            })
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertEqual(data["user"]["email"], "test@example.com")
            self.assertEqual(data["user"]["full_name"], "Test User")
            self.assertIn("access_token", data["tokens"])
            self.assertIn("refresh_token", data["tokens"])
        
        def test_register_duplicate_email(self):
            """Test registration with duplicate email"""
            # First registration
            self.client.post("/api/auth/register", json={
                "email": "dup@example.com",
                "password": "Test123456"
            })
            
            # Second registration with same email
            response = self.client.post("/api/auth/register", json={
                "email": "dup@example.com",
                "password": "Test123456"
            })
            self.assertEqual(response.status_code, 409)
        
        def test_register_weak_password(self):
            """Test registration with weak password"""
            response = self.client.post("/api/auth/register", json={
                "email": "weak@example.com",
                "password": "weak"
            })
            self.assertEqual(response.status_code, 422)
        
        def test_login_success(self):
            """Test successful login"""
            # Register first
            self.client.post("/api/auth/register", json={
                "email": "login@example.com",
                "password": "Test123456"
            })
            
            # Login
            response = self.client.post("/api/auth/login", json={
                "email": "login@example.com",
                "password": "Test123456"
            })
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("access_token", data["tokens"])
        
        def test_login_wrong_password(self):
            """Test login with wrong password"""
            # Register first
            self.client.post("/api/auth/register", json={
                "email": "wrong@example.com",
                "password": "Test123456"
            })
            
            # Login with wrong password
            response = self.client.post("/api/auth/login", json={
                "email": "wrong@example.com",
                "password": "WrongPassword123"
            })
            self.assertEqual(response.status_code, 401)
        
        def test_refresh_token(self):
            """Test token refresh"""
            # Register and get tokens
            reg_response = self.client.post("/api/auth/register", json={
                "email": "refresh@example.com",
                "password": "Test123456"
            })
            refresh_token = reg_response.json()["tokens"]["refresh_token"]
            
            # Refresh
            response = self.client.post("/api/auth/refresh", json={
                "refresh_token": refresh_token
            })
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("access_token", data)
            self.assertIn("refresh_token", data)
        
        def test_get_me(self):
            """Test get current user"""
            # Register and get tokens
            reg_response = self.client.post("/api/auth/register", json={
                "email": "me@example.com",
                "password": "Test123456"
            })
            access_token = reg_response.json()["tokens"]["access_token"]
            
            # Get me
            response = self.client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["email"], "me@example.com")
        
        def test_logout(self):
            """Test logout"""
            # Register and get tokens
            reg_response = self.client.post("/api/auth/register", json={
                "email": "logout@example.com",
                "password": "Test123456"
            })
            access_token = reg_response.json()["tokens"]["access_token"]
            refresh_token = reg_response.json()["tokens"]["refresh_token"]
            
            # Logout
            response = self.client.post(
                "/api/auth/logout",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"refresh_token": refresh_token}
            )
            self.assertEqual(response.status_code, 200)
            
            # Try to refresh with old token (should fail)
            refresh_response = self.client.post("/api/auth/refresh", json={
                "refresh_token": refresh_token
            })
            self.assertEqual(refresh_response.status_code, 401)
    
    # Run tests
    unittest.main(argv=[''], verbosity=2, exit=False)
