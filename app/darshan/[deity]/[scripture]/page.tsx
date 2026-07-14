import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, ExternalLink, ShieldCheck } from "lucide-react";

import { getActiveDeity } from "../../../../lib/deities";
import { resolveLang, t, type Lang } from "../../../../lib/i18n/darshan";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ deity: string; scripture: string }>;
  searchParams: Promise<{ lang?: string }>;
};

async function resolve(params: Params["params"]) {
  const { deity: key, scripture } = await params;
  const idx = Number(scripture);
  const deity = await getActiveDeity(key);
  if (!deity || !Number.isInteger(idx) || idx < 0 || idx >= deity.scriptures.length) {
    return null;
  }
  return { deity, idx, item: deity.scriptures[idx] };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return { title: "Scripture" };
  return { title: `${r.item.titleEn} — ${r.deity.nameEn}` };
}

export default async function ScripturePage({ params, searchParams }: Params) {
  const r = await resolve(params);
  if (!r) notFound();
  const { deity, item } = r;

  const sp = await searchParams;
  const cookieStore = await cookies();
  const lang: Lang = resolveLang(
    sp.lang ?? cookieStore.get("darshan_lang")?.value
  );
  const title = lang === "hi" ? item.titleHi : item.titleEn;

  return (
    <main className="flex min-h-screen flex-col bg-slate-950">
      {/* Sticky app-style header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-3 text-white backdrop-blur-md">
        <Link
          href={`/darshan/${deity.key}`}
          className="inline-flex items-center gap-1 rounded-full bg-white/10 py-1.5 pl-2 pr-3 text-sm text-white/90 transition hover:bg-white/20 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="max-w-[30vw] truncate">
            {lang === "hi" ? deity.nameHi : deity.nameEn}
          </span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
          {title}
        </h1>
        <a
          href={item.pdfUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 active:scale-95"
        >
          {t(lang, "readScripture")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      {/* Browser-native PDF viewer over the external URL. We host nothing. */}
      <div className="flex-1">
        <iframe
          src={item.pdfUrl}
          title={title}
          className="h-full min-h-[78vh] w-full bg-white"
        />
      </div>

      {/* Provenance — shown when recorded (legal safeguard). */}
      {(item.source || item.license) && (
        <footer className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-center text-xs text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          {[item.source, item.license].filter(Boolean).join(" · ")}
        </footer>
      )}
    </main>
  );
}
