import time
import json
import re
import anthropic
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import os

router = APIRouter()

_client: Optional[anthropic.Anthropic] = None

def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


class SummaryRequest(BaseModel):
    session_history: Optional[list] = []
    uploaded_content: Optional[str] = ""


SUMMARY_SYSTEM = """You are a study session summarizer. Given a conversation history and any uploaded study material,
produce a concept map in JSON format.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "nodes": [
    {"id": "1", "title": "Concept Name", "description": "Brief one-sentence description"},
    ...
  ],
  "key_points": [
    "Key takeaway 1",
    "Key takeaway 2",
    ...
  ]
}

Include 3-7 concept nodes and 3-5 key points. Focus on what was actually discussed or studied."""


@router.post("/summary")
async def generate_summary(req: SummaryRequest):
    try:
        # Build context from session history
        history_text = ""
        for entry in (req.session_history or []):
            role = entry.get("role", "")
            content = entry.get("content", "")
            if role and content:
                history_text += f"{role.upper()}: {content}\n\n"

        if not history_text and not req.uploaded_content:
            return {
                "nodes": [],
                "key_points": ["No session data available to summarize."]
            }

        user_message = ""
        if req.uploaded_content:
            user_message += f"STUDY MATERIAL:\n{req.uploaded_content[:3000]}\n\n"
        if history_text:
            user_message += f"SESSION CONVERSATION:\n{history_text[:3000]}"

        time.sleep(1)

        client = get_client()
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=SUMMARY_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )

        raw = response.content[0].text.strip()

        # Extract JSON even if model wraps it
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(raw)

        return {
            "nodes": data.get("nodes", []),
            "key_points": data.get("key_points", []),
        }

    except (json.JSONDecodeError, ValueError) as e:
        return {"error": f"Failed to parse concept map: {str(e)}", "nodes": [], "key_points": []}
    except anthropic.APIError as e:
        return {"error": f"Claude API error: {str(e)}", "nodes": [], "key_points": []}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}", "nodes": [], "key_points": []}
