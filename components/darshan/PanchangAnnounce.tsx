"use client";

import { useState } from "react";
import { AudioLines, Square } from "lucide-react";

// Speaks the day's panchang aloud (greeting → panchang → jaikara) using the
// browser's built-in SpeechSynthesis API — no audio files, no network. Always
// renders; if a browser lacks speech support the click simply does nothing.
// Styled as a premium gold pill for the (dark) hero.
export default function PanchangAnnounce({
  text,
  lang, // BCP-47, e.g. "hi-IN"
  label,
}: {
  text: string;
  lang: string;
  label: string;
}) {
  const [speaking, setSpeaking] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    // Prefer a voice that matches the requested language if one is installed.
    const match = synth
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2)));
    if (match) u.voice = match;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label}
      className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-amber-950 shadow-lg shadow-amber-900/30 ring-1 ring-amber-200/60 transition hover:from-amber-200 hover:to-amber-400 hover:shadow-amber-500/40 active:scale-95"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-950/15">
        {speaking ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <AudioLines className="h-4 w-4" strokeWidth={2.25} />
        )}
      </span>
      {speaking ? (lang.startsWith("hi") ? "रोकें" : "Stop") : label}
    </button>
  );
}
