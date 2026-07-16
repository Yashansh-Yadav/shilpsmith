// lib/discounts.ts
//
// Single source of truth for how money comes off an order.
//
// Two things live here and nowhere else:
//
//  1. effectivePrice() — a product's real selling price. `discountPrice` is a
//     per-product sale price; when set and lower than `price`, it IS the price.
//     Before this module existed, ProductCard showed discountPrice while the
//     cart and /api/orders both charged full `price` — the storefront
//     advertised a discount that was never honoured. Every surface must go
//     through this function so that can't happen again.
//
//  2. resolveBestDiscount() — which discount applies. Automatic (event)
//     discounts and typed codes are the same kind of thing; the only
//     difference is whether the customer had to type something. They do NOT
//     stack: the single best one wins. Stacking a product sale price + an event
//     sale + a code compounds into margin you didn't agree to give away.
//
// Pure and dependency-free (no Prisma, no React) so the client can preview the
// same numbers the server will enforce. The server is still authoritative —
// /api/orders recomputes all of this from the database and never trusts a
// client-sent price.

export type DiscountType = "PERCENTAGE" | "FIXED";
export type DiscountScope = "ALL" | "CATEGORY" | "PRODUCT";

/** The shape of a discount, whether it came from the DB or an API payload. */
export interface DiscountRule {
  id: number;
  /** null = automatic (no code to type). */
  code: string | null;
  name: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  categoryId: number | null;
  /** Product ids for PRODUCT scope. Empty for other scopes. */
  productIds: number[];
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | string | null;
  expiresAt: Date | string | null;
  active: boolean;
}

/** One priced line in the cart/order, already resolved to its unit price. */
export interface DiscountLine {
  productId: number;
  categoryId: number | null;
  unitPrice: number;
  quantity: number;
}

export interface AppliedDiscount {
  id: number;
  code: string | null;
  name: string;
  /** Rupees off the order. Always ≥ 0 and never more than the eligible subtotal. */
  amount: number;
  /** True when it applied on its own, with nothing typed. */
  automatic: boolean;
}

/** Why a customer-typed code was refused. Automatic discounts just don't apply. */
export type DiscountRejection =
  | "not-found"
  | "inactive"
  | "not-started"
  | "expired"
  | "used-up"
  | "min-order-value"
  | "no-eligible-items";

export function isRejection(v: unknown): v is DiscountRejection {
  return (
    typeof v === "string" &&
    [
      "not-found",
      "inactive",
      "not-started",
      "expired",
      "used-up",
      "min-order-value",
      "no-eligible-items",
    ].includes(v)
  );
}

export function rejectionMessage(r: DiscountRejection, minOrderValue?: number | null): string {
  switch (r) {
    case "not-found":
      return "That code isn't recognised.";
    case "inactive":
      return "That code is no longer active.";
    case "not-started":
      return "That code isn't active yet.";
    case "expired":
      return "That code has expired.";
    case "used-up":
      return "That code has reached its usage limit.";
    case "min-order-value":
      return minOrderValue != null
        ? `Spend ₹${minOrderValue.toLocaleString("en-IN")} to use this code.`
        : "Your order doesn't meet this code's minimum.";
    case "no-eligible-items":
      return "That code doesn't apply to anything in your cart.";
  }
}

/** Parse the legacy `price: String` column ("₹999", "999") to a number. */
export function parsePriceString(raw: string | null | undefined): number {
  if (!raw) return NaN;
  const n = Number(String(raw).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * A product's real selling price: the sale price when it's set and genuinely
 * lower, otherwise the list price. Returns 0 for unparseable data so one bad
 * row can't crash a cart (matching the existing priceFromProduct behaviour).
 */
export function effectivePrice(product: {
  price: string;
  discountPrice?: string | null;
}): number {
  const base = parsePriceString(product.price);
  if (!Number.isFinite(base) || base <= 0) return 0;

  const sale = parsePriceString(product.discountPrice);
  // A sale price at or above list is a data error, not a discount — ignore it
  // rather than "discounting" the customer upward.
  if (Number.isFinite(sale) && sale > 0 && sale < base) return sale;
  return base;
}

/** List price, for showing a struck-through "was" figure. Null when not on sale. */
export function listPriceIfDiscounted(product: {
  price: string;
  discountPrice?: string | null;
}): number | null {
  const base = parsePriceString(product.price);
  const eff = effectivePrice(product);
  return Number.isFinite(base) && eff < base ? base : null;
}

/**
 * The best AUTOMATIC discount that can be advertised on a product card as a
 * definite percentage off, right now.
 *
 * A card shows one product with no cart context, so it can only honestly
 * advertise a discount that is unconditional: automatic (no code to type),
 * percentage (a fixed ₹-off an order doesn't map to a per-item price), with no
 * minimum-order requirement (that depends on the whole cart), and currently
 * inside its active window and scope. Everything else still applies at
 * checkout — it just can't be promised on the card.
 */
export function cardAutoPercent(
  product: { id: number; categoryId?: number | null },
  rules: DiscountRule[],
  now: Date = new Date()
): number {
  let best = 0;
  for (const r of rules) {
    if (r.code != null) continue; // automatic only
    if (!r.active) continue;
    if (r.type !== "PERCENTAGE") continue;
    if (r.minOrderValue != null) continue; // conditional on cart total
    const s = toDate(r.startsAt);
    if (s && s > now) continue;
    const e = toDate(r.expiresAt);
    if (e && e <= now) continue;
    if (r.scope === "CATEGORY" && r.categoryId !== (product.categoryId ?? null)) continue;
    if (r.scope === "PRODUCT" && !r.productIds.includes(product.id)) continue;
    if (r.value > best) best = r.value;
  }
  return Math.min(best, 100);
}

export interface CardDisplay {
  /** Final price to show. */
  price: number;
  /** Struck-through original, or null when nothing's discounted. */
  listPrice: number | null;
  /** Whole-number percent off, for the badge. 0 when not discounted. */
  percentOff: number;
}

/**
 * What a product card should display: the product's own sale price
 * (discountPrice) combined with any advertisable automatic event discount —
 * the same order checkout applies them (sale price first, event % on top). The
 * server attaches `eventDiscountPercent`; the card just renders this.
 */
export function cardDisplay(product: {
  price: string;
  discountPrice?: string | null;
  eventDiscountPercent?: number | null;
}): CardDisplay {
  const list = parsePriceString(product.price);
<<<<<<< HEAD
  const sale = effectivePrice(product); // includes discountPrice
  const evPct = product.eventDiscountPercent ?? 0;
  // Whole rupees — Indian retail doesn't price in paise, and a 10%-off ₹599
  // should read ₹539, not ₹539.1.
  const final = evPct > 0 ? Math.round(sale * (1 - evPct / 100)) : sale;
=======
  const sale = effectivePrice(product); // the product's own sale price, or list
  const evPct = product.eventDiscountPercent ?? 0;
  // The sale price and the event discount COMPETE — show whichever is cheaper,
  // never both stacked. Event is computed off the LIST price so the comparison
  // is fair. Whole rupees (Indian retail doesn't price in paise).
  const eventPrice = evPct > 0 ? Math.round(list * (1 - evPct / 100)) : list;
  const final = Math.min(sale, eventPrice);
>>>>>>> 834743cf2044314ba2a270e448fcd08275b69741

  const hasList = Number.isFinite(list) && list > 0 && final < list;
  return {
    price: final > 0 ? final : sale,
    listPrice: hasList ? list : null,
    percentOff: hasList ? Math.round(((list - final) / list) * 100) : 0,
  };
}

function toDate(v: Date | string | null): Date | null {
  if (v == null) return null;
  return v instanceof Date ? v : new Date(v);
}

/** Lines a discount covers, given its scope. */
function eligibleLines(rule: DiscountRule, lines: DiscountLine[]): DiscountLine[] {
  switch (rule.scope) {
    case "ALL":
      return lines;
    case "CATEGORY":
      return rule.categoryId == null
        ? []
        : lines.filter((l) => l.categoryId === rule.categoryId);
    case "PRODUCT": {
      const ids = new Set(rule.productIds);
      return lines.filter((l) => ids.has(l.productId));
    }
  }
}

function sumLines(lines: DiscountLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

/**
 * Check one rule against a cart. Returns the money off, or why it doesn't apply.
 *
 * `orderSubtotal` is the whole cart (what minOrderValue is measured against);
 * the discount itself only ever comes off the *eligible* lines, so "20% off
 * Spiritual" can't discount a nameplate.
 */
export function evaluateDiscount(
  rule: DiscountRule,
  lines: DiscountLine[],
  orderSubtotal: number,
  now: Date = new Date()
): AppliedDiscount | DiscountRejection {
  if (!rule.active) return "inactive";

  const startsAt = toDate(rule.startsAt);
  if (startsAt && startsAt > now) return "not-started";

  const expiresAt = toDate(rule.expiresAt);
  if (expiresAt && expiresAt <= now) return "expired";

  if (rule.maxUses != null && rule.usedCount >= rule.maxUses) return "used-up";

  if (rule.minOrderValue != null && orderSubtotal < rule.minOrderValue) {
    return "min-order-value";
  }

  const eligible = eligibleLines(rule, lines);
  const eligibleSubtotal = sumLines(eligible);
  if (eligibleSubtotal <= 0) return "no-eligible-items";

  const raw =
    rule.type === "PERCENTAGE"
      ? (eligibleSubtotal * rule.value) / 100
      : rule.value;

  // Never discount below zero on the covered items, and never hand back more
  // than those items are worth. Round to a whole rupee so the order total the
  // customer is charged has no paise.
  const amount = Math.round(Math.max(0, Math.min(raw, eligibleSubtotal)));
  if (amount <= 0) return "no-eligible-items";

  return {
    id: rule.id,
    code: rule.code,
    name: rule.name,
    amount,
    automatic: rule.code == null,
  };
}

export interface ResolveResult {
  /** The winning discount, or null if nothing applies. */
  best: AppliedDiscount | null;
  /** Every automatic discount that would have applied, best-first. */
  candidates: AppliedDiscount[];
  /**
   * Set only when the customer typed a code AND it was refused. Automatic
   * discounts never produce this — the customer didn't ask for them.
   */
  codeRejection: DiscountRejection | null;
  /** The typed code's outcome, when it applied but lost to a better one. */
  codeBeaten: boolean;
}

/**
 * Pick the single best discount for a cart.
 *
 * `rules` should be every candidate: all active automatic discounts, plus the
 * typed code's rule if there is one. A typed code that's invalid is reported
 * via `codeRejection` so the UI can explain itself — but it never blocks an
 * automatic discount from applying.
 */
export function resolveBestDiscount(
  rules: DiscountRule[],
  lines: DiscountLine[],
  opts: { typedCode?: string | null; now?: Date } = {}
): ResolveResult {
  const now = opts.now ?? new Date();
  const typed = opts.typedCode?.trim().toUpperCase() || null;
  const orderSubtotal = sumLines(lines);

  let codeRejection: DiscountRejection | null = null;
  const applied: AppliedDiscount[] = [];

  for (const rule of rules) {
    const isTyped = rule.code != null && rule.code.toUpperCase() === typed;

    // Skip codes the customer didn't type — a code shouldn't apply itself.
    if (rule.code != null && !isTyped) continue;

    const result = evaluateDiscount(rule, lines, orderSubtotal, now);

    if (isRejection(result)) {
      // Only surface failures for something the customer actually asked for.
      if (isTyped) codeRejection = result;
      continue;
    }
    applied.push(result);
  }

  // The customer typed something and no rule matched it at all.
  if (typed && !codeRejection && !applied.some((a) => a.code?.toUpperCase() === typed)) {
    codeRejection = "not-found";
  }

  // Best = biggest saving. Ties go to the automatic one, so a customer never
  // has to type a code to get a discount they'd have had anyway.
  applied.sort((a, b) => b.amount - a.amount || Number(b.automatic) - Number(a.automatic));

  const best = applied[0] ?? null;
  const codeBeaten =
    !!typed && !codeRejection && best != null && best.code?.toUpperCase() !== typed;

  return { best, candidates: applied, codeRejection, codeBeaten };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}