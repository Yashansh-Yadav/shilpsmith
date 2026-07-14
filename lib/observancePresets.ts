// Curated, recurring observance presets per deity. These are *rule-based*
// (weekday / tithi / paksha) so they recur forever with no yearly date upkeep
// and no external API — the panchang engine matches them live.
//
// The admin "Add suggested days" button drops the matching set into a deity's
// special-days list in one click; the admin can then tweak or remove any.
//
// Keyed by deity slug. GENERIC covers pan-Hindu days for any other deity.

export interface PresetDay {
  labelEn: string;
  labelHi: string;
  weekday?: number; // 0=Sun .. 6=Sat
  tithi?: string;
  paksha?: "shukla" | "krishna";
  note?: string;
  noteHi?: string;
}

const EKADASHI: PresetDay = {
  labelEn: "Ekadashi",
  labelHi: "एकादशी",
  tithi: "Ekadashi",
};
const PURNIMA: PresetDay = {
  labelEn: "Purnima",
  labelHi: "पूर्णिमा",
  tithi: "Purnima",
};
const AMAVASYA: PresetDay = {
  labelEn: "Amavasya",
  labelHi: "अमावस्या",
  tithi: "Amavasya",
};

export const OBSERVANCE_PRESETS: Record<string, PresetDay[]> = {
  shiva: [
    { labelEn: "Somvar (Monday)", labelHi: "सोमवार", weekday: 1, note: "Most auspicious day for Mahadev", noteHi: "महादेव की आराधना का सर्वोत्तम दिन" },
    { labelEn: "Pradosh Vrat", labelHi: "प्रदोष व्रत", tithi: "Trayodashi" },
    { labelEn: "Masik Shivratri", labelHi: "मासिक शिवरात्रि", tithi: "Chaturdashi", paksha: "krishna" },
    PURNIMA,
  ],
  durga: [
    { labelEn: "Shukravar (Friday)", labelHi: "शुक्रवार", weekday: 5 },
    { labelEn: "Durga Ashtami", labelHi: "दुर्गा अष्टमी", tithi: "Ashtami", paksha: "shukla" },
    { labelEn: "Navami", labelHi: "नवमी", tithi: "Navami", paksha: "shukla" },
  ],
  ganesha: [
    { labelEn: "Budhvar (Wednesday)", labelHi: "बुधवार", weekday: 3 },
    { labelEn: "Sankashti Chaturthi", labelHi: "संकष्टी चतुर्थी", tithi: "Chaturthi", paksha: "krishna" },
    { labelEn: "Vinayaka Chaturthi", labelHi: "विनायक चतुर्थी", tithi: "Chaturthi", paksha: "shukla" },
  ],
  vishnu: [
    { labelEn: "Guruvar (Thursday)", labelHi: "गुरुवार", weekday: 4 },
    EKADASHI,
    PURNIMA,
  ],
  krishna: [
    { labelEn: "Ekadashi", labelHi: "एकादशी", tithi: "Ekadashi" },
    { labelEn: "Janmashtami (Ashtami)", labelHi: "जन्माष्टमी (अष्टमी)", tithi: "Ashtami", paksha: "krishna" },
  ],
  hanuman: [
    { labelEn: "Mangalvar (Tuesday)", labelHi: "मंगलवार", weekday: 2 },
    { labelEn: "Shanivar (Saturday)", labelHi: "शनिवार", weekday: 6 },
    PURNIMA,
  ],
  lakshmi: [
    { labelEn: "Shukravar (Friday)", labelHi: "शुक्रवार", weekday: 5 },
    PURNIMA,
    AMAVASYA,
  ],
  ram: [
    { labelEn: "Ram Navami (Navami)", labelHi: "राम नवमी (नवमी)", tithi: "Navami", paksha: "shukla" },
    EKADASHI,
  ],
};

// Pan-Hindu fallback for any deity without a specific preset set.
export const GENERIC_PRESETS: PresetDay[] = [EKADASHI, PURNIMA, AMAVASYA];

// Returns the preset list for a deity slug (case-insensitive), falling back to
// the generic pan-Hindu set.
export function presetsForKey(key: string): PresetDay[] {
  return OBSERVANCE_PRESETS[key.trim().toLowerCase()] ?? GENERIC_PRESETS;
}
