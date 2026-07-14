# Shiva Special-Days JSON — Generation Spec

A reusable instruction block for regenerating the "Lord Shiva special days" calendar JSON for any year (India basis). Paste it into `CLAUDE.md`, or keep it as a standalone reference and hand it to Claude when you need next year's file.

**How to use:** tell Claude *"regenerate the Shiva days JSON for 2027"* (or whichever year). The "always web-search, never use memory" rule below is the important part — without it a model will hand you confidently-wrong dates from training data, because tithi-to-date mappings change every year.

**Expectation:** the structure stays identical year to year, but the dates change (they must — they're lunar). Array lengths can also change (Pradosh jumps from ~24 to ~25–26 in an Adhik Maas year; Sawan can have 4 or 5 Mondays). Spot-check Maha Shivratri's date and the Sawan start date against a quick search before shipping each year.

---

## Task: Generate "Lord Shiva special days" JSON for a given year (India)

When I ask to generate/update the Shiva special-days calendar for a year, follow this spec exactly.

### Hard rules

- **Always web-search authoritative Hindu Panchang data for the target year. Never use training-data dates** — tithi-to-date mappings change every year and depend on local sunset.
- Compute everything for **New Delhi, India, using the Purnimanta (North Indian) calendar** as the primary basis. Note the Amanta (South/West) variant inside the relevant `note` fields, but keep `festivalDates` on the North Indian / Delhi basis.
- For **Pradosh Vrat and Masik Shivratri, use the OBSERVANCE date** (the day the tithi prevails during the relevant kaal at New Delhi sunset), **not** the raw tithi-start date — these can differ by one day.
- **Check whether the year has an Adhik Maas (extra lunar month).** If so, that month adds an extra pair of Pradosh dates (and the Pradosh count rises above 24). Account for it.
- Output **valid JSON only** (double quotes, no comments, no trailing commas) as a downloadable file named `shiva-special-days-<YEAR>-india.json`.

### Sources to use (cross-check at least two)

Drik Panchang (drikpanchang.com) for Pradosh, Masik Shivratri, Sawan Somwar, Maha Shivratri, Sawan Shivratri; plus an India-default panchang (e.g. smartpuja, panchangbodh, astroyogi, bhaktibharat) to confirm the Delhi observance dates and Adhik Maas.

### Output: a JSON array with one object per category, in this order

1. **Somvar** — weekly Monday rule; `weekday: 1`; empty `festivalDates`.
2. **Sawan Somvar** — `weekday: 1`; `festivalDates` = the Mondays in North-India Sawan that year.
3. **Pradosh Vrat** — `tithi: "Trayodashi"`; `festivalDates` = all observance dates that year.
4. **Masik Shivratri** — `tithi: "Chaturdashi"`, `paksha: "krishna"`; `festivalDates` = 12 monthly dates.
5. **Maha Shivratri** — `tithi: "Chaturdashi"`, `paksha: "krishna"`; `festivalDates` = single date.
6. **Sawan Shivratri** — `tithi: "Chaturdashi"`, `paksha: "krishna"`; `festivalDates` = single date.
7. **Sawan / Shravan Maas** — period; use `startDate` + `endDate` (North India) instead of `festivalDates`.
8. **Nag Panchami** — `tithi: "Panchami"`, `paksha: "shukla"`; `festivalDates` = single date (Shiva-associated serpent worship).

### Required fields on EVERY object

- `labelEn` (English name) and `labelHi` (Hindi name in Devanagari)
- the rule/date fields listed above (`weekday` / `tithi` / `paksha` / `festivalDates` / `startDate` / `endDate`)
- `note` — English: what the day/period is **and** its importance; call out year-specific specifics (e.g. which Pradosh dates are Soma/Shani, whether a Shivratri falls on Tue/Mon), and the Delhi/Purnimanta basis + sunset caveat where relevant.
- `noteHi` — a faithful Hindi (Devanagari) translation of `note`.

Dates in `YYYY-MM-DD` (ISO format).

### Format anchor (one object, for shape only — regenerate values for the target year)

```json
{
  "labelEn": "Maha Shivratri",
  "labelHi": "महाशिवरात्रि",
  "tithi": "Chaturdashi",
  "paksha": "krishna",
  "festivalDates": ["YYYY-02-DD"],
  "note": "The greatest night of Shiva ... (description + importance)",
  "noteHi": "शिव की महानतम रात्रि ... (विवरण व महत्व)"
}
```
