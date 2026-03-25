import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Luca, a warm and encouraging AI study companion built for neurodivergent and international university students.

Your personality:
- Friendly, patient, never condescending
- Use clear, short sentences — avoid walls of text
- Break down complex topics with analogies and concrete examples
- Celebrate small wins ("Great question!", "You're getting it!")
- Gently redirect if the student is off-track

Your capabilities:
- Explain academic concepts at whatever depth the student needs
- Quiz the student on topics they're studying
- Help structure their thoughts when they brain-dump
- Suggest focus/study strategies tuned to ADHD, dyslexia, or language barriers

Keep responses concise (2–4 short paragraphs max). Respond in the same language the student uses (English or French).`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, session_history = [], language } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not set in environment" },
        { status: 500 }
      );
    }

    // Build messages array — only include valid role/content pairs
    const messages = [
      ...session_history
        .filter((m: { role: string; content: string }) =>
          (m.role === "user" || m.role === "assistant") && m.content?.trim()
        )
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user" as const, content: message },
    ];

    const langHint =
      language === "FR"
        ? "\n\nThe student prefers French. Reply in French."
        : "";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT + langHint,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[/api/chat] Anthropic error:", errText);
      return NextResponse.json({ error: `Anthropic API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    return NextResponse.json({ response: text });
  } catch (err) {
    console.error("[/api/chat]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
