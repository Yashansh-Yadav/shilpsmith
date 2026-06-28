import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getActiveDeity } from "../../../lib/deities";
import { getTodayPanchang } from "../../../lib/panchang";
import { todaysObservances } from "../../../lib/observance";
import { resolveLang, speechLang, t, type Lang } from "../../../lib/i18n/darshan";
import LangToggle from "../../../components/darshan/LangToggle";
import PanchangAnnounce from "../../../components/darshan/PanchangAnnounce";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ deity: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { deity: key } = await params;
  const deity = await getActiveDeity(key);
  if (!deity) return { title: "Darshan" };
  return {
    title: `${deity.nameEn} · ${deity.nameHi} — Darshan`,
    description: `Aarti, bhajans, scriptures and today's panchang for ${deity.nameEn}.`,
  };
}

function ytEmbed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export default async function DarshanPage({ params }: Params) {
  const { deity: key } = await params;

  const deity = await getActiveDeity(key);
  if (!deity) notFound();

  const cookieStore = await cookies();
  const lang: Lang = resolveLang(cookieStore.get("darshan_lang")?.value);
  const name = lang === "hi" ? deity.nameHi : deity.nameEn;

  const panchang = await getTodayPanchang();
  const observances = todaysObservances(deity.specialDays, panchang);

  // Feature the time-appropriate aarti: after sunset → sandhya, else morning.
  const nowMs = Date.now();
  const sunsetMs = panchang.sunset ? new Date(panchang.sunset).getTime() : null;
  const isEvening = sunsetMs ? nowMs >= sunsetMs : false;
  const featuredSlot: "morning" | "sandhya" = isEvening ? "sandhya" : "morning";

  const featuredAarti =
    deity.aartis.find((a) => a.slot === featuredSlot) ??
    deity.aartis.find((a) => a.slot === "morning") ??
    deity.aartis[0] ??
    null;
  const otherAartis = deity.aartis.filter((a) => a !== featuredAarti);

  // Plain-text panchang sentence for the TTS announcement.
  const announce =
    lang === "hi"
      ? `आज ${panchang.vaarHi}, ${panchang.pakshaHi} ${panchang.tithiHi}${
          panchang.nakshatraHi ? `, नक्षत्र ${panchang.nakshatraHi}` : ""
        }।${observances[0] ? ` ${observances[0].labelHi}।` : ""}`
      : `Today is ${panchang.vaarEn}, ${panchang.pakshaEn} ${panchang.tithiEn}${
          panchang.nakshatraEn ? `, ${panchang.nakshatraEn} nakshatra` : ""
        }.${observances[0] ? ` ${observances[0].labelEn}.` : ""}`;

  const pill =
    "rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-800 to-brand-600 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              ← {t(lang, "backToShop")}
            </Link>
            <LangToggle lang={lang} label={t(lang, "viewInEnglish")} />
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
            <p className="mt-3 text-lg text-white/90">{deity.mantra}</p>
            {lang === "en" && deity.transliteration && (
              <p className="text-sm text-white/70">{deity.transliteration}</p>
            )}
          </div>

          {/* Panchang strip — shown no matter how the idol was tapped */}
          <div className="mt-8 rounded-3xl bg-white/10 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                {t(lang, "todayPanchang")}
              </h2>
              <PanchangAnnounce
                text={announce}
                lang={speechLang(lang)}
                label={t(lang, "announce")}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
              <div className={pill}>
                <div className="text-xs text-white/60">{t(lang, "vaar")}</div>
                <div className="font-medium">
                  {lang === "hi" ? panchang.vaarHi : panchang.vaarEn}
                </div>
              </div>
              <div className={pill}>
                <div className="text-xs text-white/60">{t(lang, "paksha")}</div>
                <div className="font-medium">
                  {lang === "hi" ? panchang.pakshaHi : panchang.pakshaEn || "—"}
                </div>
              </div>
              <div className={pill}>
                <div className="text-xs text-white/60">{t(lang, "tithi")}</div>
                <div className="font-medium">
                  {lang === "hi" ? panchang.tithiHi : panchang.tithiEn || "—"}
                </div>
              </div>
              <div className={pill}>
                <div className="text-xs text-white/60">
                  {t(lang, "nakshatra")}
                </div>
                <div className="font-medium">
                  {(lang === "hi"
                    ? panchang.nakshatraHi
                    : panchang.nakshatraEn) || "—"}
                </div>
              </div>
              <div className={pill}>
                <div className="text-xs text-white/60">{t(lang, "sunrise")}</div>
                <div className="font-medium">{fmtTime(panchang.sunrise)}</div>
              </div>
              <div className={pill}>
                <div className="text-xs text-white/60">{t(lang, "sunset")}</div>
                <div className="font-medium">{fmtTime(panchang.sunset)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        {/* Observance banner */}
        {observances.length > 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-700">
              {t(lang, "auspiciousToday")}
            </h2>
            <ul className="space-y-1">
              {observances.map((o, i) => (
                <li key={i} className="text-amber-900">
                  <span className="font-semibold">
                    {lang === "hi" ? o.labelHi : o.labelEn}
                  </span>
                  {o.note && (
                    <span className="text-amber-700"> — {o.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Featured aarti + others */}
        {featuredAarti && (
          <section>
            <h2 className="mb-3 text-xl font-bold">
              {featuredAarti.slot === "sandhya"
                ? t(lang, "sandhyaAarti")
                : t(lang, "morningAarti")}
            </h2>
            <div className="aspect-video w-full overflow-hidden rounded-3xl shadow-lift">
              <iframe
                src={ytEmbed(featuredAarti.youtubeId)}
                title={lang === "hi" ? featuredAarti.labelHi : featuredAarti.labelEn}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>

            {otherAartis.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {otherAartis.map((a, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  >
                    <div className="aspect-video w-full">
                      <iframe
                        src={ytEmbed(a.youtubeId)}
                        title={lang === "hi" ? a.labelHi : a.labelEn}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <p className="p-3 text-sm font-medium">
                      {lang === "hi" ? a.labelHi : a.labelEn}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Bhajans */}
        {deity.bhajans.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">{t(lang, "bhajans")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {deity.bhajans.map((b, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <div className="aspect-video w-full">
                    <iframe
                      src={ytEmbed(b.youtubeId)}
                      title={lang === "hi" ? b.labelHi : b.labelEn}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                  <p className="p-3 text-sm font-medium">
                    {lang === "hi" ? b.labelHi : b.labelEn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scriptures */}
        {deity.scriptures.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">{t(lang, "scriptures")}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {deity.scriptures.map((s, i) => (
                <Link
                  key={i}
                  href={`/darshan/${deity.key}/${i}?lang=${lang}`}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-lift"
                >
                  <div>
                    <div className="font-medium">
                      {lang === "hi" ? s.titleHi : s.titleEn}
                    </div>
                    <div className="text-xs uppercase text-slate-400">
                      {s.lang}
                    </div>
                  </div>
                  <span className="text-brand-600">{t(lang, "readScripture")} →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          {lang === "hi"
            ? "वीडियो तृतीय-पक्ष मंचों (जैसे YouTube) से एम्बेड किए गए हैं; शास्त्र बाहरी स्रोतों से लिंक हैं।"
            : "Videos are embedded from third-party platforms (e.g. YouTube); scriptures are linked from external sources."}{" "}
          <Link href="/terms" className="underline hover:text-slate-600">
            {lang === "hi" ? "नियम व शर्तें" : "Terms"}
          </Link>
        </footer>
      </div>
    </main>
  );
}
