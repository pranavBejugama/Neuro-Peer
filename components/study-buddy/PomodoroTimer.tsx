"use client";

import React from "react";

interface PomodoroTimerProps {
  remaining?: string;
  progress?: number;
}

export default function PomodoroTimer({ remaining = "25:00", progress = 0 }: PomodoroTimerProps) {
  return (
    <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
      <p className="text-sm font-medium text-neutral-100">Pomodoro Timer</p>
      <div className="mt-2 text-3xl font-semibold text-purple-300">{remaining}</div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-purple-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </section>
  );
}
