import os
import uuid
import json
import hashlib
import logging
import openai
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.chat_session import DatasetChatSession
from app.models.chat_message import DatasetChatMessage
from app.models.chat_cache import DatasetChatCache
from app.models.settings import UserSettings
from app.services.context_aggregator import compile_compressed_context
from app.core.logging_helper import log_application_error, log_user_activity

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    widget_id: Optional[str] = None

class RenameSessionRequest(BaseModel):
    title: str

def get_dataset_hash(dataset: Dataset) -> str:
    if os.path.exists(dataset.file_path):
        try:
            mtime = os.path.getmtime(dataset.file_path)
            size = os.path.getsize(dataset.file_path)
            return hashlib.md5(f"{dataset.id}_{mtime}_{size}".encode()).hexdigest()
        except Exception:
            pass
    return hashlib.md5(f"{dataset.id}".encode()).hexdigest()

@router.post("/api/chat/{dataset_id}")
async def chat_with_dataset(
    dataset_id: str,
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        ds_uuid = uuid.UUID(dataset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == ds_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # 1. Retrieve API Key
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    api_key = None
    if settings and settings.openai_key:
        api_key = settings.openai_key
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        
    if not api_key:
        raise HTTPException(status_code=400, detail="No OpenAI API key configured. Please set it in Settings.")
        
    # 2. Compile and Hash Context
    context_text = compile_compressed_context(
        dataset_id=ds_uuid,
        db=db,
        current_user=current_user,
        question=req.message,
        widget_id=req.widget_id
    )
    
    context_hash = hashlib.md5(context_text.encode()).hexdigest()
    dataset_hash = get_dataset_hash(dataset)
    cleaned_question = req.message.strip().lower()
    
    # 3. Response Caching Engine (Cache Hit Check)
    cached_entry = db.query(DatasetChatCache).filter(
        DatasetChatCache.question == cleaned_question,
        DatasetChatCache.dataset_hash == dataset_hash,
        DatasetChatCache.context_hash == context_hash
    ).first()
    
    if cached_entry:
        # Cache hit found! Return cached answer directly
        try:
            cached_data = json.loads(cached_entry.response_json)
            # Create session if session_id wasn't provided so UI has thread context
            active_session_id = req.session_id
            session_title = "Cached Conversation"
            
            if not active_session_id:
                new_session = DatasetChatSession(
                    id=uuid.uuid4(),
                    user_id=current_user.id,
                    dataset_id=ds_uuid,
                    title=req.message[:30] + "..." if len(req.message) > 30 else req.message
                )
                db.add(new_session)
                db.commit()
                db.refresh(new_session)
                active_session_id = str(new_session.id)
                session_title = new_session.title
            else:
                existing_session = db.query(DatasetChatSession).filter(DatasetChatSession.id == uuid.UUID(active_session_id)).first()
                if existing_session:
                    session_title = existing_session.title
            
            # Save message history logs even on cache hits to keep thread complete
            user_msg = DatasetChatMessage(
                id=uuid.uuid4(),
                session_id=uuid.UUID(active_session_id),
                role="user",
                content=req.message
            )
            assistant_msg = DatasetChatMessage(
                id=uuid.uuid4(),
                session_id=uuid.UUID(active_session_id),
                role="assistant",
                content=cached_data.get("answer", "")
            )
            db.add(user_msg)
            db.add(assistant_msg)
            
            # Update session timestamp
            db.query(DatasetChatSession).filter(DatasetChatSession.id == uuid.UUID(active_session_id)).update({
                DatasetChatSession.updated_at: datetime.utcnow()
            })
            
            db.commit()
            
            log_user_activity(db, current_user.id, "Chat With Dataset", f"Cache hit returned for query: '{req.message[:50]}'")
            
            return {
                "answer": cached_data.get("answer"),
                "sources": cached_data.get("sources", []),
                "session_id": active_session_id,
                "session_title": session_title,
                "cache_hit": True
            }
        except Exception as e:
            logger.warning(f"Failed to process cached chat entry: {e}")
            pass
            
    # Cache Miss flow: Call OpenAI & compile conversation history
    # 4. Resolve Chat Session
    if req.session_id:
        try:
            sess_uuid = uuid.UUID(req.session_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid session ID format")
            
        session = db.query(DatasetChatSession).filter(DatasetChatSession.id == sess_uuid, DatasetChatSession.user_id == current_user.id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        # Create a new session
        session = DatasetChatSession(
            id=uuid.uuid4(),
            user_id=current_user.id,
            dataset_id=ds_uuid,
            title=req.message[:30] + "..." if len(req.message) > 30 else req.message
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
    # Save the user query to thread logs
    user_msg = DatasetChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    db.commit()
    
    # 5. Compile History & Summarization
    all_msgs = db.query(DatasetChatMessage).filter(DatasetChatMessage.session_id == session.id).order_by(DatasetChatMessage.created_at.asc()).all()
    
    client = openai.OpenAI(api_key=api_key)
    
    # Conversation Summarization check (when exchanges grow long, summarize history before the last 5 messages)
    if len(all_msgs) >= 6:
        try:
            history_to_summarize = all_msgs[:-5]
            summary_prompt = "Summarize the following past conversation history between a User and their Analytics Assistant into a single concise paragraph. Focus on core queries and insights:\n"
            if session.conversation_summary:
                summary_prompt += f"Existing Summary: {session.conversation_summary}\n"
            for m in history_to_summarize:
                summary_prompt += f"{m.role.upper()}: {m.content}\n"
                
            sum_res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful summarizer assistant."},
                    {"role": "user", "content": summary_prompt}
                ]
            )
            session.conversation_summary = sum_res.choices[0].message.content.strip()
            db.commit()
            
            # Filter all_msgs to only contain the last 5 messages for final prompt context
            active_history = all_msgs[-5:]
        except Exception as e:
            logger.warning(f"Failed to summarize chat session: {e}")
            active_history = all_msgs
    else:
        active_history = all_msgs
        
    # 6. Build final LLM messages array
    messages = []
    
    # System role
    system_role = (
        "You are SmartDG Analytics Copilot.\n"
        "You are a senior business analyst.\n"
        "Answer questions using only the provided dataset intelligence.\n"
        "Use:\n"
        "* KPIs\n"
        "* Forecasts\n"
        "* Correlations\n"
        "* AI Insights\n"
        "* Reports\n"
        "Do not invent facts.\n"
        "If information is unavailable, explicitly say so.\n"
        "You must respond ONLY with a JSON object containing precisely two keys:\n"
        '1. "answer" (string): The response text to the user.\n'
        '2. "sources" (list of strings): The specific sources of intelligence referenced in this answer. '
        'Valid sources are: ["Profile Analysis", "KPI Analysis", "Forecast Results", "AI Insights", "Reports"].'
    )
    messages.append({"role": "system", "content": system_role})
    
    # Context payload
    messages.append({"role": "system", "content": f"Here is the pre-computed dataset intelligence context:\n\n{context_text}"})
    
    # Prepend conversation summary if available
    if session.conversation_summary:
        messages.append({"role": "system", "content": f"Context Summary of previous conversation thread: {session.conversation_summary}"})
        
    # Add active history messages (excluding the last one which is current user_msg since we append user_msg as user role)
    for m in active_history[:-1]:
        messages.append({"role": m.role, "content": m.content})
        
    # Add current user message
    messages.append({"role": "user", "content": req.message})
    
    # 7. Call OpenAI with JSON response format constraint
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=messages,
            temperature=0.2
        )
        
        raw_res = completion.choices[0].message.content.strip()
        res_data = json.loads(raw_res)
        
        answer = res_data.get("answer", "I could not compile a response based on the dataset intelligence.")
        sources = res_data.get("sources", [])
    except Exception as e:
        log_application_error(db, current_user.id, f"/api/chat/{dataset_id}", "LLMError", f"Failed to call OpenAI or parse response: {str(e)}")
        # Fallback response
        answer = f"Error generating copilot response: {str(e)}"
        sources = []
        res_data = {"answer": answer, "sources": sources}
        raw_res = json.dumps(res_data)
        
    # Save Assistant Response message
    assistant_msg = DatasetChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="assistant",
        content=answer
    )
    db.add(assistant_msg)
    
    # Save Cache record
    new_cache = DatasetChatCache(
        id=uuid.uuid4(),
        question=cleaned_question,
        dataset_hash=dataset_hash,
        context_hash=context_hash,
        response_json=raw_res
    )
    db.add(new_cache)
    
    # Update Session updated_at timestamp
    session.updated_at = datetime.utcnow()
    db.commit()
    
    log_user_activity(db, current_user.id, "Chat With Dataset", f"Generated answer for query: '{req.message[:50]}'")
    
    return {
        "answer": answer,
        "sources": sources,
        "session_id": str(session.id),
        "session_title": session.title,
        "cache_hit": False
    }

@router.get("/api/chat/sessions/{dataset_id}")
async def list_chat_sessions(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        ds_uuid = uuid.UUID(dataset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dataset ID format")
        
    dataset = db.query(Dataset).filter(Dataset.id == ds_uuid, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    sessions = db.query(DatasetChatSession).filter(
        DatasetChatSession.dataset_id == ds_uuid,
        DatasetChatSession.user_id == current_user.id
    ).order_by(DatasetChatSession.updated_at.desc()).all()
    
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "conversation_summary": s.conversation_summary
        }
        for s in sessions
    ]

@router.put("/api/chat/sessions/{session_id}")
async def rename_chat_session(
    session_id: str,
    req: RenameSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        sess_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
        
    session = db.query(DatasetChatSession).filter(DatasetChatSession.id == sess_uuid, DatasetChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    session.title = req.title
    db.commit()
    
    return {"status": "success", "title": session.title}

@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        sess_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
        
    session = db.query(DatasetChatSession).filter(DatasetChatSession.id == sess_uuid, DatasetChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    db.query(DatasetChatMessage).filter(DatasetChatMessage.session_id == session.id).delete()
    db.delete(session)
    db.commit()
    
    return {"status": "success", "message": "Session and message history deleted."}

@router.get("/api/chat/messages/{session_id}")
async def list_chat_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        sess_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
        
    session = db.query(DatasetChatSession).filter(DatasetChatSession.id == sess_uuid, DatasetChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    messages = db.query(DatasetChatMessage).filter(
        DatasetChatMessage.session_id == sess_uuid
    ).order_by(DatasetChatMessage.created_at.asc()).all()
    
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at
        }
        for m in messages
    ]
