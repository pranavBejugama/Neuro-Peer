"use client";

import React from "react";
import { Mic } from "lucide-react";

interface ChatInterfaceProps {
  transcript: string[];
}

export default function ChatInterface({ transcript }: ChatInterfaceProps) {
  return (
    <div className="h-full flex flex-col rounded-2xl bg-neutral-900 border border-neutral-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {transcript.length ? (
          transcript.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200">
              {item}
            </div>
          ))
        ) : (
          <div className="text-center text-neutral-500">Transcript will appear here.</div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-4">
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            aria-label="Start microphone"
          >
            <Mic size={20} />
          </button>
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}
