"""
EchoNote AI Service Module
Integrates Whisper API and Kimi/GLM API for:
- Voice transcription
- Automatic summarization
- Smart tagging
- Todo extraction
"""

import os
import httpx
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel

router = APIRouter()

# API Keys (should be in environment variables)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
KIMI_API_KEY = os.getenv("KIMI_API_KEY", "")
KIMI_BASE_URL = os.getenv("KIMI_BASE_URL", "https://api.moonshot.cn/v1")

class TranscribeRequest(BaseModel):
    audio_url: str

class TranscribeResponse(BaseModel):
    text: str
    confidence: float

class SummaryRequest(BaseModel):
    text: str
    max_length: int = 200

class SummaryResponse(BaseModel):
    summary: str
    key_points: List[str]

class TagRequest(BaseModel):
    text: str

class TagResponse(BaseModel):
    tags: List[str]

class TodoExtractRequest(BaseModel):
    text: str

class TodoExtractResponse(BaseModel):
    todos: List[dict]

@router.post("/ai/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
):
    """
    Transcribe audio using Whisper API
    """
    if not OPENAI_API_KEY:
        # Mock response for development
        return TranscribeResponse(
            text="这是语音转录的模拟文本。实际部署时需要配置 OpenAI API Key。",
            confidence=0.95
        )
    
    try:
        # Call Whisper API
        async with httpx.AsyncClient() as client:
            files = {"file": (audio_file.filename, audio_file.file, audio_file.content_type)}
            data = {"model": "whisper-1"}
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
            
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                files=files,
                data=data,
                headers=headers,
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Transcription failed")
            
            result = response.json()
            return TranscribeResponse(
                text=result.get("text", ""),
                confidence=0.95
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

@router.post("/ai/summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Generate AI summary using Kimi/GLM API
    """
    if not KIMI_API_KEY:
        # Mock response for development
        return SummaryResponse(
            summary="• 讨论了 Q2 产品规划和功能优先级\\n• 确定了 3 个核心功能方向\\n• 下周开始用户调研",
            key_points=["产品规划", "功能优先级", "用户调研"]
        )
    
    try:
        # Call Kimi API
        async with httpx.AsyncClient() as client:
            payload = {
                "model": "moonshot-v1-8k",
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个专业的会议记录摘要助手。请将以下文本转换为要点式摘要，使用 \"•\" 作为列表符号。"
                    },
                    {
                        "role": "user",
                        "content": f"请为以下内容生成摘要（不超过{request.max_length}字）：\\n\\n{request.text}"
                    }
                ],
                "temperature": 0.3
            }
            headers = {"Authorization": f"Bearer {KIMI_API_KEY}"}
            
            response = await client.post(
                f"{KIMI_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Summary generation failed")
            
            result = response.json()
            summary_text = result["choices"][0]["message"]["content"]
            
            # Extract key points
            key_points = [line.strip().replace("•", "").strip() 
                         for line in summary_text.split("\\n") 
                         if line.strip().startswith("•")]
            
            return SummaryResponse(
                summary=summary_text,
                key_points=key_points[:5]
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary error: {str(e)}")

@router.post("/ai/tags", response_model=TagResponse)
async def generate_tags(request: TagRequest):
    """
    Generate smart tags using Kimi AI
    """
    if not KIMI_API_KEY:
        # Fallback: Simple keyword-based tagging
        return _fallback_tags(request.text)
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": "moonshot-v1-8k",
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个智能标签生成助手。根据文本内容生成3-5个最相关的标签，用#开头，用逗号分隔。只返回标签，不要其他内容。示例：#产品规划,#功能优先级,#用户调研"
                    },
                    {
                        "role": "user",
                        "content": f"请为以下内容生成标签：\n\n{request.text[:1000]}"
                    }
                ],
                "temperature": 0.3
            }
            headers = {"Authorization": f"Bearer {KIMI_API_KEY}"}
            
            response = await client.post(
                f"{KIMI_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return _fallback_tags(request.text)
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse tags from response
            tags = []
            for tag in content.split(","):
                tag = tag.strip().replace("#", "")
                if tag and len(tag) > 0:
                    tags.append(tag)
            
            return TagResponse(tags=tags[:5] if tags else ["未分类"])
    except Exception as e:
        return _fallback_tags(request.text)

def _fallback_tags(text: str) -> TagResponse:
    """Fallback keyword-based tagging"""
    tags = []
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["会议", "讨论", "评审"]):
        tags.append("工作")
        tags.append("会议")
    if any(word in text_lower for word in ["产品", "功能", "需求", "规划"]):
        tags.append("产品")
    if any(word in text_lower for word in ["用户", "调研", "访谈"]):
        tags.append("用户研究")
    if any(word in text_lower for word in ["灵感", "想法", "创意"]):
        tags.append("灵感")
    if any(word in text_lower for word in ["待办", "任务", "todo"]):
        tags.append("待办")
    if any(word in text_lower for word in ["读书", "笔记", "学习"]):
        tags.append("学习")
    
    return TagResponse(tags=tags if tags else ["未分类"])

@router.post("/ai/extract-todos", response_model=TodoExtractResponse)
async def extract_todos(request: TodoExtractRequest):
    """
    Extract todo items from text using Kimi AI
    """
    if not KIMI_API_KEY:
        # Fallback: Simple pattern matching
        return _fallback_extract_todos(request.text)
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": "moonshot-v1-8k",
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个待办事项提取助手。从文本中提取所有待办事项，每行一个，格式：待办内容。只返回待办事项，不要编号或其他格式。"
                    },
                    {
                        "role": "user",
                        "content": f"请从以下内容中提取所有待办事项：\n\n{request.text[:2000]}"
                    }
                ],
                "temperature": 0.3
            }
            headers = {"Authorization": f"Bearer {KIMI_API_KEY}"}
            
            response = await client.post(
                f"{KIMI_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return _fallback_extract_todos(request.text)
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse todos from response
            todos = []
            for i, line in enumerate(content.split("\n")):
                line = line.strip()
                # Remove common prefixes
                for prefix in ["TODO:", "待办:", "-", "•", "[ ]", "[x]", f"{i+1}.", f"{i+1})"]:
                    line = line.replace(prefix, "").strip()
                
                if line and len(line) > 3:
                    todos.append({
                        "id": f"todo_{len(todos)+1}",
                        "text": line,
                        "completed": False
                    })
            
            return TodoExtractResponse(todos=todos)
    except Exception as e:
        return _fallback_extract_todos(request.text)

def _fallback_extract_todos(text: str) -> TodoExtractResponse:
    """Fallback pattern-based todo extraction"""
    todos = []
    lines = text.split("\n")
    
    for line in lines:
        line = line.strip()
        if any(marker in line for marker in ["TODO", "待办", "需要", "安排", "完成", "输出", "准备"]):
            for prefix in ["TODO:", "待办:", "-", "•", "[ ]", "[x]"]:
                line = line.replace(prefix, "").strip()
            
            if line and len(line) > 3:
                todos.append({
                    "id": f"todo_{len(todos)+1}",
                    "text": line,
                    "completed": False
                })
    
    return TodoExtractResponse(todos=todos)
