"use client";

import { useEffect, useState } from "react";

// Speaks the day's basic panchang aloud using the browser's built-in
// SpeechSynthesis API — no audio files, no network, fully client-side. The tap
// that opened the page (or this button press) is the user gesture browsers
// require before allowing speech. Hidden when the browser has no TTS support.
export default function PanchangAnnounce({
  text,
  lang, // BCP-47, e.g. "hi-IN"
  label,
}: {
  text: string;
  lang: string;
  label: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  function speak() {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
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

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speak}
      className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-cta transition hover:bg-brand-700"
    >
      <span aria-hidden>{speaking ? "⏸" : "🔊"}</span>
      {label}
    </button>
  );
}
