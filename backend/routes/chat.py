import time
import anthropic
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from prompts import build_system_prompt

router = APIRouter()

_client: Optional[anthropic.Anthropic] = None

def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


class UserProfile(BaseModel):
    name: Optional[str] = "Student"
    challenges: Optional[list] = []
    goals: Optional[str] = ""
    uploaded_content_summary: Optional[str] = ""


class ChatRequest(BaseModel):
    message: str
    session_history: Optional[list] = []
    user_profile: Optional[UserProfile] = None
    language: Optional[str] = "EN"


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        profile = req.user_profile or UserProfile()
        system_prompt = build_system_prompt(
            language=req.language or "EN",
            student_name=profile.name or "Student",
            challenges=profile.challenges or [],
            goals=profile.goals or "",
            content_summary=profile.uploaded_content_summary or "",
        )

        # Build messages from session history
        messages = []
        for entry in (req.session_history or []):
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": req.message})

        # Rate limit: stay within free tier (5 req/min)
        time.sleep(1)

        client = get_client()
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=system_prompt,
            messages=messages,
        )

        reply = response.content[0].text
        return {"response": reply}

    except anthropic.APIError as e:
        return {"error": f"Claude API error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
