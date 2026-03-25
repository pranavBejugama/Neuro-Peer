import { useState, useEffect, useRef, useCallback } from "react";

// ─── Browser type declarations (not in all TS lib versions) ───────────────────

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare const SpeechRecognition: {
  new (): SpeechRecognition;
};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSpeechRecognitionOptions {
  language: "en-CA" | "fr-CA";
  onResult: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  continuous?: boolean;
}

export interface UseSpeechRecognitionReturn {
  start: () => void;
  stop: () => void;
  isListening: boolean;
  isSupported: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const [isListening, setIsListening] = useState(false);

  // Keep latest callbacks in refs so the recognition handlers never go stale
  const onResultRef = useRef(options.onResult);
  const onInterimRef = useRef(options.onInterim);
  onResultRef.current = options.onResult;
  onInterimRef.current = options.onInterim;

  // Whether we *want* to be listening (drives auto-restart)
  const shouldListenRef = useRef(false);

  // The live recognition instance
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Stable language ref so the restart logic always uses the latest value
  const languageRef = useRef(options.language);
  languageRef.current = options.language;

  const continuousRef = useRef(options.continuous ?? true);
  continuousRef.current = options.continuous ?? true;

  // ── Build / rebuild the recognition instance ───────────────────────────────

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!isSupported) return null;

    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const r = new SpeechRecognitionImpl();
    r.continuous = continuousRef.current;
    r.interimResults = true;
    r.lang = languageRef.current;

    r.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript) {
        onInterimRef.current?.(interimTranscript);
      }
      if (finalTranscript) {
        onResultRef.current(finalTranscript.trim());
      }
    };

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        console.warn("[SpeechRecognition] Microphone permission denied.");
        shouldListenRef.current = false;
        setIsListening(false);
      }
      // For other errors (aborted, network, etc.) — auto-restart will handle it
    };

    r.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (shouldListenRef.current) {
        try {
          recognitionRef.current?.start();
        } catch {
          // Already started — ignore
        }
      } else {
        setIsListening(false);
      }
    };

    return r;
  }, [isSupported]);

  // ── Start / Stop ───────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!isSupported) return;
    shouldListenRef.current = true;
    setIsListening(true);

    // Always create a fresh instance so language changes take effect
    recognitionRef.current?.stop();
    const r = createRecognition();
    recognitionRef.current = r;
    try {
      r?.start();
    } catch {
      // Guard against "already started" race
    }
  }, [isSupported, createRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Restart when language changes while listening ──────────────────────────

  useEffect(() => {
    if (isListening) {
      // Re-create recognition with new language
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.language]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return { start, stop, isListening, isSupported };
}
