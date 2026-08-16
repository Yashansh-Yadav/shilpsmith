// lib/customization.ts
//
// Catalog of pre-built customization fields. The admin doesn't define fields
// from scratch — they tick which of these a product uses and set a placeholder
// (and optionally mark it required) per field. Stored on Product.customFields as
// a map keyed by field key (presence of a key = enabled):
//
//   { "size": { placeholder: "S, M, or L", required: true }, "image": {...} }
//
// Shared by the admin builder, the storefront renderer, and server validation,
// so it's plain data with no React/Node dependencies.

export type CustomFieldType = "text" | "textarea" | "color" | "image";

export interface CatalogField {
  key: string;
  label: string;
  type: CustomFieldType;
  defaultPlaceholder: string;
  maxLength?: number;
  maxFileMB?: number;
}

// A single entry in a product's colour palette. `name` is what the customer
// picks and what lands in the cart/order (a hex code means nothing on a
// packing slip); `hex` only drives the swatch.
export interface ColorOption {
  name: string;
  hex: string;
}

export const MAX_COLOR_OPTIONS = 24;
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Order here is the order fields render in the storefront.
export const CUSTOMIZATION_CATALOG: readonly CatalogField[] = [
  {
    key: "engraving",
    label: "Name / Engraving",
    type: "text",
    defaultPlaceholder: "e.g. Priya & Arjun",
    maxLength: 60,
  },
  {
    key: "size",
    label: "Size",
    type: "text",
    defaultPlaceholder: "e.g. S, M, or L",
    maxLength: 60,
  },
  {
    key: "color",
    label: "Color",
    type: "color",
    defaultPlaceholder: "Choose a colour",
  },
  {
    key: "description",
    label: "Description / Instructions",
    type: "textarea",
    defaultPlaceholder: "Tell us the details…",
    maxLength: 500,
  },
  {
    key: "image",
    label: "Reference image",
    type: "image",
    defaultPlaceholder: "Upload a clear reference photo",
    maxFileMB: 5,
  },
];

// Tuple of valid keys for Zod validation.
export const CUSTOM_FIELD_KEYS = [
  "engraving",
  "size",
  "color",
  "description",
  "image",
] as const;

export interface CustomFieldConfig {
  placeholder?: string;
  required?: boolean;
  // Only meaningful on `color` fields: the palette the admin makes available.
  options?: ColorOption[];
}

// Stored shape on Product.customFields.
export type CustomFieldsConfig = Partial<Record<string, CustomFieldConfig>>;

export interface ResolvedField extends CatalogField {
  placeholder: string;
  required: boolean;
  // Empty for every field type except `color`, and empty there too when the
  // admin hasn't defined a palette yet.
  options: ColorOption[];
}

// Drop anything that can't render as a swatch. A malformed entry saved by an
// older/other client must not blank the whole selector, so this filters rather
// than throws — validation at the API boundary is what rejects bad input.
export function normalizeColorOptions(value: unknown): ColorOption[] {
  if (!Array.isArray(value)) return [];
  const out: ColorOption[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const { name, hex } = raw as Partial<ColorOption>;
    if (typeof name !== "string" || typeof hex !== "string") continue;
    const trimmed = name.trim();
    if (!trimmed || !HEX_COLOR_RE.test(hex)) continue;
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ name: trimmed, hex: hex.toLowerCase() });
    if (out.length >= MAX_COLOR_OPTIONS) break;
  }
  return out;
}

// Catalog fields enabled by `config`, in catalog order, with placeholders,
// required flags and colour palettes resolved (admin value → catalog default).
export function resolveEnabledFields(
  config: CustomFieldsConfig | null | undefined
): ResolvedField[] {
  if (!config || typeof config !== "object") return [];
  return CUSTOMIZATION_CATALOG.filter((f) => config[f.key]).map((f) => {
    const c = config[f.key] ?? {};
    return {
      ...f,
      placeholder: c.placeholder?.trim() || f.defaultPlaceholder,
      required: c.required === true,
      options: f.type === "color" ? normalizeColorOptions(c.options) : [],
    };
  });
}

// What the storefront actually renders. A colour field with no palette has
// nothing to select from, and we never fall back to a free colour picker — so
// it's dropped entirely rather than shown as an unanswerable (possibly
// required) field. The admin form warns when a product is in this state.
export function resolveStorefrontFields(
  config: CustomFieldsConfig | null | undefined
): ResolvedField[] {
  return resolveEnabledFields(config).filter(
    (f) => f.type !== "color" || f.options.length > 0
  );
}
