import {
  effectivePrice,
  listPriceIfDiscounted,
<<<<<<< HEAD
=======
  cardDisplay,
>>>>>>> 834743cf2044314ba2a270e448fcd08275b69741
  resolveBestDiscount,
  evaluateDiscount,
  type DiscountRule,
  type DiscountLine,
} from "./discounts";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
}

const rule = (over: Partial<DiscountRule>): DiscountRule => ({
  id: 1, code: null, name: "Test", type: "PERCENTAGE", value: 10,
  scope: "ALL", categoryId: null, productIds: [],
  minOrderValue: null, maxUses: null, usedCount: 0,
  startsAt: null, expiresAt: null, active: true,
  ...over,
});

const line = (over: Partial<DiscountLine>): DiscountLine => ({
  productId: 1, categoryId: 10, unitPrice: 1000, quantity: 1, ...over,
});

console.log("--- effectivePrice: the bug that started this ---");
check("sale price wins", effectivePrice({ price: "1000", discountPrice: "800" }), 800);
check("no sale price -> list", effectivePrice({ price: "1000", discountPrice: null }), 1000);
check("empty sale price -> list", effectivePrice({ price: "1000", discountPrice: "" }), 1000);
check("sale ABOVE list ignored", effectivePrice({ price: "1000", discountPrice: "1200" }), 1000);
check("sale EQUAL to list ignored", effectivePrice({ price: "1000", discountPrice: "1000" }), 1000);
check("rupee symbols parsed", effectivePrice({ price: "₹1,000", discountPrice: "₹800" }), 800);
check("garbage price -> 0 (no crash)", effectivePrice({ price: "abc" }), 0);
check("garbage sale -> list", effectivePrice({ price: "1000", discountPrice: "abc" }), 1000);
check("negative sale ignored", effectivePrice({ price: "1000", discountPrice: "-50" }), 1000);
check("listPrice shown when on sale", listPriceIfDiscounted({ price: "1000", discountPrice: "800" }), 1000);
check("listPrice null when not on sale", listPriceIfDiscounted({ price: "1000" }), null);

console.log("\n--- scope ---");
const lines = [
  line({ productId: 1, categoryId: 10, unitPrice: 1000 }), // spiritual
  line({ productId: 2, categoryId: 20, unitPrice: 500 }),  // nameplate
];
check(
  "ALL scope covers everything (10% of 1500)",
  (evaluateDiscount(rule({ scope: "ALL", value: 10 }), lines, 1500) as any).amount,
  150
);
check(
  "CATEGORY scope only covers that category (10% of 1000)",
  (evaluateDiscount(rule({ scope: "CATEGORY", categoryId: 10, value: 10 }), lines, 1500) as any).amount,
  100
);
check(
  "PRODUCT scope only covers listed products (10% of 500)",
  (evaluateDiscount(rule({ scope: "PRODUCT", productIds: [2], value: 10 }), lines, 1500) as any).amount,
  50
);
check(
  "CATEGORY with no match -> no-eligible-items",
  evaluateDiscount(rule({ scope: "CATEGORY", categoryId: 99 }), lines, 1500),
  "no-eligible-items"
);

console.log("\n--- window / limits ---");
const now = new Date("2026-07-16T12:00:00Z");
check("not started", evaluateDiscount(rule({ startsAt: "2026-08-01" }), lines, 1500, now), "not-started");
check("expired", evaluateDiscount(rule({ expiresAt: "2026-07-01" }), lines, 1500, now), "expired");
check("inactive", evaluateDiscount(rule({ active: false }), lines, 1500, now), "inactive");
check("used up", evaluateDiscount(rule({ maxUses: 5, usedCount: 5 }), lines, 1500, now), "used-up");
check("under min order", evaluateDiscount(rule({ minOrderValue: 2000 }), lines, 1500, now), "min-order-value");
check(
  "min order measured on WHOLE cart, not eligible subset",
  (evaluateDiscount(rule({ scope: "CATEGORY", categoryId: 10, minOrderValue: 1200 }), lines, 1500, now) as any).amount,
  100
);

console.log("\n--- FIXED discounts cannot overshoot ---");
check(
  "fixed 2000 off a 1500 cart caps at 1500",
  (evaluateDiscount(rule({ type: "FIXED", value: 2000 }), lines, 1500) as any).amount,
  1500
);
check(
  "fixed 800 off a category worth 1000 stays 800",
  (evaluateDiscount(rule({ type: "FIXED", value: 800, scope: "CATEGORY", categoryId: 10 }), lines, 1500) as any).amount,
  800
);
check(
  "fixed 900 off a category worth 500 caps at 500",
  (evaluateDiscount(rule({ type: "FIXED", value: 900, scope: "PRODUCT", productIds: [2] }), lines, 1500) as any).amount,
  500
);
check(
  "100% off caps at eligible subtotal",
  (evaluateDiscount(rule({ type: "PERCENTAGE", value: 100 }), lines, 1500) as any).amount,
  1500
);

console.log("\n--- best-wins resolution (the core rule) ---");
const diwali = rule({ id: 1, code: null, name: "Diwali Sale", value: 15 });      // 225 off 1500
const festo = rule({ id: 2, code: "3DFESTO", name: "Festival Code", value: 10 }); // 150 off 1500

let r = resolveBestDiscount([diwali, festo], lines, { typedCode: "3DFESTO" });
check("event beats weaker code", r.best?.name, "Diwali Sale");
check("  amount is event's, not summed", r.best?.amount, 225);
check("  code reported as beaten", r.codeBeaten, true);
check("  no bogus rejection", r.codeRejection, null);

const bigCode = rule({ id: 2, code: "3DFESTO", name: "Festival Code", value: 30 }); // 450
r = resolveBestDiscount([diwali, bigCode], lines, { typedCode: "3DFESTO" });
check("stronger code beats event", r.best?.name, "Festival Code");
check("  amount is code's", r.best?.amount, 450);
check("  not beaten", r.codeBeaten, false);

r = resolveBestDiscount([diwali, festo], lines, {});
check("no code typed -> event still applies automatically", r.best?.name, "Diwali Sale");
check("  automatic flag set", r.best?.automatic, true);

r = resolveBestDiscount([festo], lines, {});
check("code NOT typed -> does not self-apply", r.best, null);

r = resolveBestDiscount([diwali, festo], lines, { typedCode: "NONSENSE" });
check("bad code -> rejected", r.codeRejection, "not-found");
check("  but event STILL applies", r.best?.name, "Diwali Sale");

r = resolveBestDiscount([diwali, rule({ id: 2, code: "OLD", expiresAt: "2026-01-01", value: 50 })], lines, {
  typedCode: "OLD", now,
});
check("expired code -> rejection surfaced", r.codeRejection, "expired");
check("  event still applies", r.best?.name, "Diwali Sale");

r = resolveBestDiscount([], lines, {});
check("no rules -> nothing", r.best, null);

const tieA = rule({ id: 1, code: null, name: "Auto", value: 10 });
const tieB = rule({ id: 2, code: "TIE", name: "Typed", value: 10 });
r = resolveBestDiscount([tieA, tieB], lines, { typedCode: "TIE" });
check("tie -> automatic wins (customer needn't type)", r.best?.name, "Auto");

<<<<<<< HEAD
console.log("\n--- discountPrice + event stack correctly (sale price first) ---");
// Product on sale 1000 -> 800, then a 15% event on the SALE price.
const salePriceLines = [line({ productId: 1, categoryId: 10, unitPrice: effectivePrice({ price: "1000", discountPrice: "800" }) })];
r = resolveBestDiscount([rule({ value: 15, name: "Diwali" })], salePriceLines, {});
check("event applies to the 800 sale price, not 1000", r.best?.amount, 120);
=======
console.log("\n--- sale price vs event: single best wins, never both ---");
// A product's own sale price and an event discount COMPETE (best single wins).
// Product list ₹1000, sale price ₹800.
//  - 10% event off list = ₹900 → sale (₹800) wins → pay ₹800, NOT ₹720.
check("sale ₹800 beats 10% event", cardDisplay({ price: "1000", discountPrice: "800", eventDiscountPercent: 10 }).price, 800);
//  - 25% event off list = ₹750 → event wins → pay ₹750.
check("25% event beats ₹800 sale", cardDisplay({ price: "1000", discountPrice: "800", eventDiscountPercent: 25 }).price, 750);
//  - never the stacked ₹720.
check("never stacks (not 720)", cardDisplay({ price: "1000", discountPrice: "800", eventDiscountPercent: 10 }).price !== 720, true);
>>>>>>> 834743cf2044314ba2a270e448fcd08275b69741

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);