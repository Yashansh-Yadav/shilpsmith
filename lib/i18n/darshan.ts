// Lightweight i18n for the Darshan section only. Hindi-first (the darshan
// audience skews Hindi), with an English fallback. Scoped on purpose — a
// full-site i18n (next-intl) would be overkill for these few pages. If Hindi
// later spreads site-wide, migrate this dictionary into that system.

export type Lang = "hi" | "en";

export const DARSHAN_LANGS: Lang[] = ["hi", "en"];

const STRINGS = {
  hi: {
    Aarti: "प्रातः आरती",
    sandhyaAarti: "संध्या आरती",
    aartis: "आरती",
    bhajans: "भजन",
    playBhajans: "भजन सुनें",
    scriptures: "शास्त्र",
    readScripture: "पढ़ें",
    todayPanchang: "आज का पंचांग",
    auspiciousToday: "आज का शुभ अवसर",
    upcoming: "आगामी पर्व",
    noUpcoming: "इस वर्ष कोई आगामी पर्व नहीं",
    tithi: "तिथि",
    paksha: "पक्ष",
    nakshatra: "नक्षत्र",
    vaar: "वार",
    sunrise: "सूर्योदय",
    sunset: "सूर्यास्त",
    mantra: "मंत्र",
    announce: "पंचांग सुनें",
    viewInEnglish: "English",
    backToShop: "दुकान पर लौटें",
    notFound: "यह देवता उपलब्ध नहीं है",
  },
  en: {
    Aarti: "Aarti",
    sandhyaAarti: "Sandhya Aarti",
    aartis: "Aartis",
    bhajans: "Bhajans",
    playBhajans: "Play bhajans",
    scriptures: "Scriptures",
    readScripture: "Read",
    todayPanchang: "Today's Panchang",
    auspiciousToday: "Auspicious today",
    upcoming: "Upcoming events",
    noUpcoming: "No more events this year",
    tithi: "Tithi",
    paksha: "Paksha",
    nakshatra: "Nakshatra",
    vaar: "Weekday",
    sunrise: "Sunrise",
    sunset: "Sunset",
    mantra: "Mantra",
    announce: "Hear panchang",
    viewInEnglish: "हिन्दी",
    backToShop: "Back to shop",
    notFound: "This deity is unavailable",
  },
} as const;

export type DarshanKey = keyof (typeof STRINGS)["hi"];

export function t(lang: Lang, key: DarshanKey): string {
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}

// Resolve a requested language to a supported one (defaults to Hindi).
export function resolveLang(value: string | null | undefined): Lang {
  return value === "en" ? "en" : "hi";
}

// BCP-47 tag for the Web Speech API voice used to announce the panchang.
export function speechLang(lang: Lang): string {
  return lang === "hi" ? "hi-IN" : "en-IN";
}

// Time-of-day greeting that opens the spoken panchang. `hour` is the local
// (IST) hour 0–23.
export function greeting(lang: Lang, hour: number): string {
  const slot =
    hour >= 4 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
        ? "afternoon"
        : hour >= 17 && hour < 21
          ? "evening"
          : "night";
  const map = {
    hi: {
      morning: "सुप्रभात",
      afternoon: "नमस्कार",
      evening: "शुभ संध्या",
      night: "शुभ रात्रि",
    },
    en: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
      night: "Good night",
    },
  } as const;
  return map[lang][slot];
}
