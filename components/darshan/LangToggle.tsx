"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";

import type { Lang } from "../../lib/i18n/darshan";

// Toggles the darshan language. Persists the choice in a cookie (read
// server-side so the next page's first paint is already correct) and refreshes
// the route so the server re-renders in the new language.
export default function LangToggle({
  lang,
  label,
}: {
  lang: Lang;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: Lang = lang === "hi" ? "en" : "hi";
    // 1 year, site-wide.
    document.cookie = `darshan_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
    >
      <Languages className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );
}
