"use client";

import React from "react";

interface AvatarPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export default function AvatarPanel({ videoRef }: AvatarPanelProps) {
  return (
    <section className="h-full rounded-2xl bg-neutral-900 p-6 shadow-xl border border-neutral-800 flex flex-col items-center justify-center">
      <div className="h-64 w-full rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
        <video
          ref={videoRef}
          className="h-full w-full object-cover rounded-xl"
          autoPlay
          muted
          playsInline
        />
        <span className="absolute text-sm text-neutral-400">Avatar</span>
      </div>
      <p className="mt-4 text-sm text-neutral-300">Study Buddy Avatar</p>
    </section>
  );
}
