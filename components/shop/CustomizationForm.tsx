"use client";

export interface CustomizationValues {
  text?: string;
  color?: string;
  notes?: string;
}

interface Props {
  value: CustomizationValues;
  onChange: (next: CustomizationValues) => void;
}

const MAX_TEXT = 60;
const MAX_NOTES = 500;

export default function CustomizationForm({ value, onChange }: Props) {
  function set<K extends keyof CustomizationValues>(
    key: K,
    val: CustomizationValues[K]
  ) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold block mb-2">
          Engraving / Name
          <span className="ml-1 text-xs font-normal text-slate-500">
            (max {MAX_TEXT})
          </span>
        </label>
        <input
          type="text"
          maxLength={MAX_TEXT}
          value={value.text ?? ""}
          onChange={(e) => set("text", e.target.value)}
          placeholder="e.g. Priya & Arjun"
          className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-slate-500"
        />
        {value.text && (
          <p className="mt-1 text-xs text-slate-500">
            Preview: <span className="font-medium">{value.text}</span>
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2">Color (optional)</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value.color ?? "#000000"}
            onChange={(e) => set("color", e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200"
            aria-label="Pick a color"
          />
          <input
            type="text"
            value={value.color ?? ""}
            onChange={(e) => set("color", e.target.value)}
            placeholder="#RRGGBB or 'Matte Black'"
            className="flex-1 border border-slate-200 rounded-2xl px-4 py-2 outline-none focus:border-slate-500"
          />
          {value.color && (
            <button
              type="button"
              onClick={() => set("color", undefined)}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2">
          Special instructions
          <span className="ml-1 text-xs font-normal text-slate-500">
            (max {MAX_NOTES})
          </span>
        </label>
        <textarea
          rows={3}
          maxLength={MAX_NOTES}
          value={value.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything we should know — font, finish, measurements…"
          className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-slate-500"
        />
      </div>
    </div>
  );
}

// Normalize a CustomizationValues into the canonical record shape that the
// cart store / API expect. Removes empty strings so the JSON column stays
// tidy when the customer leaves fields blank.
export function customizationToRecord(
  v: CustomizationValues
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  if (v.text && v.text.trim()) out.text = v.text.trim();
  if (v.color && v.color.trim()) out.color = v.color.trim();
  if (v.notes && v.notes.trim()) out.notes = v.notes.trim();
  return Object.keys(out).length ? out : undefined;
}
