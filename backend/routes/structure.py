import time
import anthropic
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()

_client: Optional[anthropic.Anthropic] = None

def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


class StructureRequest(BaseModel):
    transcript: str
    language: Optional[str] = "EN"


STRUCTURE_PROMPT_EN = """You are a note-taking assistant. The user has given you a messy verbal brain dump.
Convert it into clean, structured study notes with:
- A clear title
- Organized sections with headers
- Key concepts highlighted
- Any questions the student seems to have, listed separately

Keep the student's own words where possible. Output in clean Markdown."""

STRUCTURE_PROMPT_FR = """Tu es un assistant de prise de notes. L'utilisateur t'a donné un fouillis verbal.
Convertis-le en notes d'étude propres et structurées avec:
- Un titre clair
- Des sections organisées avec des titres
- Les concepts clés mis en évidence
- Les questions que l'étudiant semble avoir, listées séparément

Garde les mots de l'étudiant autant que possible. Réponds en Markdown propre."""


@router.post("/structure")
async def structure_notes(req: StructureRequest):
    try:
        if not req.transcript or not req.transcript.strip():
            return {"error": "Transcript is empty."}

        system = STRUCTURE_PROMPT_FR if req.language == "FR" else STRUCTURE_PROMPT_EN

        time.sleep(1)

        client = get_client()
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            system=system,
            messages=[{"role": "user", "content": req.transcript}],
        )

        structured = response.content[0].text
        return {"structured_notes": structured}

    except anthropic.APIError as e:
        return {"error": f"Claude API error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
