"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  name: string;
  email: string;
  studying: string;
  studyLength: 25 | 45 | 60 | null;
  distractionScale: number;
  challenges: string[];
  challengeOther: string;
}

const CHALLENGE_OPTIONS = [
  "Hard to stay focused",
  "English/French is not my first language",
  "I get overwhelmed by long readings",
  "I forget things quickly",
  "I struggle to organize my thoughts",
  "Other",
];

const TOTAL_STEPS = 3; // 0 = basic info, 1 = learning profile, 2 = done

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    studying: "",
    studyLength: null,
    distractionScale: 5,
    challenges: [],
    challengeOther: "",
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function toggleChallenge(c: string) {
    setProfile((p) => ({
      ...p,
      challenges: p.challenges.includes(c)
        ? p.challenges.filter((x) => x !== c)
        : [...p.challenges, c],
    }));
  }

  function canProceed() {
    if (step === 0) {
      return (
        profile.name.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) &&
        profile.studying.trim() &&
        profile.studyLength !== null
      );
    }
    if (step === 1) return profile.challenges.length > 0;
    return true;
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      // Save to localStorage and go to session
      localStorage.setItem("userProfile", JSON.stringify(profile));
      router.push("/session");
    }
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 font-sans"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, black 90%)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 rounded-[8px] bg-white flex items-center justify-center text-black font-bold text-xs shrink-0">
            N
          </div>
          <span className="font-semibold text-sm tracking-tight text-white/70">
            Neuro Peer
          </span>
        </div>

        {/* ── Progress bar ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[11px] text-white/40 uppercase tracking-widest font-medium">
              {step === 0 ? "Basic info" : step === 1 ? "Learning profile" : "All set"}
            </span>
            <span className="text-[11px] text-white/30 font-mono">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">

          {/* ── Step 0: Basic info ──────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Let&apos;s get to know you
                </h2>
                <p className="text-[13px] text-white/40">
                  Luca will personalise every session around your needs.
                </p>
              </div>

              {/* Name */}
              <Field label="What's your preferred name?">
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              {/* Email */}
              <Field label="What is your email?">
                <input
                  type="email"
                  placeholder="you@university.ca"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              {/* Subject */}
              <Field label="What are you studying?">
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Biology…"
                  value={profile.studying}
                  onChange={(e) => setProfile((p) => ({ ...p, studying: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              {/* Study length */}
              <Field label="Typical study length before getting distracted?">
                <div className="flex gap-2.5">
                  {([25, 45, 60] as const).map((min) => (
                    <button
                      key={min}
                      onClick={() => setProfile((p) => ({ ...p, studyLength: min }))}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        profile.studyLength === min
                          ? "border-white bg-white text-black"
                          : "border-white/[0.10] text-white/50 hover:border-white/30 hover:text-white/80"
                      )}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </Field>

              {/* Distraction scale */}
              <Field label={`How often do you get distracted? — ${profile.distractionScale}/10`}>
                <div className="px-1 pt-1">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={profile.distractionScale}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, distractionScale: Number(e.target.value) }))
                    }
                    className="w-full accent-white cursor-pointer"
                    style={{ accentColor: "white" }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/25">Rarely</span>
                    <span className="text-[10px] text-white/25">Constantly</span>
                  </div>
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 1: Learning profile ────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Your learning profile
                </h2>
                <p className="text-[13px] text-white/40">
                  Select every challenge that resonates — Luca will adapt for all of them.
                </p>
              </div>

              <div className="space-y-2.5">
                {CHALLENGE_OPTIONS.map((option) => {
                  const active = profile.challenges.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleChallenge(option)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[13px] transition-all",
                        active
                          ? "border-white/40 bg-white/[0.06] text-white"
                          : "border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/70"
                      )}
                    >
                      <span className={cn(
                        "w-4.5 h-4.5 shrink-0 rounded-md border flex items-center justify-center transition-all",
                        active ? "border-white bg-white" : "border-white/20"
                      )}>
                        {active && <Check size={11} className="text-black" strokeWidth={3} />}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Other freeform */}
              {profile.challenges.includes("Other") && (
                <textarea
                  placeholder="Tell Luca more about your challenges…"
                  value={profile.challengeOther}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, challengeOther: e.target.value }))
                  }
                  rows={3}
                  className={cn(inputCls, "resize-none leading-relaxed")}
                />
              )}
            </div>
          )}

          {/* ── Step 2: Done ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-16 h-16 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center">
                <Sparkles size={28} className="text-white/80" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  You&apos;re all set, {profile.name || "friend"}!
                </h2>
                <p className="text-[13px] text-white/40 leading-relaxed max-w-sm">
                  Luca has everything it needs to personalise your sessions. Let&apos;s get studying.
                </p>
              </div>

              {/* Summary pills */}
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {profile.challenges.filter(c => c !== "Other").map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1 text-[11px] text-white/50"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation buttons ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={cn(
              "flex items-center gap-1.5 text-[13px] font-medium transition-all",
              step === 0
                ? "invisible"
                : "text-white/40 hover:text-white/70"
            )}
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all",
              canProceed()
                ? "bg-white text-black hover:bg-white/90 active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                : "bg-white/10 text-white/25 cursor-not-allowed"
            )}
          >
            {step === TOTAL_STEPS - 1 ? "Start studying" : "Continue"}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[12px] font-medium text-white/50 tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors";
