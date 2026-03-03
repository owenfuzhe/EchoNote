"""
EchoNote Backend Recording Module
FastAPI + SQLAlchemy + JWT
处理音频文件上传、存储和元数据管理
"""

import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Integer, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 复用 auth.py 中的认证依赖
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth import get_current_user, User, get_db

# =============================================================================
# Configuration
# =============================================================================

# 上传目录配置
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
RECORDINGS_DIR = UPLOAD_DIR / "recordings"

# 确保上传目录存在
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# 支持的音频格式
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/wav": ".wav",
    "audio/wave": ".wav",
    "audio/x-wav": ".wav",
}

# 最大文件大小 (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024


# =============================================================================
# Database Model
# =============================================================================

Base = declarative_base()

engine = create_engine(os.getenv("DATABASE_URL", "postgresql://user:password@localhost/echonote"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Recording(Base):
    """录音文件数据库模型"""
    __tablename__ = "recordings"
    
    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), index=True, nullable=False)  # 关联用户
    filename = Column(String(255), nullable=False)  # 原始文件名
    file_path = Column(String(500), nullable=False)  # 存储路径
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    duration = Column(Integer, nullable=True)  # 音频时长（秒）
    mime_type = Column(String(100), nullable=False)  # MIME类型
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# 创建表
Base.metadata.create_all(bind=engine)


# =============================================================================
# Pydantic Schemas
# =============================================================================

class RecordingResponse(BaseModel):
    """录音响应模型"""
    id: str
    filename: str
    file_size: int
    duration: Optional[int] = None
    mime_type: str
    url: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecordingUploadResponse(BaseModel):
    """录音上传响应模型"""
    id: str
    filename: str
    duration: Optional[int] = None
    url: str
    message: str = "Upload successful"


class ErrorResponse(BaseModel):
    """错误响应模型"""
    detail: str
    code: Optional[str] = None


# =============================================================================
# Utility Functions
# =============================================================================

def generate_recording_id() -> str:
    """生成唯一录音ID"""
    return str(uuid.uuid4())


def get_file_extension(content_type: str) -> Optional[str]:
    """根据Content-Type获取文件扩展名"""
    return ALLOWED_AUDIO_TYPES.get(content_type)


def is_valid_audio_type(content_type: str) -> bool:
    """检查是否为支持的音频类型"""
    return content_type in ALLOWED_AUDIO_TYPES


def get_audio_duration(file_path: str) -> Optional[int]:
    """
    获取音频文件时长（秒）
    尝试使用 mutagen 库，如果不存在则返回 None
    """
    try:
        from mutagen.mp3 import MP3
        from mutagen.mp4 import MP4
        from mutagen.wave import WAVE
        
        file_path_lower = file_path.lower()
        
        if file_path_lower.endswith('.mp3'):
            audio = MP3(file_path)
        elif file_path_lower.endswith('.m4a'):
            audio = MP4(file_path)
        elif file_path_lower.endswith('.wav'):
            audio = WAVE(file_path)
        else:
            return None
        
        return int(audio.info.length) if audio.info else None
    except Exception:
        # mutagen 未安装或解析失败
        return None


def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    """保存上传的文件到指定路径"""
    try:
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.seek(0)


# =============================================================================
# API Router
# =============================================================================

router = APIRouter(prefix="/api/recordings", tags=["recordings"])


@router.post("/upload", response_model=RecordingUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    file: UploadFile = File(..., description="音频文件 (mp3, m4a, wav)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    上传音频文件
    
    **支持格式**: mp3, m4a, wav
    **文件大小限制**: 50MB
    
    - **file**: 音频文件
    - **返回**: 录音ID、文件名、时长、访问URL
    """
    # 验证文件类型
    content_type = file.content_type or "application/octet-stream"
    
    if not is_valid_audio_type(content_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"不支持的音频格式: {content_type}. 支持格式: mp3, m4a, wav"
        )
    
    # 读取文件内容验证大小
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件过大: {file_size / 1024 / 1024:.2f}MB. 最大限制: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件为空"
        )
    
    # 生成唯一文件名
    recording_id = generate_recording_id()
    file_extension = get_file_extension(content_type)
    stored_filename = f"{recording_id}{file_extension}"
    file_path = RECORDINGS_DIR / stored_filename
    
    try:
        # 保存文件
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 获取音频时长
        duration = get_audio_duration(str(file_path))
        
        # 创建数据库记录
        recording = Recording(
            id=recording_id,
            user_id=current_user.id,
            filename=file.filename or f"recording{file_extension}",
            file_path=str(file_path),
            file_size=file_size,
            duration=duration,
            mime_type=content_type,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(recording)
        db.commit()
        db.refresh(recording)
        
        # 构建访问URL
        url = f"/api/recordings/{recording_id}"
        
        return RecordingUploadResponse(
            id=recording_id,
            filename=recording.filename,
            duration=duration,
            url=url
        )
        
    except Exception as e:
        # 清理已保存的文件
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件上传失败: {str(e)}"
        )


@router.get("/{recording_id}", response_class=FileResponse)
async def get_recording(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取录音文件（流式下载/播放）
    
    - **recording_id**: 录音ID
    - **返回**: 音频文件流
    """
    # 查询录音记录
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="录音不存在"
        )
    
    # 验证权限（只能访问自己的录音）
    if recording.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此录音"
        )
    
    # 检查文件是否存在
    file_path = Path(recording.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="录音文件已丢失"
        )
    
    return FileResponse(
        path=str(file_path),
        filename=recording.filename,
        media_type=recording.mime_type
    )


@router.get("/{recording_id}/info", response_model=RecordingResponse)
async def get_recording_info(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取录音元数据信息
    
    - **recording_id**: 录音ID
    - **返回**: 录音详细信息
    """
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="录音不存在"
        )
    
    if recording.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此录音"
        )
    
    # 构建URL
    url = f"/api/recordings/{recording_id}"
    
    return RecordingResponse(
        id=recording.id,
        filename=recording.filename,
        file_size=recording.file_size,
        duration=recording.duration,
        mime_type=recording.mime_type,
        url=url,
        created_at=recording.created_at
    )


@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    删除录音文件
    
    - **recording_id**: 录音ID
    - **返回**: 204 No Content
    """
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="录音不存在"
        )
    
    if recording.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此录音"
        )
    
    # 删除物理文件
    file_path = Path(recording.file_path)
    if file_path.exists():
        file_path.unlink()
    
    # 删除数据库记录
    db.delete(recording)
    db.commit()
    
    return None


# =============================================================================
# App Factory (用于集成到主应用)
# =============================================================================

def create_recordings_app() -> FastAPI:
    """创建独立的录音服务应用"""
    app = FastAPI(
        title="EchoNote Recording API",
        description="音频文件上传和管理接口",
        version="1.0.0"
    )
    app.include_router(router)
    
    @app.get("/health")
    async def health_check():
        """健康检查"""
        return {"status": "healthy", "service": "recordings"}
    
    return app


# 独立运行时的应用实例
app = create_recordings_app()


# =============================================================================
# Tests
# =============================================================================

if __name__ == "__main__":
    import unittest
    from fastapi.testclient import TestClient
    
    # 测试配置
    TEST_UPLOAD_DIR = Path("test_uploads")
    TEST_UPLOAD_DIR.mkdir(exist_ok=True)
    
    class TestRecordingAPI(unittest.TestCase):
        def setUp(self):
            self.client = TestClient(app)
            # 创建测试数据库
            test_engine = create_engine("sqlite:///./test_recordings.db", connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=test_engine)
        
        def test_health_check(self):
            """测试健康检查"""
            response = self.client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["service"], "recordings")
    
    unittest.main(argv=[''], verbosity=2, exit=False)
