"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  User,
  Clock,
  Settings,
  Send,
  Brain,
  Upload,
  Pause,
  Play,
  SkipForward,
  Zap,
  Coffee,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import type { CardData } from "@/components/ui/morphing-card-stack";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePomodoro, type PomodoroPhase } from "@/hooks/usePomodoro";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useDIDAgent } from "@/hooks/useDIDAgent";
import {
  sendMessage as apiSendMessage,
  uploadFile as apiUploadFile,
  type ChatMessage,
} from "@/lib/claude";

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = "en" | "fr";
type Mode = "chat" | "brain_dump" | "quiz";

interface Message {
  id: string;
  sender: "luca" | "user";
  text: string;
  timestamp: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "luca",
    text: "Hey! I'm Luca, your study buddy. I can see you've uploaded notes on Cell Biology — great choice for tomorrow's midterm. Want to start with the stuff that trips most students up?",
    timestamp: new Date(),
  },
  {
    id: "2",
    sender: "user",
    text: "Yes please! I always mix up prokaryotes and eukaryotes.",
    timestamp: new Date(),
  },
  {
    id: "3",
    sender: "luca",
    text: "Totally normal — let's fix that! Think of prokaryotes as the \"minimalists\" of the cell world: no nucleus, no membrane-bound organelles, just DNA floating in the cytoplasm. Does that image help?",
    timestamp: new Date(),
  },
];

const SESSIONS_BEFORE_LONG = 4;

const STUDY_CARDS: CardData[] = [
  {
    id: "cell-structure",
    title: "Cell Structure",
    description: "Prokaryotes: no nucleus, no membrane-bound organelles — just DNA floating in cytoplasm (bacteria, archaea).\n\nEukaryotes: true nucleus + organelles — mitochondria, ER, Golgi. All animals, plants, fungi.",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    id: "mitochondria",
    title: "Mitochondria",
    description: "The powerhouse of the cell. Converts glucose → ATP via cellular respiration.\n\nHas its own DNA (endosymbiotic theory). Inner membrane folds = cristae. Matrix = where Krebs cycle happens.",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    id: "cell-membrane",
    title: "Cell Membrane",
    description: "Phospholipid bilayer — hydrophilic heads face out, hydrophobic tails face in.\n\nFluid mosaic model: proteins float within the bilayer. Controls what enters/exits via selective permeability.",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "dna-replication",
    title: "DNA & Replication",
    description: "Double helix: adenine–thymine, guanine–cytosine base pairs.\n\nSemi-conservative replication: each new strand uses one original strand as a template. Helicase unzips, DNA polymerase builds.",
    icon: <Coffee className="h-5 w-5" />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getPomodoroLabel(
  phase: PomodoroPhase,
  currentSession: number
): string {
  if (phase !== "focus") {
    const type = phase === "long_break" ? "Long break" : "Short break";
    return `Break time! · ${type}`;
  }
  const n = ((currentSession - 1) % SESSIONS_BEFORE_LONG) + 1;
  return `Focus session · Pomodoro ${n}/${SESSIONS_BEFORE_LONG}`;
}

function phaseTotal(phase: PomodoroPhase): number {
  if (phase === "focus") return 25 * 60;
  if (phase === "short_break") return 5 * 60;
  return 15 * 60;
}

// Truncate to first sentence — keeps D-ID credit usage low for demo
function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 150);
}

function messagesAsChatHistory(msgs: Message[]): ChatMessage[] {
  return msgs
    .filter((m) => m.sender === "luca" || m.sender === "user")
    .map((m) => ({
      role: m.sender === "luca" ? "assistant" : "user",
      content: m.text,
    }));
}

// ─── Nav links ────────────────────────────────────────────────────────────────

const navLinks = [
  {
    label: "Session",
    href: "/session",
    icon: <LayoutDashboard size={18} className="text-[#8B89A0] shrink-0" />,
  },
  {
    label: "Profile",
    href: "/setup",
    icon: <User size={18} className="text-[#8B89A0] shrink-0" />,
  },
  {
    label: "History",
    href: "#",
    icon: <Clock size={18} className="text-[#8B89A0] shrink-0" />,
  },
];

const settingsLink = {
  label: "Settings",
  href: "#",
  icon: <Settings size={18} className="text-[#8B89A0] shrink-0" />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [language, setLanguage] = useState<Language>("en");
  const [mode, setMode] = useState<Mode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedContent, setUploadedContent] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [didErrorDismissed, setDidErrorDismissed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── D-ID Agent avatar ───────────────────────────────────────────────────────
  const {
    connect: didConnect,
    disconnect: didDisconnect,
    speak: didSpeak,
    isConnected: didConnected,
    isLoading: didLoading,
    videoRef,
    error: didError,
    connectionState,
  } = useDIDAgent(
    process.env.NEXT_PUBLIC_DID_AGENT_ID || "",
    process.env.NEXT_PUBLIC_DID_CLIENT_KEY || ""
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const addMessage = useCallback((sender: "luca" | "user", text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender, text, timestamp: new Date() },
    ]);
  }, []);

  // Speak via D-ID — truncate to first sentence to keep responses snappy
  const speak = useCallback(
    (text: string) => {
      didSpeak(firstSentence(text));
    },
    [didSpeak]
  );

  // ── Chat API flow ───────────────────────────────────────────────────────────

  const submitToLuca = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

      addMessage("user", text.trim());
      setIsThinking(true);

      try {
        const history = messagesAsChatHistory(messages);
        const res = await apiSendMessage({
          message: text.trim(),
          session_history: history,
          language: language.toUpperCase() as "EN" | "FR",
          user_profile: uploadedContent
            ? { uploaded_content_summary: uploadedContent.slice(0, 500) }
            : undefined,
        });

        if (res.error) {
          addMessage("luca", `Sorry, I ran into an issue: ${res.error}`);
        } else if (res.response) {
          addMessage("luca", res.response);
          speak(res.response);
        }
      } catch (err) {
        addMessage("luca", "I couldn't reach the server. Is the backend running?");
        console.error("[chat]", err);
      } finally {
        setIsThinking(false);
      }
    },
    [messages, language, uploadedContent, isThinking, addMessage]
  );

  // ── Text input send ─────────────────────────────────────────────────────────

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setInterimText("");
    submitToLuca(text);
  }

  // ── File upload ─────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    addMessage("luca", `Uploading "${file.name}"…`);
    try {
      const res = await apiUploadFile(file);
      if (res.error) {
        addMessage("luca", `Couldn't read that file: ${res.error}`);
      } else if (res.content) {
        setUploadedContent(res.content);
        setUploadedFilename(res.filename ?? file.name);
        addMessage(
          "luca",
          `Got it! I've read "${res.filename ?? file.name}". Ask me anything about it — I'm ready. 📄`
        );
      }
    } catch (err) {
      addMessage("luca", "Upload failed — is the backend running?");
      console.error("[upload]", err);
    }
  }

  // ── Speech recognition ──────────────────────────────────────────────────────

  const speechLang = language === "fr" ? "fr-CA" : "en-CA";

  const speech = useSpeechRecognition({
    language: speechLang,
    continuous: true,
    onInterim: (text) => setInterimText(text),
    onResult: (text) => {
      setInterimText("");
      submitToLuca(text);
    },
  });

  function toggleMic() {
    if (!speech.isSupported) return;
    if (speech.isListening) {
      speech.stop();
      setInterimText("");
    } else {
      speech.start();
    }
  }

  // ── Pomodoro ────────────────────────────────────────────────────────────────

  const pomodoro = usePomodoro({ sessionsBeforeLong: SESSIONS_BEFORE_LONG });
  const { state: pState } = pomodoro;

  useEffect(() => {
    pomodoro.onPhaseChange((_phase, message) => {
      addMessage("luca", message);
      speak(message);
    });
  }, [pomodoro.onPhaseChange, addMessage]);

  // Detect speech recognition support client-side only (avoids SSR/hydration mismatch)
  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }, []);

  // Reset error dismiss when a new D-ID error arrives
  useEffect(() => {
    if (didError) setDidErrorDismissed(false);
  }, [didError]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  // ── Derived display ─────────────────────────────────────────────────────────

  const isBreak = pState.phase !== "focus";
  const timerColor = isBreak ? "text-[#34D399]" : "text-white";
  const barColor = isBreak ? "bg-[#34D399]" : "bg-white";
  const pomodoroLabel = getPomodoroLabel(pState.phase, pState.currentSession);
  const displayInput = interimText || inputText;

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans">

      {/* ── LEFT: Sidebar ───────────────────────────────────────────────── */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
        <SidebarBody className="bg-[#0A0A0A] border-r border-white/[0.08] justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center text-black font-bold text-sm shrink-0">
                N
              </div>
              {sidebarOpen && (
                <span className="text-[#E8E6F0] font-semibold text-sm whitespace-nowrap tracking-tight">
                  Neuro Peer
                </span>
              )}
            </div>

            {/* Nav links */}
            <div className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = link.href === "/session";
                return (
                  <SidebarLink
                    key={link.label}
                    link={link}
                    className={cn(
                      "rounded-lg px-2 py-2 text-[#8B89A0] hover:text-[#E8E6F0] hover:bg-[#111111] transition-colors",
                      isActive &&
                        "text-white [&>span]:text-white [&>svg]:text-white"
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* Settings at bottom */}
          <SidebarLink
            link={settingsLink}
            className="rounded-lg px-2 py-2 text-[#8B89A0] hover:text-[#E8E6F0] hover:bg-[#111111] transition-colors"
          />
        </SidebarBody>
      </Sidebar>

      {/* ── CENTER + RIGHT ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── CENTER ──────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-y-auto">

          {/* ── Avatar panel ──────────────────────────────────────────────── */}
          <div
            className="flex-1 min-h-[480px] m-3 mb-0 bg-[#0A0A0A] border border-white/[0.08] rounded-xl relative overflow-hidden flex items-center justify-center"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {/* D-ID video — fills container; SDK sets srcObject/src directly */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-xl"
            />

            {/* Placeholder overlay — shown when not yet connected */}
            {!didConnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={didConnect}
                  disabled={didLoading}
                  className="flex flex-col items-center gap-4 group focus:outline-none"
                >
                  <div className={cn(
                    "w-[120px] h-[120px] rounded-full border-2 bg-[#111111] flex items-center justify-center transition-all duration-300",
                    didLoading
                      ? "border-white/60 animate-pulse"
                      : "border-white/20 group-hover:border-white/50 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                  )}>
                    {didLoading
                      ? <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : <User size={52} className="text-white/40 group-hover:text-white/60 transition-colors" />
                    }
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-[#E8E6F0] font-medium text-sm">Luca</p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        didLoading ? "bg-[#FBBF24] animate-pulse" : "bg-[#5C5A6E] group-hover:bg-white/60"
                      )} />
                      <span className="text-[#8B89A0] text-xs">
                        {didLoading ? "Connecting…" : "Click to connect Luca"}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Status pill — top-left */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/[0.08]">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                didConnected
                  ? "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                  : didLoading
                  ? "bg-[#FBBF24] animate-pulse"
                  : "bg-[#5C5A6E]"
              )} />
              <span className="text-[#8B89A0] text-[11px] capitalize">{connectionState}</span>
              {didConnected && (
                <button
                  onClick={didDisconnect}
                  className="ml-1 text-[#5C5A6E] hover:text-[#F87171] text-[11px] transition-colors"
                  title="Disconnect"
                >✕</button>
              )}
            </div>

            {/* Camera PIP */}
            <div className="absolute top-3 right-3 w-[140px] h-[105px] rounded-lg border border-white/[0.08] bg-black overflow-hidden flex items-center justify-center">
              <span className="text-[#5C5A6E] text-xs">Camera</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            </div>

            {/* D-ID error toast — dismissible */}
            {didError && !didErrorDismissed && (
              <div className="absolute bottom-3 left-3 right-3 flex items-start gap-2 bg-[#111111] border border-[#F87171]/20 rounded-lg px-3 py-2.5">
                <span className="text-[#F87171] text-[11px] flex-1 leading-relaxed">
                  Avatar unavailable: {didError}. Chat still works normally.
                </span>
                <button
                  onClick={() => setDidErrorDismissed(true)}
                  className="text-[#5C5A6E] hover:text-[#8B89A0] text-[11px] shrink-0 mt-px"
                >✕</button>
              </div>
            )}

            {/* Uploaded file badge */}
            {uploadedFilename && !didError && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#111111] border border-white/[0.08] rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="text-[#8B89A0] text-[11px] max-w-[180px] truncate">
                  {uploadedFilename}
                </span>
              </div>
            )}
          </div>

          {/* ── Pomodoro strip ────────────────────────────────────────────── */}
          <div className="mx-3 my-2 bg-[#0A0A0A] border border-white/[0.08] rounded-lg px-4 py-2.5 flex items-center gap-4">
            <span
              className={cn(
                "font-mono text-xl tabular-nums tracking-wider w-[72px] shrink-0 transition-colors duration-500",
                timerColor,
                isBreak && "animate-pulse"
              )}
            >
              {formatTime(pState.secondsRemaining)}
            </span>

            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <span className="text-[#8B89A0] text-[11px] font-medium truncate">
                {pState.isRunning || pState.secondsRemaining < phaseTotal(pState.phase)
                  ? pomodoroLabel
                  : "Ready to start"}
              </span>
              <div className="h-1 bg-[#111111] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000", barColor)}
                  style={{ width: `${pState.progress * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={pState.isRunning ? pomodoro.pause : pomodoro.start}
                title={pState.isRunning ? "Pause" : "Start"}
                className="w-7 h-7 rounded-md border border-white/[0.08] flex items-center justify-center text-[#8B89A0] hover:text-[#E8E6F0] hover:bg-[#111111] transition-colors"
              >
                {pState.isRunning ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                onClick={pomodoro.skip}
                title="Skip to next phase"
                className="w-7 h-7 rounded-md border border-white/[0.08] flex items-center justify-center text-[#8B89A0] hover:text-[#E8E6F0] hover:bg-[#111111] transition-colors"
              >
                <SkipForward size={13} />
              </button>
            </div>
          </div>

          {/* ── Study Tips card stack ─────────────────────────────────────── */}
          <div className="mx-3 mt-2 mb-3 bg-[#0A0A0A] border border-white/[0.08] rounded-xl p-4">
            <p className="text-[11px] font-medium text-[#5C5A6E] uppercase tracking-widest mb-3">
              Cell Biology — Midterm Notes
            </p>
            <div className="grid grid-cols-2 gap-3">
              {STUDY_CARDS.map((card) => (
                <div
                  key={card.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.10] p-4"
                  style={{ backgroundColor: "#000000" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center text-white/50 shrink-0">
                      {card.icon}
                    </div>
                    <p className="text-[13px] font-semibold text-white leading-tight">{card.title}</p>
                  </div>
                  <div className="space-y-1.5">
                    {card.description.split("\n\n").map((para, i) => (
                      <p key={i} className="text-[11.5px] text-white/50 leading-relaxed">{para}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Chat panel ───────────────────────────────────────────── */}
        <div className="w-96 shrink-0 flex flex-col bg-[#0A0A0A] border-l border-white/[0.08] overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-[#E8E6F0]">Chat with Luca</span>
            <div className="flex bg-[#111111] rounded-md p-0.5 gap-0.5">
              {(["en", "fr"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all",
                    language === lang
                      ? "bg-white/10 text-white"
                      : "text-[#5C5A6E] hover:text-[#8B89A0]"
                  )}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Session chips */}
          <div className="px-4 py-2.5 flex items-center gap-1.5 shrink-0 border-b border-white/[0.08] overflow-x-auto scrollbar-none">
            {["Cell Biology", "Midterm Prep", "Ch. 3"].map((chip) => (
              <span
                key={chip}
                className="shrink-0 rounded-full bg-[#111111] border border-white/[0.08] text-[#8B89A0] text-xs px-2.5 py-1"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                <span className="text-[11px] text-[#5C5A6E] mb-1 px-1">
                  {msg.sender === "luca" ? "Luca" : "You"}
                </span>
                <div
                  className={cn(
                    "px-3.5 py-2.5 max-w-[85%]",
                    msg.sender === "luca"
                      ? "bg-[#111111] border border-white/[0.08] rounded-[14px] rounded-bl-[4px]"
                      : "bg-white/[0.08] border border-white/[0.12] rounded-[14px] rounded-br-[4px]"
                  )}
                >
                  <p className="text-[13px] text-[#E8E6F0] leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Interim speech bubble */}
            {interimText && (
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-[#5C5A6E] mb-1 px-1">You</span>
                <div className="px-3.5 py-2.5 max-w-[85%] bg-white/[0.06] border border-white/[0.1] rounded-[14px] rounded-br-[4px]">
                  <p className="text-[13px] text-[#8B89A0] leading-relaxed italic">
                    {interimText}
                  </p>
                </div>
              </div>
            )}

            {/* Luca thinking indicator */}
            {isThinking && (
              <div className="flex flex-col items-start">
                <span className="text-[11px] text-[#5C5A6E] mb-1 px-1">Luca</span>
                <div className="px-3.5 py-3 bg-[#111111] border border-white/[0.08] rounded-[14px] rounded-bl-[4px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5C5A6E] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5C5A6E] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5C5A6E] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Brain dump toggle */}
          <div className="px-4 pb-2 shrink-0 flex">
            <button
              onClick={() => setMode((m) => (m === "brain_dump" ? "chat" : "brain_dump"))}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all",
                mode === "brain_dump"
                  ? "bg-[#FBBF24]/20 border-[#FBBF24]/40 text-[#FBBF24]"
                  : "bg-[#FBBF24]/12 border-[#FBBF24]/20 text-[#FBBF24] hover:bg-[#FBBF24]/16"
              )}
            >
              <Brain size={11} />
              {mode === "brain_dump" ? "Brain Dump: ON" : "Brain Dump Mode"}
            </button>
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 p-3 border-t border-white/[0.08] shrink-0">

            {/* Upload button */}
            <button
              title="Upload file"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 shrink-0 rounded-full border border-white/[0.08] bg-transparent flex items-center justify-center text-[#8B89A0] hover:text-[#E8E6F0] hover:bg-[#111111] transition-colors"
            >
              <Upload size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Text input — shows interim speech as dimmed text */}
            <input
              value={displayInput}
              onChange={(e) => {
                // Don't mutate during speech interim; only update when typing
                if (!interimText) setInputText(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && !interimText && handleSend()}
              type="text"
              placeholder={
                speech.isListening
                  ? "Listening…"
                  : mode === "brain_dump"
                  ? "Start rambling — Luca will structure it…"
                  : "Message Luca…"
              }
              className={cn(
                "flex-1 min-w-0 bg-[#111111] border border-white/[0.08] rounded-full px-4 py-2.5 text-[13px] placeholder:text-[#5C5A6E] focus:outline-none focus:border-white/30 transition-colors",
                interimText ? "text-[#5C5A6E] italic" : "text-[#E8E6F0]"
              )}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking}
              title="Send message"
              className={cn(
                "w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95",
                inputText.trim() && !isThinking
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-[#111111] text-[#5C5A6E] cursor-not-allowed"
              )}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
