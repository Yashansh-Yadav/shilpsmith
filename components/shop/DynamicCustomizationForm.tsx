"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";

import type { ResolvedField } from "../../lib/customization";

interface Props {
  fields: ResolvedField[];
  // Keyed by field label so the value reads nicely everywhere downstream
  // (cart, order page, emails) with no extra mapping.
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export default function DynamicCustomizationForm({
  fields,
  value,
  onChange,
}: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  function set(label: string, v: string) {
    onChange({ ...value, [label]: v });
  }

  async function handleImage(field: ResolvedField, file: File | undefined) {
    if (!file) return;
    const maxMB = field.maxFileMB ?? 5;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Image must be under ${maxMB} MB`);
      return;
    }
    setUploadingKey(field.key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Upload failed");
        return;
      }
      set(field.label, body.data.url as string);
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const v = value[field.label] ?? "";
        const labelEl = (
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </span>
        );

        if (field.type === "textarea") {
          return (
            <div key={field.key}>
              {labelEl}
              <textarea
                rows={3}
                maxLength={field.maxLength}
                value={v}
                onChange={(e) => set(field.label, e.target.value)}
                placeholder={field.placeholder}
                className="resize-none w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          );
        }

        if (field.type === "color") {
          // Customers pick from the admin's palette — never a free picker. A
          // field with no palette is filtered out upstream by
          // resolveStorefrontFields, so this guard should never fire; it's here
          // so a direct caller can't resurrect an empty swatch row.
          if (field.options.length === 0) return null;

          // The value we store is the colour *name*, which is what the cart,
          // order page, emails and the packing slip all need to show.
          return (
            <div key={field.key}>
              {labelEl}
              <div
                role="radiogroup"
                aria-label={field.label}
                className="flex flex-wrap gap-2"
              >
                {field.options.map((opt) => {
                  const selected = v === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={opt.name}
                      onClick={() =>
                        set(field.label, selected && !field.required ? "" : opt.name)
                      }
                      className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-[.97] ${
                        selected
                          ? "bg-slate-900 text-white ring-2 ring-slate-900"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400"
                      }`}
                    >
                      <span
                        aria-hidden
                        style={{ backgroundColor: opt.hex }}
                        className="h-4 w-4 shrink-0 rounded-full border border-black/15 shadow-inner"
                      />
                      {opt.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {v ? `Selected: ${v}` : field.placeholder}
              </p>
            </div>
          );
        }

        if (field.type === "image") {
          return (
            <div key={field.key}>
              {labelEl}
              {v ? (
                <div className="relative inline-block">
                  <img
                    src={v}
                    alt={field.label}
                    className="h-24 w-24 rounded-2xl object-cover ring-1 ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => set(field.label, "")}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingKey === field.key}
                  onChange={(e) => handleImage(field, e.target.files?.[0])}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
                />
              )}
              <p className="mt-1 text-xs text-slate-500">
                {uploadingKey === field.key ? "Uploading…" : field.placeholder}
              </p>
            </div>
          );
        }

        // Default: short text
        return (
          <div key={field.key}>
            {labelEl}
            <input
              type="text"
              maxLength={field.maxLength}
              value={v}
              onChange={(e) => set(field.label, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
        );
      })}
    </div>
  );
}

// Strip empty values before sending to the cart.
export function dynamicValuesToRecord(
  value: Record<string, string>
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}
