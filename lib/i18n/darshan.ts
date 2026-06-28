// Lightweight i18n for the Darshan section only. Hindi-first (the darshan
// audience skews Hindi), with an English fallback. Scoped on purpose — a
// full-site i18n (next-intl) would be overkill for these few pages. If Hindi
// later spreads site-wide, migrate this dictionary into that system.

export type Lang = "hi" | "en";

export const DARSHAN_LANGS: Lang[] = ["hi", "en"];

const STRINGS = {
  hi: {
    morningAarti: "प्रातः आरती",
    sandhyaAarti: "संध्या आरती",
    aartis: "आरती",
    bhajans: "भजन",
    playBhajans: "भजन सुनें",
    scriptures: "शास्त्र",
    readScripture: "पढ़ें",
    todayPanchang: "आज का पंचांग",
    auspiciousToday: "आज का शुभ अवसर",
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
    morningAarti: "Morning Aarti",
    sandhyaAarti: "Sandhya Aarti",
    aartis: "Aartis",
    bhajans: "Bhajans",
    playBhajans: "Play bhajans",
    scriptures: "Scriptures",
    readScripture: "Read",
    todayPanchang: "Today's Panchang",
    auspiciousToday: "Auspicious today",
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
