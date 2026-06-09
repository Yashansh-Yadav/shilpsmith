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
          <span className="mb-1.5 block text-sm font-semibold">
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
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>
          );
        }

        if (field.type === "color") {
          return (
            <div key={field.key}>
              {labelEl}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#10b981"}
                  onChange={(e) => set(field.label, e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200"
                />
                <input
                  type="text"
                  value={v}
                  onChange={(e) => set(field.label, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-500"
                />
              </div>
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
                    className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm disabled:opacity-50"
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
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
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
