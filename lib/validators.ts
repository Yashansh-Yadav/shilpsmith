import { z } from "zod";

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
    description: z.string().trim().min(1).max(5000),
    price: priceSchema,
    discountPrice: priceSchema.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    image: z.string().url("Image must be a URL"),
    modelUrl: z
      .string()
      .url("Model URL must be a URL")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    featured: z.boolean().optional().default(false),
    customizable: z.boolean().optional().default(false),
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
