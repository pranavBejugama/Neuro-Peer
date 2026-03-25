const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
// Chat is served by the built-in Next.js API route so it works without the Python backend
const CHAT_URL = "/api/chat";

export interface UserProfile {
  name?: string;
  challenges?: string[];
  goals?: string;
  uploaded_content_summary?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  session_history?: ChatMessage[];
  user_profile?: UserProfile;
  language?: "EN" | "FR";
}

export interface ChatResponse {
  response?: string;
  error?: string;
}

export interface StructureRequest {
  transcript: string;
  language?: "EN" | "FR";
}

export interface StructureResponse {
  structured_notes?: string;
  error?: string;
}

export interface ConceptNode {
  id: string;
  title: string;
  description: string;
}

export interface SummaryRequest {
  session_history?: ChatMessage[];
  uploaded_content?: string;
}

export interface SummaryResponse {
  nodes?: ConceptNode[];
  key_points?: string[];
  error?: string;
}

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  return res.json();
}

export async function uploadFile(
  file: File
): Promise<{ content?: string; filename?: string; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function structureNotes(
  req: StructureRequest
): Promise<StructureResponse> {
  const res = await fetch(`${API_BASE}/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Structure request failed: ${res.status}`);
  return res.json();
}

export async function generateSummary(
  req: SummaryRequest
): Promise<SummaryResponse> {
  const res = await fetch(`${API_BASE}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Summary request failed: ${res.status}`);
  return res.json();
}
