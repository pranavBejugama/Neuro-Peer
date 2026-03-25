import { useRef, useState, useCallback } from "react";

// ─── D-ID Talks API (free tier) ───────────────────────────────────────────────
// Architecture: Claude generates text → we POST to /talks → D-ID renders a
// short video of the avatar speaking → we play it. ~5-10s delay is expected.
// Production upgrade: D-ID Streams API (paid) gives real-time WebRTC.

const DID_API = "https://api.d-id.com";

// Public D-ID sample presenter image (Adam) — replace with your own in production
export const AVATAR_IMAGE_URL =
  "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";

export interface UseDIDTalksReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  speak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDIDTalks(apiKey: string): UseDIDTalksReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(
    async (text: string) => {
      if (!apiKey || isSpeaking || !text.trim()) return;

      setIsSpeaking(true);
      setError(null);

      const authHeader = `Basic ${btoa(apiKey + ":")}`;

      try {
        // ── 1. Create the talk ──────────────────────────────────────────────
        const createRes = await fetch(`${DID_API}/talks`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_url: AVATAR_IMAGE_URL,
            script: {
              type: "text",
              input: text,
              provider: {
                type: "microsoft",
                voice_id: "en-US-GuyNeural",
              },
            },
            // Keep latency low — don't enhance for demo
            config: { fluent: false, pad_audio: 0 },
          }),
        });

        if (!createRes.ok) {
          const body = await createRes.json().catch(() => ({})) as { description?: string };
          throw new Error(body.description ?? `D-ID /talks returned ${createRes.status}`);
        }

        const { id } = await createRes.json() as { id: string };

        // ── 2. Poll until the video is ready (max 30 s) ────────────────────
        let resultUrl = "";
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));

          const pollRes = await fetch(`${DID_API}/talks/${id}`, {
            headers: { Authorization: authHeader },
          });

          if (!pollRes.ok) continue;

          const data = await pollRes.json() as {
            status: string;
            result_url?: string;
          };

          if (data.status === "done" && data.result_url) {
            resultUrl = data.result_url;
            break;
          }
          if (data.status === "error") {
            throw new Error("D-ID talk generation failed");
          }
        }

        if (!resultUrl) throw new Error("Timed out waiting for D-ID video");

        // ── 3. Play the video ──────────────────────────────────────────────
        const video = videoRef.current;
        if (video) {
          video.src = resultUrl;
          video.onended = () => setIsSpeaking(false);
          video.onerror = () => {
            setError("Could not play avatar video");
            setIsSpeaking(false);
          };
          await video.play().catch(() => {
            // Autoplay blocked — still clear speaking state
            setIsSpeaking(false);
          });
        } else {
          setIsSpeaking(false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "D-ID speak failed";
        setError(msg);
        setIsSpeaking(false);
        console.error("[D-ID Talks]", err);
      }
    },
    [apiKey, isSpeaking]
  );

  const clearError = useCallback(() => setError(null), []);

  return { videoRef, speak, isSpeaking, error, clearError };
}
