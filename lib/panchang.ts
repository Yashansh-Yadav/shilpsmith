import { unstable_cache } from "next/cache";
import { MhahPanchang } from "mhah-panchang";

import { logger } from "./logger";

// Basic daily Panchang for the Darshan pages. Computed *locally* with
// `mhah-panchang` (MIT, built on astronomia — no Swiss Ephemeris / AGPL trap,
// no API key, no per-call cost) so it runs on serverless and carries no
// third-party ToS. Accuracy is fine for a "today's panchang" strip; swap the
// compute behind `computePanchang` for a certified API later without touching
// callers.
//
// mhah returns names in Odia script by default with `name_en_IN` transliteration
// and a stable `ino` index — so we map `ino` → Devanagari ourselves for the
// Hindi UI, and keep the English transliteration for the English UI.

export interface Panchang {
  date: string; // civil date computed for, YYYY-MM-DD (IST)
  vaarIndex: number; // 0=Sun .. 6=Sat
  vaarEn: string;
  vaarHi: string;
  tithiEn: string;
  tithiHi: string;
  tithiKey: string; // normalized (lowercased a-z) for observance matching
  tithiIno: number; // 0-based tithi index within the paksha (-1 if unknown)
  pakshaEn: string;
  pakshaHi: string;
  nakshatraEn: string;
  nakshatraHi: string;
  sunrise: string | null; // ISO
  sunset: string | null; // ISO
  computed: boolean; // false when we fell back (mhah failed)
}

// India-focused: default to New Delhi; override per-deploy via env. Sunrise/
// sunset only shift the morning↔sandhya aarti boundary, so a city-level default
// is plenty.
const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "28.6139");
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "77.209");
const IST_OFFSET_MIN = 330; // +05:30

const VAAR_HI = [
  "रविवार",
  "सोमवार",
  "मंगलवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार",
];
const VAAR_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Tithi 1..14 (ino 0..13) share names across both pakshas; ino 14 is
// Purnima (Shukla) / Amavasya (Krishna).
const TITHI_HI = [
  "प्रतिपदा",
  "द्वितीया",
  "तृतीया",
  "चतुर्थी",
  "पंचमी",
  "षष्ठी",
  "सप्तमी",
  "अष्टमी",
  "नवमी",
  "दशमी",
  "एकादशी",
  "द्वादशी",
  "त्रयोदशी",
  "चतुर्दशी",
];

const NAKSHATRA_HI = [
  "अश्विनी",
  "भरणी",
  "कृत्तिका",
  "रोहिणी",
  "मृगशिरा",
  "आर्द्रा",
  "पुनर्वसु",
  "पुष्य",
  "आश्लेषा",
  "मघा",
  "पूर्वाफाल्गुनी",
  "उत्तराफाल्गुनी",
  "हस्त",
  "चित्रा",
  "स्वाति",
  "विशाखा",
  "अनुराधा",
  "ज्येष्ठा",
  "मूल",
  "पूर्वाषाढा",
  "उत्तराषाढा",
  "श्रवण",
  "धनिष्ठा",
  "शतभिषा",
  "पूर्वाभाद्रपद",
  "उत्तराभाद्रपद",
  "रेवती",
];

// Normalize a tithi name for matching. Besides lowercasing and stripping
// non-letters, we drop every 'h' so aspirated-consonant spelling variants
// collapse together — e.g. admin "Chaturdashi" vs mhah "Chaturdasi", or
// "Shashthi" vs "Shashti". Tithi names stay distinct after this transform.
export function normalizeTithi(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "").replace(/h/g, "");
}

// mhah-panchang emits regional tithi transliterations (e.g. "Chavithi" for
// Chaturthi, "Thadiya" for Tritiya) that plain string matching can't bridge.
// So we match by the tithi INDEX within a paksha (0=Pratipada … 13=Chaturdashi,
// 14=Purnima/Amavasya). This table maps every common spelling → that index.
const TITHI_INO: Record<string, number> = {};
function regTithi(ino: number, ...names: string[]) {
  for (const n of names) TITHI_INO[normalizeTithi(n)] = ino;
}
regTithi(0, "Pratipada", "Padyami", "Prathama", "Pratham");
regTithi(1, "Dwitiya", "Dvitiya", "Vidiya");
regTithi(2, "Tritiya", "Thadiya", "Tadiya");
regTithi(3, "Chaturthi", "Chavithi", "Chauthi", "Chavath");
regTithi(4, "Panchami");
regTithi(5, "Shashthi", "Shashti", "Sashti");
regTithi(6, "Saptami");
regTithi(7, "Ashtami");
regTithi(8, "Navami");
regTithi(9, "Dashami", "Dasami");
regTithi(10, "Ekadashi", "Ekadasi");
regTithi(11, "Dwadashi", "Dvadashi", "Dwadasi");
regTithi(12, "Trayodashi", "Trayodasi");
regTithi(13, "Chaturdashi", "Chaturdasi");
regTithi(14, "Purnima", "Poornima", "Punnami", "Amavasya", "Amavasai", "Amavas");

// Tithi name (any common spelling) → 0-based index within the paksha, or -1.
export function tithiNameToIno(name: string): number {
  const k = normalizeTithi(name);
  return k in TITHI_INO ? TITHI_INO[k] : -1;
}

// IST civil date (YYYY-MM-DD) for a given instant.
function istDateKey(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000)
    .toISOString()
    .slice(0, 10);
}

function toIso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

// Pure compute for a given IST date key + location. Computes at ~06:00 IST
// (00:30 UTC) so the value is stable for the whole day regardless of when the
// first request hits the cache.
export function computePanchang(
  dateKey: string,
  lat: number,
  lng: number
): Panchang {
  const at = new Date(`${dateKey}T00:30:00.000Z`); // 06:00 IST
  const vaarIndex = at.getUTCDay();

  try {
    const obj = new MhahPanchang();
    const c = obj.calculate(at);
    const sun = obj.sunTimer(at, lat, lng);

    // mhah's tithi ino is month-absolute: Shukla = 0–14, Krishna = 15–29.
    // Reduce to a paksha-relative index (0–14) for naming + matching.
    const rawTithiIno: number = c?.Tithi?.ino ?? -1;
    const tithiIno: number = rawTithiIno >= 0 ? rawTithiIno % 15 : -1;
    const pakshaEn: string = c?.Paksha?.name_en_IN ?? "";
    const isShukla = /shukla/i.test(pakshaEn);
    const nakIno: number = c?.Nakshatra?.ino ?? -1;
    const dayIno: number =
      typeof c?.Day?.ino === "number" ? c.Day.ino : vaarIndex;

    // Override mhah's "Punnami" for the 15th tithi with the conventional
    // Purnima / Amavasya — nicer display and lets those be matched as a tithi.
    const tithiEn: string =
      tithiIno === 14
        ? isShukla
          ? "Purnima"
          : "Amavasya"
        : c?.Tithi?.name_en_IN ?? "";

    const tithiHi =
      tithiIno === 14
        ? isShukla
          ? "पूर्णिमा"
          : "अमावस्या"
        : TITHI_HI[tithiIno] ?? tithiEn;

    return {
      date: dateKey,
      vaarIndex: dayIno,
      vaarEn: c?.Day?.name_en_UK ?? VAAR_EN[dayIno] ?? "",
      vaarHi: VAAR_HI[dayIno] ?? "",
      tithiEn,
      tithiHi,
      tithiKey: normalizeTithi(tithiEn),
      tithiIno,
      pakshaEn,
      pakshaHi: isShukla ? "शुक्ल पक्ष" : "कृष्ण पक्ष",
      nakshatraEn: c?.Nakshatra?.name_en_IN ?? "",
      nakshatraHi: NAKSHATRA_HI[nakIno] ?? c?.Nakshatra?.name_en_IN ?? "",
      sunrise: toIso(sun?.sunRise),
      sunset: toIso(sun?.sunSet),
      computed: true,
    };
  } catch (error) {
    // Graceful fallback — weekday is always derivable, which keeps weekday-based
    // observances (e.g. "Somvar") working even if the astro compute fails.
    logger.error("panchang compute failed; falling back to weekday only", {
      error,
    });
    return {
      date: dateKey,
      vaarIndex,
      vaarEn: VAAR_EN[vaarIndex] ?? "",
      vaarHi: VAAR_HI[vaarIndex] ?? "",
      tithiEn: "",
      tithiHi: "",
      tithiKey: "",
      tithiIno: -1,
      pakshaEn: "",
      pakshaHi: "",
      nakshatraEn: "",
      nakshatraHi: "",
      sunrise: null,
      sunset: null,
      computed: false,
    };
  }
}

// Cached compute keyed by the IST date so the cache naturally rolls over once a
// day; `revalidate: 86400` is the backstop. One compute/day site-wide.
const cachedPanchang = unstable_cache(
  async (dateKey: string, lat: number, lng: number) =>
    computePanchang(dateKey, lat, lng),
  ["panchang"],
  { revalidate: 86400, tags: ["panchang"] }
);

export async function getTodayPanchang(
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG
): Promise<Panchang> {
  return cachedPanchang(istDateKey(new Date()), lat, lng);
}
