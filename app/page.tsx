"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mic, Brain, FileText, ArrowRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── i18n strings ─────────────────────────────────────────────────────────────

type Lang = "EN" | "FR";

const copy = {
  EN: {
    tagline: "Your AI study companion, built for the way your brain actually works",
    sub: "Voice coaching, smart focus timers, and instant note structure — all in one place.",
    cta: "Get Started",
    features: [
      {
        icon: Mic,
        title: "Voice Coaching",
        desc: "Speak your thoughts out loud. Luca listens, responds, and keeps you on track — no typing required.",
      },
      {
        icon: Brain,
        title: "Neuro Focus Pod",
        desc: "Pomodoro sessions tuned to your attention span with gentle nudges when your break runs over.",
      },
      {
        icon: FileText,
        title: "Brain Dump → Clean Notes",
        desc: "Ramble freely. Luca turns your messy stream of consciousness into structured, reviewable notes.",
      },
    ],
  },
  FR: {
    tagline: "Ton compagnon d'étude IA, conçu pour la façon dont ton cerveau fonctionne vraiment",
    sub: "Coaching vocal, minuteries de concentration et structure de notes instantanée — au même endroit.",
    cta: "Commencer",
    features: [
      {
        icon: Mic,
        title: "Coaching vocal",
        desc: "Parle à voix haute. Luca écoute, répond et te garde sur la bonne voie — sans taper.",
      },
      {
        icon: Brain,
        title: "Pod de focus neuro",
        desc: "Sessions Pomodoro adaptées à ton attention, avec de douces rappels si ta pause s'éternise.",
      },
      {
        icon: FileText,
        title: "Vider ta tête → Notes propres",
        desc: "Parle librement. Luca transforme ton flux de pensées en notes structurées et révisables.",
      },
    ],
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("EN");

  // Sync to / from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("language") as Lang | null;
    if (stored === "EN" || stored === "FR") setLang(stored);
  }, []);

  function toggleLang() {
    const next: Lang = lang === "EN" ? "FR" : "EN";
    setLang(next);
    localStorage.setItem("language", next);
  }

  const t = copy[lang];

  return (
    <div
      className="relative min-h-screen bg-black text-white flex flex-col overflow-hidden font-sans"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Radial fade so dots fade toward edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, black 100%)",
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center text-black font-bold text-sm shrink-0">
            N
          </div>
          <span className="font-semibold text-sm tracking-tight text-white/90">
            Neuro Peer
          </span>
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Globe size={13} />
          {lang === "EN" ? "FR" : "EN"}
        </button>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center gap-6 py-16">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-white/50 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          Powered by Claude AI
        </div>

        {/* Headline */}
        <h1 className="max-w-2xl text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight text-white">
          {t.tagline}
        </h1>

        <p className="max-w-lg text-[15px] text-white/40 leading-relaxed">
          {t.sub}
        </p>

        {/* CTA */}
        <Link
          href="/setup"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-7 py-3.5 hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
        >
          {t.cta}
          <ArrowRight size={15} />
        </Link>

        {/* ── Feature cards ──────────────────────────────────────────────── */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {t.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left hover:border-white/20 hover:bg-white/[0.05] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center">
                  <Icon size={17} className="text-white/70" />
                </div>
                <div>
                  <p className="font-semibold text-[13px] text-white/90 mb-1">
                    {f.title}
                  </p>
                  <p className="text-[12px] text-white/40 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-6 text-center text-[11px] text-white/20">
        © 2025 Neuro Peer · Built for neurodivergent & international students
      </footer>
    </div>
  );
}
