"use client";

import React from "react";

interface CameraTrackerProps {
  status?: "online" | "offline" | "busy";
}

export default function CameraTracker({ status = "online" }: CameraTrackerProps) {
  const dotColor = status === "online" ? "bg-lime-400" : status === "busy" ? "bg-amber-400" : "bg-neutral-500";

  return (
    <div className="relative w-[160px] h-[120px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="h-full w-full bg-neutral-800 text-neutral-500 flex items-center justify-center text-sm">Camera</div>
      <span className={`absolute top-2 right-2 h-3 w-3 rounded-full ${dotColor} ring-2 ring-neutral-950`} />
    </div>
  );
}
