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
    defaultPlaceholder: "Pick a shade",
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
}

// Stored shape on Product.customFields.
export type CustomFieldsConfig = Partial<Record<string, CustomFieldConfig>>;

export interface ResolvedField extends CatalogField {
  placeholder: string;
  required: boolean;
}

// Catalog fields enabled by `config`, in catalog order, with placeholders and
// required flags resolved (admin value → catalog default).
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
    };
  });
}
