"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import { presetsForKey } from "../../../lib/observancePresets";

// -----------------------------------------------------------------------------
// Types — mirror the Zod schemas in lib/validators.ts. Everything is a
// reference (YouTube id / external PDF URL); media items must carry
// source + license so provenance is always recorded.
// -----------------------------------------------------------------------------

type Aarti = {
  labelEn: string;
  labelHi: string;
  youtubeId: string;
  slot: "morning" | "sandhya" | "other";
  source: string;
  license: string;
};
type Bhajan = {
  labelEn: string;
  labelHi: string;
  youtubeId: string;
  source: string;
  license: string;
};
type Scripture = {
  titleEn: string;
  titleHi: string;
  lang: "hi" | "sa" | "en";
  pdfUrl: string;
  description: string;
  source: string;
  license: string;
};
type SpecialDay = {
  labelEn: string;
  labelHi: string;
  weekday: string; // "" or "0".."6" in the form; coerced on submit
  tithi: string;
  paksha: "" | "shukla" | "krishna";
  festivalDates: string; // comma/space separated YYYY-MM-DD in the form
  startDate: string; // YYYY-MM-DD (date-range observances)
  endDate: string; // YYYY-MM-DD
  note: string; // English
  noteHi: string; // Hindi
};

interface DeityForm {
  key: string;
  active: boolean;
  nameEn: string;
  nameHi: string;
  mantra: string;
  transliteration: string;
  jaikaraHi: string;
  jaikaraEn: string;
  sortOrder: string;
  aartis: Aarti[];
  bhajans: Bhajan[];
  scriptures: Scripture[];
  specialDays: SpecialDay[];
}

interface DeityRow extends Omit<DeityForm, "sortOrder" | "specialDays"> {
  id: number;
  sortOrder: number;
  specialDays: {
    labelEn: string;
    labelHi: string;
    weekday?: number;
    tithi?: string;
    paksha?: "shukla" | "krishna";
    festivalDates?: string[];
    startDate?: string;
    endDate?: string;
    note?: string;
    noteHi?: string;
  }[];
  _count?: { products: number };
}

const EMPTY_AARTI: Aarti = {
  labelEn: "",
  labelHi: "",
  youtubeId: "",
  slot: "morning",
  source: "",
  license: "",
};
const EMPTY_BHAJAN: Bhajan = {
  labelEn: "",
  labelHi: "",
  youtubeId: "",
  source: "",
  license: "",
};
const EMPTY_SCRIPTURE: Scripture = {
  titleEn: "",
  titleHi: "",
  lang: "hi",
  pdfUrl: "",
  description: "",
  source: "",
  license: "",
};
const EMPTY_SPECIAL: SpecialDay = {
  labelEn: "",
  labelHi: "",
  weekday: "",
  tithi: "",
  paksha: "",
  festivalDates: "",
  startDate: "",
  endDate: "",
  note: "",
  noteHi: "",
};

const EMPTY_FORM: DeityForm = {
  key: "",
  active: true,
  nameEn: "",
  nameHi: "",
  mantra: "",
  transliteration: "",
  jaikaraHi: "",
  jaikaraEn: "",
  sortOrder: "0",
  aartis: [],
  bhajans: [],
  scriptures: [],
  specialDays: [],
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Reference template shown in the JSON-import panel. weekday: 0=Sun..6=Sat.
const SPECIAL_DAYS_JSON_SAMPLE = `[
  { "labelEn": "Somvar", "labelHi": "सोमवार", "weekday": 1, "note": "Monday", "noteHi": "सोमवार" },
  { "labelEn": "Pradosh Vrat", "labelHi": "प्रदोष व्रत", "tithi": "Trayodashi" },
  { "labelEn": "Masik Shivratri", "labelHi": "मासिक शिवरात्रि", "tithi": "Chaturdashi", "paksha": "krishna" },
  { "labelEn": "Maha Shivratri", "labelHi": "महाशिवरात्रि", "festivalDates": ["2026-02-15"], "note": "Great night of Shiva", "noteHi": "शिव की महान रात्रि" },
  { "labelEn": "Shravan Maas", "labelHi": "श्रावण मास", "startDate": "2026-07-30", "endDate": "2026-08-28", "note": "Holiest month for Shiva", "noteHi": "शिव का सबसे पवित्र मास" }
]`;

const tdInputCls =
  "w-full rounded-lg border border-slate-200 px-2 py-1 text-xs";

interface HealthIssue {
  kind: string;
  label: string;
  target: string;
  problem: string;
}
interface HealthReport {
  totalIssues: number;
  deities: {
    id: number;
    key: string;
    nameEn: string;
    checked: number;
    issues: HealthIssue[];
  }[];
}

const inputCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm w-full";

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function DeitiesAdminPage() {
  const [rows, setRows] = useState<DeityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // null = create
  const [form, setForm] = useState<DeityForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/deities");
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load deities");
      return;
    }
    setRows(body.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    resetForm();
    setJsonOpen(false);
    setJsonText("");
  }

  function openCreate() {
    resetForm();
    setJsonOpen(false);
    setJsonText("");
    setModalOpen(true);
  }

  function startEdit(row: DeityRow) {
    setEditingId(row.id);
    setForm({
      key: row.key,
      active: row.active,
      nameEn: row.nameEn,
      nameHi: row.nameHi,
      mantra: row.mantra,
      transliteration: row.transliteration ?? "",
      jaikaraHi: row.jaikaraHi ?? "",
      jaikaraEn: row.jaikaraEn ?? "",
      sortOrder: String(row.sortOrder ?? 0),
      aartis: (row.aartis ?? []).map((a) => ({ ...EMPTY_AARTI, ...a })),
      bhajans: (row.bhajans ?? []).map((b) => ({ ...EMPTY_BHAJAN, ...b })),
      scriptures: (row.scriptures ?? []).map((s) => ({
        ...EMPTY_SCRIPTURE,
        ...s,
      })),
      specialDays: (row.specialDays ?? []).map((d) => ({
        labelEn: d.labelEn ?? "",
        labelHi: d.labelHi ?? "",
        weekday: d.weekday != null ? String(d.weekday) : "",
        tithi: d.tithi ?? "",
        paksha: d.paksha ?? "",
        festivalDates: (d.festivalDates ?? []).join(", "),
        startDate: d.startDate ?? "",
        endDate: d.endDate ?? "",
        note: d.note ?? "",
        noteHi: d.noteHi ?? "",
      })),
    });
    setModalOpen(true);
  }

  // Build the JSON payload from the form, coercing the string-ish form fields.
  function buildPayload() {
    return {
      key: form.key.trim(),
      active: form.active,
      nameEn: form.nameEn.trim(),
      nameHi: form.nameHi.trim(),
      mantra: form.mantra.trim(),
      transliteration: form.transliteration.trim() || undefined,
      jaikaraHi: form.jaikaraHi.trim() || undefined,
      jaikaraEn: form.jaikaraEn.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      aartis: form.aartis,
      bhajans: form.bhajans,
      scriptures: form.scriptures,
      specialDays: form.specialDays.map((d) => {
        const dates = d.festivalDates
          .split(/[\s,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        return {
          labelEn: d.labelEn.trim(),
          labelHi: d.labelHi.trim(),
          ...(d.weekday !== "" ? { weekday: Number(d.weekday) } : {}),
          ...(d.tithi.trim() ? { tithi: d.tithi.trim() } : {}),
          ...(d.paksha ? { paksha: d.paksha } : {}),
          ...(dates.length ? { festivalDates: dates } : {}),
          ...(d.startDate.trim() ? { startDate: d.startDate.trim() } : {}),
          ...(d.endDate.trim() ? { endDate: d.endDate.trim() } : {}),
          ...(d.note.trim() ? { note: d.note.trim() } : {}),
          ...(d.noteHi.trim() ? { noteHi: d.noteHi.trim() } : {}),
        };
      }),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = buildPayload();
    const url = editingId
      ? `/api/admin/deities/${editingId}`
      : "/api/admin/deities";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok || !body.success) {
      const details = body?.error?.details as
        | { field?: string; message: string }[]
        | undefined;
      if (details && details.length) {
        // Show every failing field so a blocking item (e.g. an aarti) is visible
        // — not just the first.
        toast.error(
          details
            .slice(0, 5)
            .map((d) => `${d.field ?? "field"}: ${d.message}`)
            .join("\n"),
          { duration: 6000 }
        );
      } else {
        toast.error(body?.error?.message ?? "Save failed");
      }
      return;
    }
    toast.success(editingId ? "Deity updated" : `Created ${body.data.nameEn}`);
    setModalOpen(false);
    resetForm();
    setJsonOpen(false);
    setJsonText("");
    load();
  }

  async function remove(row: DeityRow) {
    if (!confirm(`Delete ${row.nameEn}? (disabled instead if linked to products)`))
      return;
    const res = await fetch(`/api/admin/deities/${row.id}`, {
      method: "DELETE",
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success(body.message ?? "Deleted");
    if (editingId === row.id) resetForm();
    load();
  }

  async function checkLinks() {
    setChecking(true);
    setHealth(null);
    const res = await fetch("/api/admin/deities/health");
    const body = await res.json();
    setChecking(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Link check failed");
      return;
    }
    setHealth(body.data);
    toast.success(
      body.data.totalIssues === 0
        ? "All media links OK"
        : `${body.data.totalIssues} link issue(s) found`
    );
  }

  // One-click: append the recurring preset observances for this deity (by key),
  // skipping any already present by label. No API, no per-year date upkeep.
  function addSuggestedDays() {
    const presets = presetsForKey(form.key || "");
    setForm((f) => {
      const seen = new Set(
        f.specialDays.map((d) => d.labelEn.trim().toLowerCase())
      );
      const additions: SpecialDay[] = presets
        .filter((p) => !seen.has(p.labelEn.trim().toLowerCase()))
        .map((p) => ({
          labelEn: p.labelEn,
          labelHi: p.labelHi,
          weekday: p.weekday !== undefined ? String(p.weekday) : "",
          tithi: p.tithi ?? "",
          paksha: p.paksha ?? "",
          festivalDates: "",
          startDate: "",
          endDate: "",
          note: p.note ?? "",
          noteHi: p.noteHi ?? "",
        }));
      if (additions.length === 0) {
        toast("All suggested days already added");
        return f;
      }
      toast.success(`Added ${additions.length} suggested day(s)`);
      return { ...f, specialDays: [...f.specialDays, ...additions] };
    });
  }

  // Bulk import special days from a JSON array (paste or file). Accepts the
  // same shape stored in the DB (weekday: number, festivalDates: string[],
  // paksha: "shukla"|"krishna") and maps it to the form's string fields.
  function importSpecialDaysJson() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast.error("Invalid JSON — check the format");
      return;
    }
    if (!Array.isArray(parsed)) {
      toast.error("JSON must be an array of special days");
      return;
    }
    const mapped: SpecialDay[] = [];
    for (const raw of parsed) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const labelEn = String(item.labelEn ?? "").trim();
      const labelHi = String(item.labelHi ?? "").trim();
      if (!labelEn && !labelHi) continue;
      const wd = item.weekday;
      const fest = Array.isArray(item.festivalDates)
        ? item.festivalDates.join(", ")
        : typeof item.festivalDates === "string"
          ? item.festivalDates
          : "";
      mapped.push({
        labelEn,
        labelHi,
        weekday:
          typeof wd === "number" && wd >= 0 && wd <= 6 ? String(wd) : "",
        tithi: String(item.tithi ?? "").trim(),
        paksha:
          item.paksha === "shukla" || item.paksha === "krishna"
            ? item.paksha
            : "",
        festivalDates: fest,
        startDate: String(item.startDate ?? "").trim(),
        endDate: String(item.endDate ?? "").trim(),
        note: String(item.note ?? "").trim(),
        noteHi: String(item.noteHi ?? "").trim(),
      });
    }
    if (mapped.length === 0) {
      toast.error("No valid special days found in the JSON");
      return;
    }

    // De-dupe the JSON itself by label (last wins) so a JSON with repeated
    // labels can't create duplicate rows.
    const keyOf = (d: { labelEn: string; labelHi: string }) =>
      (d.labelEn || d.labelHi).trim().toLowerCase();
    const byLabel = new Map<string, SpecialDay>();
    for (const m of mapped) byLabel.set(keyOf(m), m);
    const clean = [...byLabel.values()];
    const droppedInternal = mapped.length - clean.length;

    // Import REPLACES the table — what's in the JSON is exactly what you get
    // (no append-duplicates, no silently skipped rows). Confirm if replacing
    // existing rows.
    if (
      form.specialDays.length > 0 &&
      typeof window !== "undefined" &&
      !window.confirm(
        `Replace all ${form.specialDays.length} current special day(s) with ${clean.length} from the JSON?`
      )
    ) {
      return;
    }

    setForm((f) => ({ ...f, specialDays: clean }));
    setJsonText("");
    setJsonOpen(false);
    toast.success(
      `Loaded ${clean.length} from JSON${
        droppedInternal ? ` (${droppedInternal} duplicate label(s) merged)` : ""
      } — click “Save changes” to store`,
      { duration: 6000 }
    );
  }

  function handleJsonFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJsonText(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Could not read file");
    reader.readAsText(file);
  }

  // Generic helpers for the repeatable sections.
  function addItem<K extends "aartis" | "bhajans" | "scriptures" | "specialDays">(
    key: K,
    empty: DeityForm[K][number]
  ) {
    setForm((f) => ({ ...f, [key]: [...f[key], empty] }));
  }
  function removeItem(
    key: "aartis" | "bhajans" | "scriptures" | "specialDays",
    idx: number
  ) {
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }));
  }
  function patchItem<
    K extends "aartis" | "bhajans" | "scriptures" | "specialDays"
  >(key: K, idx: number, patch: Partial<DeityForm[K][number]>) {
    setForm((f) => ({
      ...f,
      [key]: f[key].map((item, i) =>
        i === idx ? { ...item, ...patch } : item
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Deities</h1>
          <p className="text-sm text-slate-500">
            Powers the NFC idol experience at{" "}
            <code className="rounded bg-slate-100 px-1">/darshan/&lt;key&gt;</code>
            . Add only references — YouTube video ids and external PDF links.
            Every aarti, bhajan and scripture must record its source &amp;
            license.
          </p>
        </div>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={checkLinks}
            disabled={checking}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Check media links"}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add deity
          </button>
        </div>
      </div>

      {health && health.totalIssues > 0 && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-red-700">
            {health.totalIssues} link issue(s)
          </h2>
          <ul className="space-y-2 text-sm">
            {health.deities
              .filter((d) => d.issues.length > 0)
              .map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.nameEn}</span>
                  <ul className="ml-4 list-disc text-red-800">
                    {d.issues.map((iss, i) => (
                      <li key={i}>
                        [{iss.kind}] {iss.label} —{" "}
                        <span className="font-mono">{iss.target}</span>:{" "}
                        {iss.problem}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* ---- Create / edit modal ---- */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <section
            className="my-6 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit deity" : "Add deity"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-xs font-medium text-slate-500">
              Key (URL slug)
              <input
                required
                placeholder="shiva"
                value={form.key}
                onChange={(e) =>
                  setForm({ ...form, key: e.target.value.toLowerCase() })
                }
                className={`mt-1 font-mono ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Name (English)
              <input
                required
                placeholder="Mahadev"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Name (Hindi)
              <input
                required
                placeholder="महादेव"
                value={form.nameHi}
                onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Mantra
              <input
                required
                placeholder="ॐ नमः शिवाय"
                value={form.mantra}
                onChange={(e) => setForm({ ...form, mantra: e.target.value })}
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Transliteration (optional)
              <input
                placeholder="Om Namah Shivaya"
                value={form.transliteration}
                onChange={(e) =>
                  setForm({ ...form, transliteration: e.target.value })
                }
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Jaikara — Hindi (spoken at end of panchang)
              <input
                placeholder="हर हर महादेव"
                value={form.jaikaraHi}
                onChange={(e) =>
                  setForm({ ...form, jaikaraHi: e.target.value })
                }
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Jaikara — English
              <input
                placeholder="Har Har Mahadev"
                value={form.jaikaraEn}
                onChange={(e) =>
                  setForm({ ...form, jaikaraEn: e.target.value })
                }
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Sort order
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: e.target.value })
                }
                className={`mt-1 ${inputCls}`}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active (visible at /darshan)
          </label>

          {/* Aartis */}
          <RowSection
            title="Aartis"
            onAdd={() => addItem("aartis", { ...EMPTY_AARTI })}
          >
            {form.aartis.map((a, i) => (
              <RepeatRow key={i} onRemove={() => removeItem("aartis", i)}>
                <select
                  value={a.slot}
                  onChange={(e) =>
                    patchItem("aartis", i, {
                      slot: e.target.value as Aarti["slot"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="morning">Morning</option>
                  <option value="sandhya">Sandhya (evening)</option>
                  <option value="other">Other</option>
                </select>
                <input
                  placeholder="Label (English)"
                  value={a.labelEn}
                  onChange={(e) =>
                    patchItem("aartis", i, { labelEn: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Label (Hindi)"
                  value={a.labelHi}
                  onChange={(e) =>
                    patchItem("aartis", i, { labelHi: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="YouTube link or video id"
                  value={a.youtubeId}
                  onChange={(e) =>
                    patchItem("aartis", i, { youtubeId: e.target.value })
                  }
                  className={`font-mono ${inputCls}`}
                />
                <input
                  placeholder="Source (optional, e.g. T-Series)"
                  value={a.source}
                  onChange={(e) =>
                    patchItem("aartis", i, { source: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="License / rights (optional)"
                  value={a.license}
                  onChange={(e) =>
                    patchItem("aartis", i, { license: e.target.value })
                  }
                  className={inputCls}
                />
              </RepeatRow>
            ))}
          </RowSection>

          {/* Bhajans */}
          <RowSection
            title="Bhajans"
            onAdd={() => addItem("bhajans", { ...EMPTY_BHAJAN })}
          >
            {form.bhajans.map((b, i) => (
              <RepeatRow key={i} onRemove={() => removeItem("bhajans", i)}>
                <input
                  placeholder="Label (English)"
                  value={b.labelEn}
                  onChange={(e) =>
                    patchItem("bhajans", i, { labelEn: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Label (Hindi)"
                  value={b.labelHi}
                  onChange={(e) =>
                    patchItem("bhajans", i, { labelHi: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="YouTube link or video id"
                  value={b.youtubeId}
                  onChange={(e) =>
                    patchItem("bhajans", i, { youtubeId: e.target.value })
                  }
                  className={`font-mono ${inputCls}`}
                />
                <input
                  placeholder="Source (optional)"
                  value={b.source}
                  onChange={(e) =>
                    patchItem("bhajans", i, { source: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="License / rights (optional)"
                  value={b.license}
                  onChange={(e) =>
                    patchItem("bhajans", i, { license: e.target.value })
                  }
                  className={inputCls}
                />
              </RepeatRow>
            ))}
          </RowSection>

          {/* Scriptures */}
          <RowSection
            title="Scriptures"
            onAdd={() => addItem("scriptures", { ...EMPTY_SCRIPTURE })}
          >
            {form.scriptures.map((s, i) => (
              <RepeatRow key={i} onRemove={() => removeItem("scriptures", i)}>
                <input
                  placeholder="Title (English)"
                  value={s.titleEn}
                  onChange={(e) =>
                    patchItem("scriptures", i, { titleEn: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Title (Hindi)"
                  value={s.titleHi}
                  onChange={(e) =>
                    patchItem("scriptures", i, { titleHi: e.target.value })
                  }
                  className={inputCls}
                />
                <select
                  value={s.lang}
                  onChange={(e) =>
                    patchItem("scriptures", i, {
                      lang: e.target.value as Scripture["lang"],
                    })
                  }
                  className={inputCls}
                >
                  <option value="hi">Hindi</option>
                  <option value="sa">Sanskrit</option>
                  <option value="en">English</option>
                </select>
                <input
                  placeholder="PDF URL (https://…)"
                  value={s.pdfUrl}
                  onChange={(e) =>
                    patchItem("scriptures", i, { pdfUrl: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Short description (optional)"
                  value={s.description}
                  onChange={(e) =>
                    patchItem("scriptures", i, { description: e.target.value })
                  }
                  className={`md:col-span-2 ${inputCls}`}
                />
                <input
                  placeholder="Source (optional, e.g. archive.org)"
                  value={s.source}
                  onChange={(e) =>
                    patchItem("scriptures", i, { source: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="License (optional, e.g. Public domain)"
                  value={s.license}
                  onChange={(e) =>
                    patchItem("scriptures", i, { license: e.target.value })
                  }
                  className={inputCls}
                />
              </RepeatRow>
            ))}
          </RowSection>

          {/* Special days — compact table */}
          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Special days</h3>
                <p className="text-xs text-slate-400">
                  Recurring rules (weekday / tithi / paksha) auto-repeat — no
                  dates needed. Use ✨ for this deity&apos;s common days, or import
                  many at once via JSON.
                </p>
              </div>
              <div className="flex flex-none flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setJsonOpen((v) => !v)}
                  className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200"
                >
                  ⬆ Import JSON
                </button>
                <button
                  type="button"
                  onClick={addSuggestedDays}
                  className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  ✨ Add suggested
                </button>
                <button
                  type="button"
                  onClick={() => addItem("specialDays", { ...EMPTY_SPECIAL })}
                  className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200"
                >
                  + Add row
                </button>
              </div>
            </div>

            {/* JSON import panel */}
            {jsonOpen && (
              <div className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => handleJsonFile(e.target.files?.[0])}
                    className="text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setJsonText(SPECIAL_DAYS_JSON_SAMPLE)}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    Load reference
                  </button>
                  <span className="text-[11px] text-slate-400">
                    weekday: 0=Sun … 6=Sat · paksha: shukla|krishna ·
                    festivalDates: [&quot;YYYY-MM-DD&quot;]
                  </span>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={7}
                  placeholder={SPECIAL_DAYS_JSON_SAMPLE}
                  className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={importSpecialDaysJson}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Import (replace table)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonOpen(false);
                      setJsonText("");
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {form.specialDays.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                No special days yet — add a row, click ✨, or import JSON.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-1 py-1 font-medium">Label (EN)</th>
                      <th className="px-1 py-1 font-medium">Label (HI)</th>
                      <th className="px-1 py-1 font-medium">Weekday</th>
                      <th className="px-1 py-1 font-medium">Tithi</th>
                      <th className="px-1 py-1 font-medium">Paksha</th>
                      <th className="px-1 py-1 font-medium">Festival dates</th>
                      <th className="px-1 py-1 font-medium">Start date</th>
                      <th className="px-1 py-1 font-medium">End date</th>
                      <th className="px-1 py-1 font-medium">Note (EN)</th>
                      <th className="px-1 py-1 font-medium">Note (HI)</th>
                      <th className="px-1 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.specialDays.map((d, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-1 py-1">
                          <input
                            value={d.labelEn}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                labelEn: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={d.labelHi}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                labelHi: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={d.weekday}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                weekday: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          >
                            <option value="">—</option>
                            {WEEKDAYS.map((w, wi) => (
                              <option key={wi} value={String(wi)}>
                                {w}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            placeholder="Chaturdashi"
                            value={d.tithi}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                tithi: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={d.paksha}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                paksha: e.target.value as SpecialDay["paksha"],
                              })
                            }
                            className={tdInputCls}
                          >
                            <option value="">—</option>
                            <option value="shukla">Shukla</option>
                            <option value="krishna">Krishna</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            placeholder="2026-02-15"
                            value={d.festivalDates}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                festivalDates: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            placeholder="2026-07-30"
                            value={d.startDate}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                startDate: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            placeholder="2026-08-28"
                            value={d.endDate}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                endDate: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={d.note}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                note: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={d.noteHi}
                            onChange={(e) =>
                              patchItem("specialDays", i, {
                                noteHi: e.target.value,
                              })
                            }
                            className={tdInputCls}
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem("specialDays", i)}
                            className="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting
                    ? "Saving…"
                    : editingId
                    ? "Save changes"
                    : "Create deity"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ---- List ---- */}
      <section className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Deity</th>
              <th className="px-3 py-3">Key</th>
              <th className="px-3 py-3">Aartis</th>
              <th className="px-3 py-3">Scriptures</th>
              <th className="px-3 py-3">Products</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No deities yet.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.nameEn}</div>
                    <div className="text-slate-500">{r.nameHi}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-600">{r.key}</td>
                  <td className="px-3 py-3 text-slate-500">
                    {r.aartis?.length ?? 0}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {r.scriptures?.length ?? 0}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {r._count?.products ?? 0}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        r.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="mr-3 text-xs text-slate-700 hover:underline"
                    >
                      Edit
                    </button>
                    <a
                      href={`/darshan/${r.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-3 text-xs text-emerald-700 hover:underline"
                    >
                      Preview
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Small presentational helpers
// -----------------------------------------------------------------------------

function RowSection({
  title,
  hint,
  onAdd,
  onSuggest,
  suggestLabel = "✨ Add suggested",
  children,
}: {
  title: string;
  hint?: string;
  onAdd: () => void;
  onSuggest?: () => void;
  suggestLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
        <div className="flex flex-none gap-2">
          {onSuggest && (
            <button
              type="button"
              onClick={onSuggest}
              className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              {suggestLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200"
          >
            + Add
          </button>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RepeatRow({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">{children}</div>
      <div className="mt-2 text-right">
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
