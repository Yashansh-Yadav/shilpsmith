import { z } from "zod";

import { sanitizeHtml } from "./sanitize";
import { CUSTOM_FIELD_KEYS } from "./customization";

// Per-product customization config: a map of enabled catalog field key →
// { placeholder?, required? }. Unknown keys are rejected.
const CustomFieldConfigSchema = z
  .object({
    placeholder: z.string().trim().max(120).optional(),
    required: z.boolean().optional(),
  })
  .strict();

// Partial map of enabled catalog field key → config. Use a string-keyed record
// (inherently partial — any subset, including none) and reject keys that aren't
// in the catalog. NOTE: do NOT use z.record(z.enum(...)) here — in Zod v4 an
// enum-keyed record is exhaustive (requires every key), so unchecking a field
// would wrongly fail validation.
const CATALOG_KEY_SET = new Set<string>(CUSTOM_FIELD_KEYS);

export const CustomFieldsSchema = z
  .record(z.string(), CustomFieldConfigSchema)
  .refine((obj) => Object.keys(obj).every((k) => CATALOG_KEY_SET.has(k)), {
    message: "Unknown customization field",
  });

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

// Indian phone: optional +91/0 prefix, then 10 digits starting 6-9.
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+91|0)?[6-9]\d{9}$/,
    "Enter a valid 10-digit Indian phone number"
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

// Prices are stored as strings (legacy schema) but must be a positive number
// expressed with up to 2 decimals. Accept with or without a currency prefix.
export const priceSchema = z
  .string()
  .trim()
  .regex(
    /^[₹$€]?\s*\d+(\.\d{1,2})?$/,
    "Price must be a positive number with up to 2 decimals"
  )
  .refine((v) => {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0;
  }, "Price must be greater than zero");

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers, and dashes");

// Strip any currency prefix / whitespace from a stored price string and
// return a finite Number. Returns NaN if the string is malformed; callers
// should treat NaN as a hard error (the price was meant to pass `priceSchema`
// when written, so this only fails on bad legacy rows).
export function parsePrice(raw: string | null | undefined): number {
  if (raw == null) return NaN;
  const cleaned = String(raw).replace(/[^\d.]/g, "");
  if (!cleaned) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const LoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required").max(200),
  })
  .strict();

export const UserRegisterSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(200),
    name: z.string().trim().min(1).max(100).optional(),
    phone: phoneSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const stockStatusValues = ["in-stock", "low-stock", "out-of-stock"] as const;

export const ProductCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    category: slugSchema,
    shortDescription: z.string().trim().max(500).optional(),
    // Rich-text (HTML) authored in the admin editor. Sanitized at the boundary
    // since it's rendered to the public storefront. The min(1) runs on the raw
    // input before sanitize so an empty description is still rejected.
    description: z
      .string()
      .trim()
      .min(1)
      .max(20000)
      .transform((v) => sanitizeHtml(v)),
    price: priceSchema,
    discountPrice: priceSchema.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    // Gallery images, in display order (first = cover). `image` is the legacy
    // single-image field kept for backward compatibility; the product routes
    // accept either and normalize to a list.
    image: z.string().url("Image must be a URL").optional(),
    images: z
      .array(z.string().url("Each image must be a URL"))
      .max(10, "Up to 10 images allowed")
      .optional(),
    modelUrl: z
      .string()
      .url("Model URL must be a URL")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    featured: z.boolean().optional().default(false),
    customizable: z.boolean().optional().default(false),
    customFields: CustomFieldsSchema.optional(),
    // Optional link to a Deity catalog entry (Darshan / NFC idols).
    deityId: z.number().int().positive().optional().nullable(),
    stockStatus: z.enum(stockStatusValues).optional().default("in-stock"),
    stock: z.number().int().min(0).optional().default(0),
    whatsappMessage: z.string().max(1000).optional().default(""),
  })
  .strict();

export const ProductUpdateSchema = ProductCreateSchema.partial().strict();

export const CategoryCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional().default(""),
    image: z.string().url().optional().or(z.literal("")).transform((v) => v || ""),
  })
  .strict();

export const CategoryUpdateSchema = CategoryCreateSchema.partial().strict();

// ---------------------------------------------------------------------------
// Darshan / NFC idols — Deity catalog
//
// Everything here is a *reference* (YouTube id / external URL), never hosted
// media, and every media item must carry source + license so provenance is
// always recorded (legal safeguard — see CLAUDE.md "Darshan" notes).
// ---------------------------------------------------------------------------

// Extract the 11-char YouTube video id from whatever the admin pastes — a bare
// id or any common URL form (watch?v=, youtu.be/, /embed/, /shorts/, /live/,
// with or without extra query params). Returns the input untouched if nothing
// matches, so the refine below produces a clear error.
const YT_ID = /[A-Za-z0-9_-]{11}/;
export function extractYouTubeId(raw: string): string {
  const s = raw.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s; // already a bare id
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
    /\/live\/([A-Za-z0-9_-]{11})/, // /live/ID
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  // Last resort: if the string contains exactly one 11-char token, use it.
  const loose = s.match(YT_ID);
  return loose ? loose[0] : s;
}

// Accepts a YouTube link or a bare 11-char id; normalizes to the id. Still
// "embed only" — we store just the id and build the embed URL ourselves.
const youtubeIdSchema = z
  .string()
  .trim()
  .min(1, "YouTube link or video id is required")
  .transform(extractYouTubeId)
  .refine(
    (v) => /^[A-Za-z0-9_-]{11}$/.test(v),
    "Paste a valid YouTube link or 11-character video id"
  );

// External http(s) URL — used for scripture PDFs. We link, never rehost.
const externalUrlSchema = z
  .string()
  .trim()
  .url("Must be a valid http(s) URL")
  .regex(/^https?:\/\//i, "Must be an http(s) URL");

// Provenance fields. Optional for now (low-friction content entry); still
// recommended for the legal record, and surfaced in the admin link-health view
// and the scripture reader when present.
const provenanceFields = {
  source: z.string().trim().max(200).optional().default(""),
  license: z.string().trim().max(200).optional().default(""),
};

const localizedShort = (max = 120) =>
  z.string().trim().min(1).max(max);

export const AartiSchema = z
  .object({
    labelEn: localizedShort(),
    labelHi: localizedShort(),
    youtubeId: youtubeIdSchema,
    slot: z.enum(["morning", "sandhya", "other"]).default("other"),
    ...provenanceFields,
  })
  .strict();

export const BhajanSchema = z
  .object({
    labelEn: localizedShort(),
    labelHi: localizedShort(),
    youtubeId: youtubeIdSchema,
    ...provenanceFields,
  })
  .strict();

export const ScriptureSchema = z
  .object({
    titleEn: localizedShort(),
    titleHi: localizedShort(),
    lang: z.enum(["hi", "sa", "en"]).default("hi"),
    pdfUrl: externalUrlSchema,
    // Optional one-line summary shown on the scripture card.
    description: z.string().trim().max(160).optional(),
    ...provenanceFields,
  })
  .strict();

// A dedicated day for the deity. At least one trigger (weekday / tithi /
// festivalDates) must be present, else the rule can never match.
export const SpecialDaySchema = z
  .object({
    labelEn: localizedShort(),
    labelHi: localizedShort(),
    weekday: z.number().int().min(0).max(6).optional(), // 0=Sun .. 6=Sat
    tithi: z.string().trim().max(40).optional(),
    // Narrows a tithi rule to one fortnight (e.g. Krishna Chaturdashi =
    // Shivratri). Only meaningful together with `tithi`.
    paksha: z.enum(["shukla", "krishna"]).optional(),
    festivalDates: z
      .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"))
      .max(50)
      .optional(),
    note: z.string().trim().max(280).optional(), // English note
    noteHi: z.string().trim().max(280).optional(), // Hindi note
  })
  .strict()
  .refine(
    (d) =>
      d.weekday !== undefined ||
      (d.tithi && d.tithi.length > 0) ||
      (d.festivalDates && d.festivalDates.length > 0),
    { message: "A special day needs a weekday, tithi, or festival date" }
  );

// Defaults-free base so the update schema (.partial()) doesn't silently reset
// array fields to [] — same gotcha documented for variants/discounts.
const DeityFields = {
  key: slugSchema,
  active: z.boolean().optional().default(true),
  nameEn: z.string().trim().min(1).max(120),
  nameHi: z.string().trim().min(1).max(120),
  mantra: z.string().trim().min(1).max(200),
  transliteration: z.string().trim().max(200).optional(),
  jaikaraHi: z.string().trim().max(120).optional(),
  jaikaraEn: z.string().trim().max(120).optional(),
  aartis: z.array(AartiSchema).max(20).optional().default([]),
  bhajans: z.array(BhajanSchema).max(50).optional().default([]),
  scriptures: z.array(ScriptureSchema).max(30).optional().default([]),
  specialDays: z.array(SpecialDaySchema).max(50).optional().default([]),
  sortOrder: z.number().int().min(0).optional().default(0),
};

export const DeityCreateSchema = z.object(DeityFields).strict();

// Update: build off a defaults-free copy so a partial PUT (e.g. just
// { sortOrder }) never wipes aartis/scriptures back to [].
const DeityFieldsNoDefaults = {
  key: slugSchema,
  active: z.boolean(),
  nameEn: z.string().trim().min(1).max(120),
  nameHi: z.string().trim().min(1).max(120),
  mantra: z.string().trim().min(1).max(200),
  transliteration: z.string().trim().max(200).optional(),
  jaikaraHi: z.string().trim().max(120).optional(),
  jaikaraEn: z.string().trim().max(120).optional(),
  aartis: z.array(AartiSchema).max(20),
  bhajans: z.array(BhajanSchema).max(50),
  scriptures: z.array(ScriptureSchema).max(30),
  specialDays: z.array(SpecialDaySchema).max(50),
  sortOrder: z.number().int().min(0),
};

export const DeityUpdateSchema = z
  .object(DeityFieldsNoDefaults)
  .partial()
  .strict();

export type DeityCreateInput = z.infer<typeof DeityCreateSchema>;
export type DeityUpdateInput = z.infer<typeof DeityUpdateSchema>;
export type Aarti = z.infer<typeof AartiSchema>;
export type Bhajan = z.infer<typeof BhajanSchema>;
export type Scripture = z.infer<typeof ScriptureSchema>;
export type SpecialDay = z.infer<typeof SpecialDaySchema>;

// ---------------------------------------------------------------------------
// Public catalog: search + filter query
// ---------------------------------------------------------------------------

export const ProductSearchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    category: slugSchema.optional(),
    featured: z.enum(["true", "false"]).optional(),
    customizable: z.enum(["true", "false"]).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z
      .enum(["newest", "oldest", "priceAsc", "priceDesc", "featured"])
      .default("newest"),
    limit: z.coerce.number().int().min(1).max(60).default(24),
  })
  .strict();

// Update modelUrl is part of Product create/update. We extend the existing
// product schemas inline below by tweaking the import sites instead of
// redefining — see ProductCreateSchema.

// ---------------------------------------------------------------------------
// Variants & customization
// ---------------------------------------------------------------------------

// Free-form attribute bag (e.g. { size: "M", color: "Black", material: "PLA" }).
// We keep this permissive — the customer-facing UI groups by key, so what
// matters is consistent keys per product, not a fixed enum.
export const VariantAttributesSchema = z
  .record(z.string().min(1).max(40), z.union([z.string(), z.number(), z.boolean()]))
  .optional();

// Base shape without defaults. `.partial()` keeps `.default()` filling in
// missing keys on update, so we define the no-default version first and
// layer defaults on top only for create.
const ProductVariantFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80).optional(),
  priceModifier: z.number().finite(),
  stock: z.number().int().min(0),
  attributes: VariantAttributesSchema,
});

export const ProductVariantCreateSchema = ProductVariantFieldsSchema.extend({
  priceModifier: z.number().finite().default(0),
  stock: z.number().int().min(0).default(0),
}).strict();

export const ProductVariantUpdateSchema = ProductVariantFieldsSchema.partial().strict();

// Customization payload as it appears on a cart/order item. Keys are free-form
// but values are scalar so they serialize cleanly into JSON columns.
export const CustomizationSchema = z
  .record(
    z.string().min(1).max(40),
    z.union([z.string().max(500), z.number(), z.boolean()])
  )
  .optional();

// ---------------------------------------------------------------------------
// Addresses & orders
// ---------------------------------------------------------------------------

export const AddressSchema = z
  .object({
    fullName: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    email: emailSchema.optional(),
    street: z.string().trim().min(1).max(300),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter a valid 6-digit Indian PIN code"),
    country: z.string().length(2).default("IN"),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const CartItemSchema = z
  .object({
    productId: z.number().int().positive(),
    variantId: z.number().int().positive().optional(),
    quantity: z.number().int().min(1).max(100),
    customization: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const paymentMethodValues = ["RAZORPAY", "WHATSAPP", "COD"] as const;

export const OrderCreateSchema = z
  .object({
    items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
    customerName: z.string().trim().min(1).max(100),
    customerEmail: emailSchema,
    customerPhone: phoneSchema,
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema.optional(),
    paymentMethod: z.enum(paymentMethodValues),
    discountCode: z.string().trim().min(1).max(40).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

const orderStatusValues = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "BY_MISTAKE",
] as const;

export const OrderUpdateSchema = z
  .object({
    status: z.enum(orderStatusValues).optional(),
    internalNotes: z.string().max(1000).optional(),
    paymentReference: z.string().max(200).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Reviews & discounts
// ---------------------------------------------------------------------------

export const ReviewSchema = z
  .object({
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(200).optional(),
    comment: z.string().max(2000).optional(),
  })
  .strict();

// Guest review submission: identity is the customer email, which we check
// against the order history server-side.
export const GuestReviewCreateSchema = z
  .object({
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    customerEmail: emailSchema,
    customerName: z.string().trim().min(1).max(80),
    title: z.string().trim().max(200).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .strict();

export const ReviewModerationSchema = z
  .object({
    approved: z.boolean().optional(),
    title: z.string().trim().max(200).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .strict();

const discountTypeValues = ["PERCENTAGE", "FIXED"] as const;

// Base shape — exposed without defaults / refine so update schemas can build
// on it. PercentageRefine() applies the "≤ 100% off" rule.
const DiscountCodeFields = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Code may only contain uppercase letters, numbers, _ and -"),
  description: z.string().max(500).optional(),
  type: z.enum(discountTypeValues),
  value: z.number().positive(),
  minOrderValue: z.number().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  active: z.boolean().optional(),
});

function percentageRefine<S extends z.ZodTypeAny>(schema: S) {
  return schema.refine(
    (v: { type?: string; value?: number }) =>
      v.type !== "PERCENTAGE" || (v.value ?? 0) <= 100,
    { path: ["value"], message: "Percentage discount cannot exceed 100" }
  );
}

export const DiscountCodeSchema = percentageRefine(
  DiscountCodeFields.extend({
    active: z.boolean().optional().default(true),
  }).strict()
);

export const DiscountCodeUpdateSchema = percentageRefine(
  DiscountCodeFields.partial().strict()
);

// ---------------------------------------------------------------------------
// Admin: filters, inventory, settings
// ---------------------------------------------------------------------------

export const AdminProductListQuerySchema = z
  .object({
    category: slugSchema.optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const OrderListQuerySchema = z
  .object({
    status: z.enum(orderStatusValues).optional(),
    paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
    paymentMethod: z.enum(paymentMethodValues).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(20),
    format: z.enum(["json", "csv"]).default("json"),
  })
  .strict();

export const InventoryBatchSchema = z
  .object({
    products: z
      .array(
        z.object({
          id: z.number().int().positive(),
          stock: z.number().int().min(0).optional(),
          lowStockThreshold: z.number().int().min(0).optional(),
          stockStatus: z.enum(["in-stock", "low-stock", "out-of-stock"]).optional(),
        })
      )
      .optional(),
    variants: z
      .array(
        z.object({
          id: z.number().int().positive(),
          stock: z.number().int().min(0),
        })
      )
      .optional(),
  })
  .strict()
  .refine(
    (v) => (v.products && v.products.length > 0) || (v.variants && v.variants.length > 0),
    "Provide at least one product or variant to update"
  );

// Free-form settings value. Each `key` corresponds to one section of the
// admin settings page (company, shipping, tax, whatsapp, seo, …).
export const SettingsUpsertSchema = z
  .object({
    key: z.string().trim().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/i, "Use letters/digits/_"),
    value: z.unknown(),
  })
  .strict();

export const AnalyticsQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    granularity: z.enum(["day", "week", "month"]).default("day"),
  })
  .strict();

// ---------------------------------------------------------------------------
// Support / raise a concern
// ---------------------------------------------------------------------------

export const SUPPORT_CATEGORIES = [
  "order",
  "product",
  "custom",
  "shipping",
  "payment",
  "other",
] as const;

export const SupportConcernSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter your name").max(120),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    category: z.enum(SUPPORT_CATEGORIES),
    orderNumber: z
      .string()
      .trim()
      .max(40)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    message: z
      .string()
      .trim()
      .min(10, "Please add a few more details (at least 10 characters)")
      .max(4000),
  })
  .strict();

export type SupportConcernInput = z.infer<typeof SupportConcernSchema>;

export const SUPPORT_STATUSES = [
  "new",
  "in-progress",
  "resolved",
  "closed",
] as const;

export const SupportStatusUpdateSchema = z
  .object({ status: z.enum(SUPPORT_STATUSES) })
  .strict();

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type LoginInput = z.infer<typeof LoginSchema>;
export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type CartItemInput = z.infer<typeof CartItemSchema>;
export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type OrderUpdateInput = z.infer<typeof OrderUpdateSchema>;
export type ReviewInput = z.infer<typeof ReviewSchema>;
export type DiscountCodeInput = z.infer<typeof DiscountCodeSchema>;
