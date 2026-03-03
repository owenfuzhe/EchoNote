"""
EchoNote Backend - Notes API Module
FastAPI + SQLAlchemy
"""

from datetime import datetime
from typing import List, Optional
import os
import uuid

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, DateTime, Text, ARRAY, Integer, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# =============================================================================
# Configuration
# =============================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/echonote")

# =============================================================================
# Database Setup
# =============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =============================================================================
# Database Models
# =============================================================================

class NoteDB(Base):
    __tablename__ = "notes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    audio_url = Column(String(500), nullable=True)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    tags = Column(ARRAY(String), default=list)
    duration = Column(Integer, default=0)  # 录音时长（秒）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RecordingDB(Base):
    __tablename__ = "recordings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    note_id = Column(String, ForeignKey("notes.id"), nullable=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    duration = Column(Integer, default=0)
    status = Column(String(20), default="processing")  # processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

# 创建表
Base.metadata.create_all(bind=engine)

# =============================================================================
# Pydantic Schemas
# =============================================================================

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    duration: int = Field(default=0, ge=0)

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None

class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: Optional[str]
    audio_url: Optional[str]
    transcript: Optional[str]
    summary: Optional[str]
    tags: List[str]
    duration: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RecordingResponse(BaseModel):
    id: str
    note_id: Optional[str]
    file_path: str
    file_size: int
    duration: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# =============================================================================
# Dependencies
# =============================================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 简化版 JWT 验证（实际项目中应复用 auth.py 的逻辑）
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """从 JWT token 获取当前用户 ID（简化版）"""
    # TODO: 实现完整的 JWT 验证
    # 这里返回测试用户 ID
    return "test-user-id"

# =============================================================================
# API Routes
# =============================================================================

app = FastAPI()

# -----------------------------------------------------------------------------
# Notes CRUD API
# -----------------------------------------------------------------------------

@app.get("/api/notes", response_model=List[NoteResponse])
async def list_notes(
    skip: int = 0,
    limit: int = 20,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """获取笔记列表"""
    query = db.query(NoteDB).filter(NoteDB.user_id == user_id)
    
    if tag:
        query = query.filter(NoteDB.tags.contains([tag]))
    
    if search:
        query = query.filter(
            (NoteDB.title.ilike(f"%{search}%")) |
            (NoteDB.content.ilike(f"%{search}%")) |
            (NoteDB.transcript.ilike(f"%{search}%"))
        )
    
    notes = query.order_by(NoteDB.created_at.desc()).offset(skip).limit(limit).all()
    return notes

@app.get("/api/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """获取单个笔记详情"""
    note = db.query(NoteDB).filter(
        NoteDB.id == note_id,
        NoteDB.user_id == user_id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    return note

@app.post("/api/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """创建新笔记"""
    db_note = NoteDB(
        user_id=user_id,
        title=note.title,
        content=note.content,
        tags=note.tags,
        duration=note.duration
    )
    
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    return db_note

@app.put("/api/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """更新笔记"""
    db_note = db.query(NoteDB).filter(
        NoteDB.id == note_id,
        NoteDB.user_id == user_id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    update_data = note_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_note, field, value)
    
    db_note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_note)
    
    return db_note

@app.delete("/api/notes/{note_id}")
async def delete_note(
    note_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """删除笔记"""
    db_note = db.query(NoteDB).filter(
        NoteDB.id == note_id,
        NoteDB.user_id == user_id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    db.delete(db_note)
    db.commit()
    
    return {"message": "笔记已删除", "id": note_id}

# -----------------------------------------------------------------------------
# Recording Upload API
# -----------------------------------------------------------------------------

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/recordings/upload", response_model=RecordingResponse)
async def upload_recording(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """上传录音文件"""
    # 验证文件类型
    allowed_types = ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件类型: {file.content_type}"
        )
    
    # 生成文件名
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    # 保存文件
    file_size = 0
    try:
        contents = await file.read()
        file_size = len(contents)
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    finally:
        await file.close()
    
    # 创建笔记记录
    note_title = title or f"新录音 {datetime.now().strftime('%m-%d %H:%M')}"
    db_note = NoteDB(
        user_id=user_id,
        title=note_title,
        audio_url=f"/uploads/{file_name}"
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    # 创建录音记录
    db_recording = RecordingDB(
        user_id=user_id,
        note_id=db_note.id,
        file_path=file_path,
        file_size=file_size,
        status="completed"
    )
    db.add(db_recording)
    db.commit()
    db.refresh(db_recording)
    
    return db_recording

@app.get("/api/recordings/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """获取录音详情"""
    recording = db.query(RecordingDB).filter(
        RecordingDB.id == recording_id,
        RecordingDB.user_id == user_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="录音不存在")
    
    return recording

# -----------------------------------------------------------------------------
# AI Processing API (Placeholder)
# -----------------------------------------------------------------------------

@app.post("/api/notes/{note_id}/transcript")
async def generate_transcript(
    note_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """生成录音转录文本"""
    note = db.query(NoteDB).filter(
        NoteDB.id == note_id,
        NoteDB.user_id == user_id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    # TODO: 集成 Whisper API 或其他语音识别服务
    # 这里返回模拟数据
    note.transcript = "这是语音转录的模拟文本..."
    note.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "转录已生成", "transcript": note.transcript}

@app.post("/api/notes/{note_id}/summary")
async def generate_summary(
    note_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """生成 AI 摘要"""
    note = db.query(NoteDB).filter(
        NoteDB.id == note_id,
        NoteDB.user_id == user_id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    # TODO: 集成 Kimi/GLM API
    # 这里返回模拟数据
    note.summary = "• 关键要点 1\n• 关键要点 2\n• 关键要点 3"
    note.tags = ["工作", "会议"]
    note.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "摘要已生成", "summary": note.summary}

# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
