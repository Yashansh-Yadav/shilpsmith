import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sunrise,
  Sunset,
  Moon,
  Star,
  CalendarDays,
  Flame,
  Music2,
  BookOpen,
  ScrollText,
  PlayCircle,
  CalendarHeart,
  type LucideIcon,
} from "lucide-react";

import { getActiveDeity } from "../../../lib/deities";
import { getTodayPanchang } from "../../../lib/panchang";
import { todaysObservances } from "../../../lib/observance";
import { getUpcomingEvents } from "../../../lib/upcoming";
import {
  resolveLang,
  speechLang,
  greeting,
  t,
  type Lang,
} from "../../../lib/i18n/darshan";
import LangToggle from "../../../components/darshan/LangToggle";
import PanchangAnnounce from "../../../components/darshan/PanchangAnnounce";
import UpcomingEvents from "../../../components/darshan/UpcomingEvents";

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
  const sub = lang === "hi" ? deity.nameEn : deity.transliteration ?? "";

  const panchang = await getTodayPanchang();
  const observances = todaysObservances(deity.specialDays, panchang);
  const upcoming = await getUpcomingEvents(
    deity.key,
    deity.specialDays,
    panchang.date
  );

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

  // Spoken announcement: greeting → panchang → today's observance → jaikara.
  const istHour = new Date(nowMs + 330 * 60_000).getUTCHours();
  const greet = greeting(lang, istHour);
  const jaikara =
    lang === "hi"
      ? deity.jaikaraHi?.trim() || deity.mantra
      : deity.jaikaraEn?.trim() || deity.transliteration?.trim() || deity.mantra;

  const announce =
    lang === "hi"
      ? `${greet}। आज ${panchang.vaarHi}, ${panchang.pakshaHi} ${panchang.tithiHi}${
          panchang.nakshatraHi ? `, नक्षत्र ${panchang.nakshatraHi}` : ""
        }।${observances[0] ? ` ${observances[0].labelHi}।` : ""} ${jaikara}।`
      : `${greet}. Today is ${panchang.vaarEn}, ${panchang.pakshaEn} ${panchang.tithiEn}${
          panchang.nakshatraEn ? `, ${panchang.nakshatraEn} nakshatra` : ""
        }.${observances[0] ? ` ${observances[0].labelEn}.` : ""} ${jaikara}.`;

  const stats = [
    {
      icon: CalendarDays,
      label: t(lang, "vaar"),
      value: lang === "hi" ? panchang.vaarHi : panchang.vaarEn,
      tint: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: Moon,
      label: t(lang, "paksha"),
      value: (lang === "hi" ? panchang.pakshaHi : panchang.pakshaEn) || "—",
      tint: "bg-violet-50 text-violet-600",
    },
    {
      icon: Sparkles,
      label: t(lang, "tithi"),
      value: (lang === "hi" ? panchang.tithiHi : panchang.tithiEn) || "—",
      tint: "bg-amber-50 text-amber-600",
    },
    {
      icon: Star,
      label: t(lang, "nakshatra"),
      value:
        (lang === "hi" ? panchang.nakshatraHi : panchang.nakshatraEn) || "—",
      tint: "bg-rose-50 text-rose-600",
    },
    {
      icon: Sunrise,
      label: t(lang, "sunrise"),
      value: fmtTime(panchang.sunrise),
      tint: "bg-orange-50 text-orange-600",
    },
    {
      icon: Sunset,
      label: t(lang, "sunset"),
      value: fmtTime(panchang.sunset),
      tint: "bg-sky-50 text-sky-600",
    },
  ];

  // The aside always shows the Upcoming events panel (active deity only); it
  // renders an empty state when there's nothing — never fabricated/static data.
  const hasAside = true;

  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  const dayFmt = new Intl.DateTimeFormat(loc, { day: "numeric", timeZone: "UTC" });
  const monFmt = new Intl.DateTimeFormat(loc, { month: "short", timeZone: "UTC" });
  const fmtEvent = (key: string) => {
    const dt = new Date(`${key}T00:00:00Z`);
    return { day: dayFmt.format(dt), month: monFmt.format(dt) };
  };
  // Pick the note in the current language (Hindi note falls back to English).
  const noteOf = (note?: string, noteHi?: string) =>
    (lang === "hi" ? noteHi || note : note) || "";

  // Pre-resolve upcoming events for the (client) accordion list.
  const upcomingItems = upcoming.map((e) => {
    const { day, month } = fmtEvent(e.date);
    return {
      day,
      month,
      label: lang === "hi" ? e.labelHi : e.labelEn,
      note: noteOf(e.note, e.noteHi),
    };
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl">
        {/* ─── Hero ─── */}
        <section className="darshan-hero relative overflow-hidden rounded-b-[2.5rem] px-5 pb-24 pt-5 text-white sm:px-8 lg:rounded-b-[3rem] lg:px-12 lg:pb-28 lg:pt-7">
          <div className="darshan-mandala pointer-events-none absolute inset-0" />

          {/* Top bar */}
          <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 py-1.5 pl-2 pr-3.5 text-sm text-white/90 backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
              {t(lang, "backToShop")}
            </Link>
            <LangToggle lang={lang} label={t(lang, "viewInEnglish")} />
          </div>

          {/* Live badge */}
          <div className="relative z-10 mt-8 flex justify-center lg:mt-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
              </span>
              {lang === "hi" ? "लाइव दर्शन" : "Live Darshan"}
            </span>
          </div>

          {/* Name + aura */}
          <div className="relative z-10 mt-5 text-center">
            <div className="relative inline-block">
              <div className="darshan-aura animate-halo absolute -inset-10 -z-10 lg:-inset-16" />
              <Flame
                className="mx-auto mb-3 h-8 w-8 text-amber-300 lg:h-10 lg:w-10"
                strokeWidth={1.75}
              />
              <h1 className="text-4xl font-black leading-tight drop-shadow-sm sm:text-5xl lg:text-6xl">
                {name}
              </h1>
              {sub && <p className="mt-1.5 text-sm text-white/70 lg:text-base">{sub}</p>}
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-base font-medium backdrop-blur-md lg:text-lg">
              🕉️ <span>{deity.mantra}</span>
            </div>

            {/* Audio panchang announcer — premium, lives in the hero */}
            <div className="mt-5 flex justify-center">
              <PanchangAnnounce
                text={announce}
                lang={speechLang(lang)}
                label={t(lang, "announce")}
              />
            </div>
          </div>
        </section>

        <div className="space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
          {/* ─── Panchang card (floats over hero) ─── */}
          <section className="-mt-16 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/5 lg:-mt-20 lg:p-7">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-800 lg:text-base">
                {t(lang, "todayPanchang")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                >
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${s.tint}`}
                  >
                    <s.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      {s.label}
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {s.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Observance ─── */}
          {observances.length > 0 && (
            <section className="overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm lg:p-6">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-4 w-4" />
                {t(lang, "auspiciousToday")}
              </h2>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {observances.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-amber-900">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
                    <span>
                      <span className="font-semibold">
                        {lang === "hi" ? o.labelHi : o.labelEn}
                      </span>
                      {noteOf(o.note, o.noteHi) && (
                        <span className="text-amber-700/90">
                          {" "}
                          — {noteOf(o.note, o.noteHi)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ─── Main / aside layout (desktop = real columns) ─── */}
          <div
            className={
              hasAside
                ? "lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 space-y-6 lg:space-y-0"
                : "space-y-6"
            }
          >
            {/* Main column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Featured aarti */}
              {featuredAarti && (
                <section>
                  <SectionTitle
                    icon={Flame}
                    tint="bg-orange-100 text-orange-600"
                    title={
                      featuredAarti.slot === "sandhya"
                        ? t(lang, "sandhyaAarti")
                        : t(lang, "Aarti")
                    }
                  />
                  <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-lift ring-1 ring-slate-900/5">
                    <div className="aspect-video w-full">
                      <iframe
                        src={ytEmbed(featuredAarti.youtubeId)}
                        title={
                          lang === "hi"
                            ? featuredAarti.labelHi
                            : featuredAarti.labelEn
                        }
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <p className="flex items-center gap-2 p-3.5 text-sm font-semibold text-slate-700">
                      <PlayCircle className="h-4 w-4 text-brand-600" />
                      {lang === "hi"
                        ? featuredAarti.labelHi
                        : featuredAarti.labelEn}
                    </p>
                  </div>

                  {otherAartis.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {otherAartis.map((a, i) => (
                        <MediaCard
                          key={i}
                          youtubeId={a.youtubeId}
                          title={lang === "hi" ? a.labelHi : a.labelEn}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Bhajans */}
              {deity.bhajans.length > 0 && (
                <section>
                  <SectionTitle
                    icon={Music2}
                    tint="bg-violet-100 text-violet-600"
                    title={t(lang, "bhajans")}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {deity.bhajans.map((b, i) => (
                      <MediaCard
                        key={i}
                        youtubeId={b.youtubeId}
                        title={lang === "hi" ? b.labelHi : b.labelEn}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Aside — upcoming events + scriptures */}
            {hasAside && (
              <aside className="space-y-6 lg:col-span-1 lg:sticky lg:top-6">
                <section>
                  <SectionTitle
                    icon={CalendarHeart}
                    tint="bg-rose-100 text-rose-600"
                    title={t(lang, "upcoming")}
                  />
                  <UpcomingEvents
                    items={upcomingItems}
                    emptyLabel={t(lang, "noUpcoming")}
                  />
                </section>

                {deity.scriptures.length > 0 && (
                  <section className="space-y-3">
                    <SectionTitle
                      icon={BookOpen}
                      tint="bg-emerald-100 text-emerald-600"
                      title={t(lang, "scriptures")}
                    />
                    {deity.scriptures.map((s, i) => {
                      const desc =
                        s.description?.trim() ||
                        (lang === "hi"
                          ? "इस पवित्र ग्रंथ का पाठ करें"
                          : "Read this sacred text");
                      return (
                        <Link
                          key={i}
                          href={`/darshan/${deity.key}/${i}?lang=${lang}`}
                          className="group flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-lift active:scale-[0.99]"
                        >
                          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600">
                            <ScrollText className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-slate-800">
                                {lang === "hi" ? s.titleHi : s.titleEn}
                              </span>
                              <span className="flex-none rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {s.lang}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {desc}
                            </p>
                            <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-brand-600">
                              {t(lang, "readScripture")}
                              <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </section>
                )}
              </aside>
            )}
          </div>

          {/* ─── Footer ─── */}
          <footer className="pt-4 text-center text-xs text-slate-400">
            {lang === "hi"
              ? "वीडियो तृतीय-पक्ष मंचों (जैसे YouTube) से एम्बेड किए गए हैं; शास्त्र बाहरी स्रोतों से लिंक हैं।"
              : "Videos are embedded from third-party platforms (e.g. YouTube); scriptures are linked from external sources."}{" "}
            <Link href="/terms" className="underline hover:text-slate-600">
              {lang === "hi" ? "नियम व शर्तें" : "Terms"}
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

// ── Small presentational helpers ──

function SectionTitle({
  icon: Icon,
  tint,
  title,
}: {
  icon: LucideIcon;
  tint: string;
  title: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 text-lg font-bold text-slate-800">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      {title}
    </h2>
  );
}

function MediaCard({ youtubeId, title }: { youtubeId: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="aspect-video w-full">
        <iframe
          src={ytEmbed(youtubeId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
      <p className="p-3 text-sm font-medium text-slate-700">{title}</p>
    </div>
  );
}
