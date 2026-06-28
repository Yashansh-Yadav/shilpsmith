import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

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
    <main className="flex min-h-screen flex-col bg-slate-900">
      <header className="flex items-center justify-between gap-4 px-4 py-3 text-white">
        <Link
          href={`/darshan/${deity.key}`}
          className="text-sm text-white/70 hover:text-white"
        >
          ← {lang === "hi" ? deity.nameHi : deity.nameEn}
        </Link>
        <h1 className="truncate text-sm font-medium">{title}</h1>
        <a
          href={item.pdfUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
        >
          {t(lang, "readScripture")} ↗
        </a>
      </header>

      {/* Browser-native PDF viewer over the external URL. We host nothing. */}
      <div className="flex-1">
        <iframe
          src={item.pdfUrl}
          title={title}
          className="h-full min-h-[70vh] w-full bg-white"
        />
      </div>

      {/* Provenance — always shown (legal safeguard). */}
      <footer className="px-4 py-2 text-center text-xs text-white/50">
        Source: {item.source} · {item.license}
      </footer>
    </main>
  );
}
