import os
from dotenv import load_dotenv

# Load env from backend/.env first, then fall back to root .env.local
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.chat import router as chat_router
from routes.upload import router as upload_router
from routes.structure import router as structure_router
from routes.summary import router as summary_router

app = FastAPI(title="The Adaptive Brain API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(structure_router)
app.include_router(summary_router)


@app.get("/")
async def health_check():
    return {"status": "ok"}
