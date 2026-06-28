"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

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
  source: string;
  license: string;
};
type SpecialDay = {
  labelEn: string;
  labelHi: string;
  weekday: string; // "" or "0".."6" in the form; coerced on submit
  tithi: string;
  festivalDates: string; // comma/space separated YYYY-MM-DD in the form
  note: string;
};

interface DeityForm {
  key: string;
  active: boolean;
  nameEn: string;
  nameHi: string;
  mantra: string;
  transliteration: string;
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
    festivalDates?: string[];
    note?: string;
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
  source: "",
  license: "",
};
const EMPTY_SPECIAL: SpecialDay = {
  labelEn: "",
  labelHi: "",
  weekday: "",
  tithi: "",
  festivalDates: "",
  note: "",
};

const EMPTY_FORM: DeityForm = {
  key: "",
  active: true,
  nameEn: "",
  nameHi: "",
  mantra: "",
  transliteration: "",
  sortOrder: "0",
  aartis: [],
  bhajans: [],
  scriptures: [],
  specialDays: [],
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  function startEdit(row: DeityRow) {
    setEditingId(row.id);
    setForm({
      key: row.key,
      active: row.active,
      nameEn: row.nameEn,
      nameHi: row.nameHi,
      mantra: row.mantra,
      transliteration: row.transliteration ?? "",
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
        festivalDates: (d.festivalDates ?? []).join(", "),
        note: d.note ?? "",
      })),
    });
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
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
          ...(dates.length ? { festivalDates: dates } : {}),
          ...(d.note.trim() ? { note: d.note.trim() } : {}),
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
      const d = body?.error?.details?.[0];
      toast.error(
        d
          ? `${d.field ?? "field"}: ${d.message}`
          : body?.error?.message ?? "Save failed"
      );
      return;
    }
    toast.success(editingId ? "Deity updated" : `Created ${body.data.nameEn}`);
    resetForm();
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
        <button
          type="button"
          onClick={checkLinks}
          disabled={checking}
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check media links"}
        </button>
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

      {/* ---- Create / edit form ---- */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? "Edit deity" : "Add deity"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:underline"
            >
              + New instead
            </button>
          )}
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
                  placeholder="YouTube id (11 chars)"
                  value={a.youtubeId}
                  onChange={(e) =>
                    patchItem("aartis", i, { youtubeId: e.target.value })
                  }
                  className={`font-mono ${inputCls}`}
                />
                <input
                  placeholder="Source (e.g. T-Series official)"
                  value={a.source}
                  onChange={(e) =>
                    patchItem("aartis", i, { source: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="License / rights basis"
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
                  placeholder="YouTube id (11 chars)"
                  value={b.youtubeId}
                  onChange={(e) =>
                    patchItem("bhajans", i, { youtubeId: e.target.value })
                  }
                  className={`font-mono ${inputCls}`}
                />
                <input
                  placeholder="Source"
                  value={b.source}
                  onChange={(e) =>
                    patchItem("bhajans", i, { source: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="License / rights basis"
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
                  placeholder="Source (e.g. archive.org)"
                  value={s.source}
                  onChange={(e) =>
                    patchItem("scriptures", i, { source: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="License (e.g. Public domain)"
                  value={s.license}
                  onChange={(e) =>
                    patchItem("scriptures", i, { license: e.target.value })
                  }
                  className={inputCls}
                />
              </RepeatRow>
            ))}
          </RowSection>

          {/* Special days */}
          <RowSection
            title="Special days"
            hint="Each needs a weekday, a tithi, or festival date(s)."
            onAdd={() => addItem("specialDays", { ...EMPTY_SPECIAL })}
          >
            {form.specialDays.map((d, i) => (
              <RepeatRow key={i} onRemove={() => removeItem("specialDays", i)}>
                <input
                  placeholder="Label (English)"
                  value={d.labelEn}
                  onChange={(e) =>
                    patchItem("specialDays", i, { labelEn: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Label (Hindi)"
                  value={d.labelHi}
                  onChange={(e) =>
                    patchItem("specialDays", i, { labelHi: e.target.value })
                  }
                  className={inputCls}
                />
                <select
                  value={d.weekday}
                  onChange={(e) =>
                    patchItem("specialDays", i, { weekday: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">— weekday —</option>
                  {WEEKDAYS.map((w, wi) => (
                    <option key={wi} value={String(wi)}>
                      {w}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Tithi (e.g. Chaturdashi)"
                  value={d.tithi}
                  onChange={(e) =>
                    patchItem("specialDays", i, { tithi: e.target.value })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Festival dates (YYYY-MM-DD, comma-sep)"
                  value={d.festivalDates}
                  onChange={(e) =>
                    patchItem("specialDays", i, {
                      festivalDates: e.target.value,
                    })
                  }
                  className={inputCls}
                />
                <input
                  placeholder="Note (optional)"
                  value={d.note}
                  onChange={(e) =>
                    patchItem("specialDays", i, { note: e.target.value })
                  }
                  className={inputCls}
                />
              </RepeatRow>
            ))}
          </RowSection>

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
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

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
  children,
}: {
  title: string;
  hint?: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200"
        >
          + Add
        </button>
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
