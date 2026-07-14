# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server (defaults to :3000; falls back to :3001 if busy)
- `npm run build` — production build (runs `prisma generate` via `postinstall`)
- `npm run start` — serve the production build
- `npm run lint` — `next lint`
- `npm run prisma:seed` *(direct)* — `node_modules/.bin/tsx.cmd prisma/seed.ts` upserts the demo admin + categories
- `node node_modules/prisma/build/index.js migrate deploy` — apply pending migrations (see "Database" below for why `npx prisma migrate dev` doesn't work here)
- `node node_modules/prisma/build/index.js db execute --file <path> --schema prisma/schema.prisma` — run raw SQL through the Prisma engine

No test runner is configured.

### Demo admin

After running the seed: `admin@shilpsmith.com` / `demo` → role `SUPER_ADMIN`. Sign in at `/admin-login`.

## Architecture

Next.js 15 App Router + TypeScript + Tailwind. Backed by **Prisma + PostgreSQL (Neon)**, **NextAuth (JWT)** for admin auth, and **Vercel Blob** for image storage.

### Request flow

All API routes use the same wrapper from [lib/apiResponse.ts](lib/apiResponse.ts):

```
handle(async (req, ctx) => {
  const input = await parseJson(req, SomeZodSchema);
  // ...prisma work...
  return ok(data);    // or created(data) / fail(err)
});
```

`handle()` turns thrown errors into a consistent JSON envelope:

- `ApiError` subclasses (`ValidationError`, `NotFoundError`, `ConflictError`, …) → mapped status + structured body
- `ZodError` → 400 with `details: [{ field, message }]`
- Prisma `P2002` → 409, `P2025` → 404, `P2003` → 400
- Anything else → 500 (logged via `lib/logger.ts`)

Success envelope: `{ success: true, data, message? }`. Error envelope: `{ success: false, error: { code, message, details? } }`. All client code (admin page, `ProductGrid`) reads `body.data`, not the body directly.

### Auth

[lib/auth.ts](lib/auth.ts) configures NextAuth Credentials provider, JWT sessions (8h), and a dummy bcrypt compare when the admin is missing (mitigates user-enumeration timing). The route handler is at [app/api/auth/[...nextauth]/route.ts](app/api/auth/%5B...nextauth%5D/route.ts).

**Important:** `CredentialsSchema` in `lib/auth.ts` is NOT `.strict()` — NextAuth merges `csrfToken` / `callbackUrl` / `json` into the credentials object, so a strict schema would reject every login. The strict schema is `LoginSchema` in [lib/validators.ts](lib/validators.ts), used by other consumers.

Session augmentation lives in [types/next-auth.d.ts](types/next-auth.d.ts) — `session.user.id` and `session.user.role` are app-defined extensions.

[middleware.ts](middleware.ts) protects `/admin/*` (redirects to `/admin-login?callbackUrl=…`) and `/api/admin/*` (returns 401 JSON). `/api/auth/*` is always allowed through.

### Validation

All input goes through Zod schemas in [lib/validators.ts](lib/validators.ts). Helpers:

- `parseJson(req, schema)` — body validation; throws `ValidationError` on non-JSON, `ZodError` on schema failure
- `parseQuery(req, schema)` — query string validation
- `rateLimit(req, { windowMs, max, namespace })` — in-memory sliding window. Single-instance only; swap for Redis/Upstash before going multi-instance.

`Product.price` is stored as `String` (legacy schema constraint with existing data). The `priceSchema` validator accepts `"999"` or `"₹999"` and enforces positive numbers with ≤2 decimals at the boundary.

### Database

`schema.prisma` has been extended for full e-commerce:

- **Catalog**: `Category`, `Product` (+`stock`, `lowStockThreshold`, `deletedAt` for soft delete), `ProductImage`, `ProductVariant`
- **Customers/orders**: `User`, `Address`, `Cart`, `CartItem`, `Order`, `OrderItem` (with `OrderStatus`, `PaymentStatus`, `PaymentMethod` enums)
- **Misc**: `Review`, `WishlistItem`, `DiscountCode` (with `DiscountType`), `Settings` (key/value), `Session` (reserved for future DB-session strategy), `Lead`, `HomepageSection`
- `Admin.role` is `AdminRole` enum (`SUPER_ADMIN | ADMIN | STAFF`)

Soft delete: `Product.deletedAt` is set instead of dropping the row, so historical `OrderItem.productId` references survive. Public/admin list queries filter `where: { deletedAt: null }`.

**Migration gotcha:** Neon's pooler URL (`*-pooler.*`) breaks Prisma's `migrate dev` (the migrate engine can't create a shadow DB). The workflow that works against this DB:

1. `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_<name>/migration.sql`
2. Patch any `ADD COLUMN ... NOT NULL` (no default) → add `DEFAULT CURRENT_TIMESTAMP` so it survives non-empty tables
3. `prisma db execute --file <that file> --schema prisma/schema.prisma`
4. Insert a row into `_prisma_migrations` via another `db execute` (checksum = sha256 of the file)

`prisma migrate deploy` *should* work but has been flaky against this Neon endpoint mid-session; `db execute` is the reliable path.

### Env vars

- `DATABASE_URL` — Postgres (Neon pooler)
- `NEXTAUTH_SECRET` — required; the demo project has one generated locally
- `NEXTAUTH_URL` — set to `http://localhost:3000` in dev; Vercel sets this automatically in prod
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token used by `/api/upload`
- `LOG_LEVEL` — optional override for `lib/logger.ts` (default: `debug` in dev, `info` in prod)

The `.env` file in the repo root is gitignored, but **the gitignore file is `.gitIgnore` with a capital I** — case-sensitive Linux filesystems will not honor it. Rename to `.gitignore` before any Linux deploy.

### Layout pointers

- [app/(auth)/admin-login/page.tsx](app/%28auth%29/admin-login/page.tsx) — client-only sign-in form; `useSearchParams` is wrapped in `<Suspense>` (Next 15 requirement)
- [app/admin/page.tsx](app/admin/page.tsx) — single-page admin CRUD; unwraps `body.data`, shows field-level validation errors via toasts, includes Sign Out button
- [app/admin/products/page.tsx](app/admin/products/page.tsx) — still a placeholder ("Product table will come here"). Real admin UI lives at `/admin`.
- [lib/db.ts](lib/db.ts) — fully commented-out SQLite legacy; ignore
- [database.sqlite](database.sqlite) — leftover from pre-Postgres days; safe to delete

### Known good defaults / patterns

- Slugs: `generateSlug()` in `lib/validators.ts` (single source — was previously duplicated across two routes)
- Image upload: 5 MB cap, restricted to png/jpeg/webp/gif, uses Vercel Blob with `addRandomSuffix: true`
- Product images: replacing the URL on PUT deletes all existing `ProductImage` rows and creates one new — matches the admin form's single-image UX

## Phase 2 — e-commerce essentials

### Cart (client-only, anonymous)

- [lib/store/cart.ts](lib/store/cart.ts) — Zustand `useCartStore` persisted to localStorage; `BroadcastChannel('shilpsmith-cart-sync')` keeps multiple tabs in lockstep without storage-event timing issues. `computePricing()` is the single source for subtotal/shipping/tax/total math.
- Shipping rule (client + server): flat ₹50 under ₹1000, free at ₹1000+. Tax is currently 0 (hook in place for state-based GST later).
- `priceFromProduct(product)` converts the legacy `price: String` to a Number; bad price strings yield `0` so a malformed row can't crash the cart.
- [components/shop/CartSheet.tsx](components/shop/CartSheet.tsx) exports both `CartSheet` (slide-out aside, body-scroll lock + Escape close) and `CartButton` (nav badge). They are mounted in [app/page.tsx](app/page.tsx).
- [app/(shop)/cart/page.tsx](app/%28shop%29/cart/page.tsx) — full cart with quantity controls, customization summary, clear-cart.

### Checkout

- [app/(shop)/checkout/page.tsx](app/%28shop%29/checkout/page.tsx) — 3-step wizard (address → payment → review). Reuses [AddressForm](components/shop/AddressForm.tsx) and [OrderReview](components/shop/OrderReview.tsx). Surfaces per-field server errors from the 400 response.
- Three payment methods: `RAZORPAY`, `WHATSAPP`, `COD`. WhatsApp opens `wa.me` with a prefilled message after creation; Razorpay flow stays on the review step and renders `PaymentCheckout` (loads `checkout.razorpay.com/v1/checkout.js` lazily).

### Order creation — [app/api/orders/route.ts](app/api/orders/route.ts)

- Always re-validates against the live catalog: soft-deleted products → 400, out-of-stock → 409, qty > available → 409. **Never trusts client-supplied prices** — `unitPrice` and `subtotal` are computed from `Product.price`.
- Order number format: `ORD-YYYYMMDD-XXXXX` (5-digit random suffix; `orderNumber` is unique so collisions land in `handle()`'s P2002 path → 409 and the client retries).
- Wrapped in `prisma.$transaction` with `{ timeout: 20_000, maxWait: 5_000 }`. **Don't lower this** — Neon's pooler has ~500ms per roundtrip and the chain (2× address create + order create + N items + optional discount update) regularly takes 3-5s on cold connections.
- Rate-limited: 10 orders/min/IP (`namespace: "orders"`).
- Discount codes: validated and applied here; `usedCount` is incremented inside the same transaction.
- Confirmation email is fire-and-forget (`.catch` logs but never fails the order) — see "Email" below.

### Order confirmation — [app/(shop)/order/[id]/page.tsx](app/%28shop%29/order/%5Bid%5D/page.tsx)

Server component that reads Prisma directly (no public `GET /api/orders/[id]` exists). **Knowing the numeric id is currently sufficient to view an order** — fine for the immediate post-checkout redirect, but harden with a token-in-URL or email-magic-link before production.

### Email — [lib/email.ts](lib/email.ts)

Resend client is **lazily constructed** and tolerates missing `RESEND_API_KEY` (logs a warning and returns `{ sent: false }`). Order creation calls `sendOrderConfirmationEmail` in a fire-and-forget catch — the email is never on the order's critical path. Template at [lib/email/templates/orderConfirmation.ts](lib/email/templates/orderConfirmation.ts) is plain HTML (no React Email dependency).

Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (default `ShilpSmith <orders@shilpsmith.com>`), `ADMIN_EMAIL` (BCC for the admin).

### Razorpay — [lib/payment.ts](lib/payment.ts) + two routes

- `getRazorpay()` throws a clean `ApiError(500, INTERNAL_ERROR, "Razorpay is not configured…")` when keys are missing — checkout's PaymentCheckout component also gates on `NEXT_PUBLIC_RAZORPAY_KEY_ID` and refuses to load Razorpay if it's blank.
- [/api/payments/razorpay/create-order](app/api/payments/razorpay/create-order/route.ts): creates a Razorpay order, persists `razorpayOrderId` to `Order.paymentReference` (so verify can correlate). Rejects orders whose `paymentMethod !== RAZORPAY` (409) and orders already paid (409).
- [/api/payments/razorpay/verify](app/api/payments/razorpay/verify/route.ts): HMAC-SHA256 signature check with `crypto.timingSafeEqual`. **Idempotent** — re-posting a verified payment is a 200 no-op, not a duplicate. Side effect on first verify: `paymentStatus → COMPLETED`, `status → CONFIRMED`, confirmation email fired.

Env: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (server), `NEXT_PUBLIC_RAZORPAY_KEY_ID` (client). All three should be the **same key id** — the secret stays server-side.

### Middleware scope

[middleware.ts](middleware.ts) still only matches `/admin/:path*` and `/api/admin/:path*`. **`/api/orders` and `/api/payments/*` are intentionally public** — guest checkout has no user accounts yet. Add an `Order.guestToken` or session check before extending these.

## Phase 3 — variants + customization

### Variant CRUD

- Admin: `GET/POST /api/admin/products/[id]/variants`, `PUT/DELETE /api/admin/variants/[id]` — gated by the existing admin middleware.
- Public: `GET /api/products/[id]/variants` (optionally `?available=true` to filter `stock > 0`); plus the existing `GET /api/products` now returns `variants` inline.
- Admin UI: when editing a product on `/admin`, an inline [VariantsPanel](components/admin/VariantsPanel.tsx) appears below the form with an add-variant row + per-cell inline edit (debounced commit on blur). Hard delete — `OrderItem.variantId` is `SET NULL` on the FK so historical orders survive.

### Public UX

[components/shop/VariantSelector.tsx](components/shop/VariantSelector.tsx) renders the variants as a 2/3-column grid of toggle buttons with price modifier and per-variant stock badges (`Out of stock` / `Only N left` ≤5). [components/shop/CustomizationForm.tsx](components/shop/CustomizationForm.tsx) collects `text` (engraving), `color` (color picker + free text), and `notes`, and exposes a `customizationToRecord()` helper that strips empties before sending. [components/ProductModal.tsx](components/ProductModal.tsx) was rewritten to compose both: it shows base + modifier in the header price, blocks Add-to-Cart until a variant is selected if any exist, and falls back to lazily fetching variants if the product payload doesn't include them.

### Server pricing & stock

[/api/orders](app/api/orders/route.ts) was extended to:

- Resolve every referenced `variantId` in a single batch query alongside products.
- Cross-check `variant.productId === item.productId` (so a client can't bind a variant to a different product).
- Use `base + Number(variant.priceModifier)` as `unitPrice`, persisted on the OrderItem. `productName` is stored as `"Product (Variant)"` so admin/order pages display the full label even if the variant is later deleted.
- Enforce variant-level stock when `variant.stock > 0`.

### Zod gotcha worth remembering

In [lib/validators.ts](lib/validators.ts), `ProductVariantUpdateSchema` is built off a separate `ProductVariantFieldsSchema` **without** `.default(0)` on `priceModifier`/`stock`. The original `ProductVariantCreateSchema.partial()` looked correct but Zod's `.partial()` preserves `.default()` — meaning a PUT with `{ stock: 2 }` would silently reset `priceModifier` to `0`. Always build update schemas off a defaults-free base.

### Cart/checkout surfaces

[CartItem](lib/store/cart.ts) gained `variantName`. CartSheet, /cart, OrderReview, and the confirmation page all show "Product · Variant" when a variant is selected. The order confirmation page reads the stored `OrderItem.productName` directly, so it always reflects the full label at the time of purchase.

## Phase 4 — admin dashboard

### Layout & sidebar

[app/admin/layout.tsx](app/admin/layout.tsx) wraps every `/admin/*` page in a sticky [Sidebar](components/admin/Sidebar.tsx) (Products / Orders / Inventory / Analytics / Customers / Settings + Sign out). The original products CRUD stays at `/admin` (no rename). Sidebar uses `usePathname` for active-link highlight and a regex `match` so child routes still mark their parent active.

### Orders

- [/api/admin/orders](app/api/admin/orders/route.ts): list with `status` / `paymentStatus` / `paymentMethod` / `from` / `to` / `search` filters + pagination, plus `?format=csv` to stream a download (5000-row cap, custom `Content-Disposition`).
- [/api/admin/orders/[id]](app/api/admin/orders/[id]/route.ts): GET full detail, PUT to update status / internal notes / paymentReference, DELETE for soft-delete (sets `deletedAt`).
- UI: [list](app/admin/orders/page.tsx) with search/status filter/pagination/CSV button; [detail](app/admin/orders/[id]/page.tsx) with [OrderStatusTimeline](components/admin/OrderStatusTimeline.tsx), status dropdown, internal-notes textarea, and links into the customer page.

### Inventory

- [/api/admin/inventory](app/api/admin/inventory/route.ts): GET returns products with their variants; PUT accepts a `{ products?: [], variants?: [] }` batch wrapped in a single transaction. `InventoryBatchSchema` requires at least one of the two arrays.
- UI: [/admin/inventory](app/admin/inventory/page.tsx) tracks drafts in client state (no save until the user clicks "Save changes"), with `all / low-stock / out-of-stock` filter. Low-stock badge uses `stock <= lowStockThreshold` per product.

### Analytics

- [/api/admin/analytics](app/api/admin/analytics/route.ts): single endpoint returning KPIs (today / month / year revenue + order counts + AOV), a bucketed time-series, top 5 products by revenue, and payment-method breakdown. **Cancelled/refunded orders are excluded** from every number via a `COUNTED_STATUSES` filter — change that constant if the business rule changes.
- Granularity is `day` / `week` / `month` (client picks based on range length). All ranged stats use the `from..to` window; the 3 revenue KPIs use fixed `startOf today/month/year`.
- UI: [/admin/analytics](app/admin/analytics/page.tsx) shows 4 [MetricsCard](components/admin/MetricsCard.tsx)s + [SalesChart](components/admin/SalesChart.tsx) (recharts LineChart) + top products + payment breakdown, with 7d/30d/90d toggle.

### Customers

There is no `User` account creation flow yet, so customers are **derived from orders** via `groupBy('customerEmail')`. [/api/admin/customers](app/api/admin/customers/route.ts) returns one row per email with order count + total spent + last-order date; [/api/admin/customers/[email]](app/api/admin/customers/[email]/route.ts) returns the full order history. URLs use percent-encoded email as the path segment.

### Settings

[Settings](prisma/schema.prisma) is a key/value table; the admin UI ([/admin/settings](app/admin/settings/page.tsx)) defines 5 sections (`company`, `shipping`, `tax`, `whatsapp`, `seo`) that each map to one row with `value` as a JSON object. The settings API enforces a key regex `[a-z][a-z0-9_]*` so the path stays predictable.

**Important:** these settings are **persisted but not yet read** by the checkout / cart / order routes — shipping/tax/WhatsApp number are still hardcoded in [lib/store/cart.ts](lib/store/cart.ts), [/api/orders](app/api/orders/route.ts), and the `NEXT_PUBLIC_WHATSAPP_NUMBER` env. Wire them up before relying on the admin UI to change prices in production.

### Deliberately out of scope for Phase 4

The following were called for in the prompt but skipped to keep this phase shippable:

- **Low-stock email alerts** — would hang off `sendOrderConfirmationEmail`-style flow; gated on Resend keys.
- **Print labels / invoice PDFs** — requires a PDF renderer.
- **Razorpay refund button** — needs live Razorpay credentials and a tested rollback path.
- **Real-time order notifications** — would need polling, WebSockets, or Server-Sent Events.
- **Pre-calculated daily metrics** — current analytics endpoint computes everything live; cache once volume warrants it.
- **Bulk actions (multi-select mark-shipped, etc.)** — table is read + per-row only.

### Admin response shapes worth knowing

- **List endpoints** (`orders`, `customers`) return `{ items, page, pageSize, total, pages }` in `data` — admin pages already unwrap via `body.data.items`.
- **Decimal columns** (`total`, `subtotal`, `shipping`, `tax`, `discount`, `priceModifier`) arrive as **string-serialized decimals** over JSON. Always wrap in `Number(...)` before math.
- **CSV export** bypasses the `ok()` wrapper entirely — it's a raw `Response` with `Content-Type: text/csv` and a filename in `Content-Disposition`.

## Phase 5 — search, 3D, reviews, discounts

### Public search

[/api/products](app/api/products/route.ts) now accepts `q`, `category`, `featured`, `customizable`, `minPrice`, `maxPrice`, `sort` (`newest|oldest|priceAsc|priceDesc|featured`), `limit`. Search is **Postgres `contains` (insensitive)** on name + shortDescription + description — not Algolia/MeiliSearch. **Price filtering and price sort run in JS** after the query because `Product.price` is stored as `String` (legacy schema constraint). At current catalog sizes this is fine; if the catalog grows past a few thousand rows, migrate `price` to `Decimal` and push these into SQL.

The public [/search](app/search/page.tsx) page wraps it with a debounced search box, a filter sidebar (category / price range / customizable), and a sort dropdown. URL state is mirrored via `router.replace` so filtered links are shareable. Categories come from a new public [/api/categories](app/api/categories/route.ts) (the admin one is auth-gated).

The homepage navbar also gets a small search field that pushes to `/search?q=…`.

### 3D product preview

- New field `Product.modelUrl` (nullable). Migration in `prisma/migrations/*phase5_product_model_url`.
- [/api/upload](app/api/upload/route.ts) now accepts a `?kind=model` flag. Models go up to 25 MB; allowed extensions are `.glb` and `.gltf` (MIME-type sniffing is loose because browsers don't always set the right one).
- [components/shop/ThreeDViewer.tsx](components/shop/ThreeDViewer.tsx) uses `@react-three/fiber` + `@react-three/drei` (`useGLTF`, `OrbitControls`, `Stage`). It is **`dynamic()`-imported with `ssr:false` in ProductModal** so three.js (~500 kB) only loads when the user opens a product that actually has a model.
- Admin product form gets a "3D model" file input alongside the image input. The model URL is stored on the product via the existing product create/update routes.
- ProductModal shows a "View in 3D" toggle on the image when `modelUrl` is set.

### Reviews

**Schema change:** `Review.userId` is now nullable, and `customerEmail` / `customerName` columns were added so guest reviews can be keyed by email. The old `@@unique([userId, productId])` was replaced with `@@unique([customerEmail, productId])`. Migration in `prisma/migrations/*phase5_review_guests`.

- [POST /api/reviews](app/api/reviews/route.ts) — public; rate-limited to 5/min/IP. **Verified-buyer check**: the email must have at least one non-cancelled non-refunded order in `CONFIRMED / PROCESSING / SHIPPED / DELIVERED` containing the same productId. New reviews land with `approved: false`.
- [GET /api/reviews?productId=N](app/api/reviews/route.ts) — public; **only approved reviews** + summary stats (avg, count).
- [GET /api/admin/reviews](app/api/admin/reviews/route.ts) — admin moderation queue with `pending | approved | all` filter.
- [PUT/DELETE /api/admin/reviews/[id]](app/api/admin/reviews/%5Bid%5D/route.ts) — toggle approval, edit copy, or remove entirely.
- UI: [ReviewSection](components/shop/ReviewSection.tsx) is mounted inside ProductModal, shows avg + count + reviews list + a "Write a review" form. Admin moderation page at [/admin/reviews](app/admin/reviews/page.tsx).

The duplicate-review case is friendlier than the default Prisma P2002 → it returns a 409 with a clear message ("You've already submitted a review for this product").

### Discounts

The `DiscountCode` table + the checkout `discountCode` field were already wired in Phase 2. Phase 5 added the missing admin surface:

- [GET/POST /api/admin/discounts](app/api/admin/discounts/route.ts) + [PUT/DELETE /api/admin/discounts/[id]](app/api/admin/discounts/%5Bid%5D/route.ts).
- **Hard delete is blocked** if any order references the code — those are downgraded to `active: false` instead (FK from `Order.discountCodeId`). The DELETE response message tells the admin which path it took.
- [Discount admin page](app/admin/discounts/page.tsx) with table + create form + toggle Active.
- Checkout: the **review step** of [/checkout](app/(shop)/checkout/page.tsx) now has a "Discount code" input that's threaded through to the order POST. Server-side validation rules (active flag, dates, max uses, min order value) live in [/api/orders](app/api/orders/route.ts) and surface as a 400 with field-level message.

### Zod v4 refine gotcha

`DiscountCodeSchema.refine(...)` returns a `ZodEffects` in Zod v4 that **does not** expose `.innerType()` the way it did in v3. To support both create + update schemas without losing the "≤ 100%" cross-field check, factor out a defaults-free base schema and apply the refine via a small helper:

```ts
const DiscountCodeFields = z.object({ … });
function percentageRefine<S extends z.ZodTypeAny>(s: S) { return s.refine(…); }
export const DiscountCodeSchema = percentageRefine(DiscountCodeFields.extend({ active: z.boolean().optional().default(true) }).strict());
export const DiscountCodeUpdateSchema = percentageRefine(DiscountCodeFields.partial().strict());
```

Same pattern works for any future schema that combines `.default()`, `.partial()`, and `.refine()`.

### react-is / recharts gotcha

Installing `three` / `@react-three/fiber` / `@react-three/drei` with `--legacy-peer-deps` (required because of React 18 vs their React 19 peer) pruned the transitive `react-is` that recharts needs. Symptom: `/admin/analytics` prerender fails with `Cannot find module 'react-is'`. Fix: `npm install react-is --legacy-peer-deps` **and** `dynamic()`-import `SalesChart` with `ssr:false` so the prerender step doesn't try to render recharts on the server.

### Deliberately out of scope for Phase 5

- **Algolia / MeiliSearch** — Postgres `contains` is fast enough at this catalog size; the prompt's external search service is overkill until volume warrants it.
- **Search-suggest autocomplete** — the search input debounces and reruns the same `/api/products?q=…` query, which is good enough at our row count.
- **Helpful voting** on reviews — needs another table; skipped.
- **Review reply / report** — admin can edit/delete; no customer-side reply infrastructure.
- **Discount per-user limit enforcement** — `perUserLimit` is stored on `DiscountCode` but not checked at order time (we only check global `maxUses`); add this when user accounts ship.

## Phase 6 — storefront revamp

The public-facing storefront was rebuilt as a marketing-grade landing experience. This phase is almost entirely the **presentation layer** — no schema changes — but it adds one aggregation endpoint and a set of reusable presentational components under `components/shop/`.

### Homepage data — [/api/storefront](app/api/storefront/route.ts)

One endpoint feeds the entire homepage in a single roundtrip (`Promise.all`), returning `{ featured, newest, trending, categories, testimonials }`:

- `featured` — `featured: true` products; `newest` — most recent 12; both `deletedAt: null`.
- `trending` — `orderItem.groupBy(productId)` summed over the last 30 days, restricted to `CONFIRMED/PROCESSING/SHIPPED/DELIVERED` orders, then resolved back to full products **preserving group order**. **Falls back to `featured` (then `newest`)** when there's no order data yet, so a fresh catalog never shows an empty trending shelf.
- `testimonials` — 6 most-recent approved reviews with a non-empty `comment` or `title`.
- `export const revalidate = 60` (plus `dynamic = "force-dynamic"`) — cheap 1-minute cache so the homepage doesn't re-query Neon on every hit; admin edits surface within a minute. Keep new homepage data on this endpoint rather than adding per-section fetches.

### Homepage — [app/page.tsx](app/page.tsx)

Client component: fetches `/api/storefront` once, renders hero + `HowItWorks` + Featured/New/Categories/Trending sections + why-us + testimonials + custom-order CTA. Each carousel/shelf has a **loading skeleton** and an `EmptyShelf` fallback so the page looks intentional on an empty catalog. Product clicks open the shared [ProductModal](components/ProductModal.tsx); `CartSheet` and `Toaster` are mounted here. The WhatsApp CTAs read `NEXT_PUBLIC_WHATSAPP_NUMBER` and pre-fill `wa.me` messages.

### Presentational components (`components/shop/`)

These are pure/animation components with no data-fetching of their own — they take props from the homepage/search/category pages:

- `ProductCard` (exports the `StorefrontProduct` type used across the storefront), `ProductCarousel` (horizontal scroll-snap rail), `CategoryShelf`, `Testimonials`, `HowItWorks`, `SectionHeader`, `EmptyShelf`, `StarRating`, `ProductImage` (blob-URL-aware `next/image` wrapper with fallback), and `Reveal` (IntersectionObserver fade/scale-in wrapper — `variant` + `delay` props).

### Category landing — [app/categories/[slug]/page.tsx](app/categories/%5Bslug%5D/page.tsx)

Server component that renders a title from the slug and delegates to [ProductGrid](components/ProductGrid.tsx) with a `category` prop. The `categoryMap` is currently a hardcoded identity map of the four known slugs — extend it (or replace with a DB category lookup) when adding categories.

### Design tokens — [tailwind.config.ts](tailwind.config.ts)

The revamp leans on custom Tailwind tokens used pervasively across `components/shop/` and the homepage — reuse these instead of ad-hoc values: `brand`/`accent` color scales (brand is emerald), `shadow-lift` (card hover) / `shadow-cta` (primary buttons) / `shadow-glow`, `rounded-4xl` (2rem), and the `fade-in-up` / `shimmer` animations. Classes like `glass`, `text-brand-gradient`, `font-spec`, `bg-build-grid`, `bg-orb`, and `bg-layer-lines` are custom CSS (in `globals.css`), not Tailwind config — grep there before assuming a utility is missing.

## Phase 7 — admin notifications, dynamic customization, support, SEO

This phase added a multi-channel admin alerting layer, replaced the fixed customization form with an admin-configurable one, added a public support flow, and built out the SEO/compliance surface. Two schema additions (`Product.customFields`, `OrderStatus.BY_MISTAKE`); migrations `*_product_custom_fields` and `*_order_status_by_mistake`.

### Admin notifications — [lib/notify.ts](lib/notify.ts)

`notifyAdmin(n: AdminNotification)` is the single dispatcher: it fans one event (`type: "order" | "review" | "support"`) out to **email + WhatsApp + Telegram** via `Promise.allSettled`. Each channel **self-disables when its env isn't set** (logs a warning, returns `{ sent: false }`) and one channel failing never affects the others or the caller. Build a notification once with `{ title, lines, body?, path?, replyTo? }`; the dispatcher renders text/HTML/summary per channel.

- **Always call fire-and-forget with `.catch()`** from request handlers — same rule as the order-confirmation email; notifications must never block or fail the customer's action. Wired into [/api/orders](app/api/orders/route.ts), [/api/reviews](app/api/reviews/route.ts), and [/api/support](app/api/support/route.ts).
- Channels: [lib/telegram.ts](lib/telegram.ts) (Bot API — free, serverless-friendly, plain-text no `parse_mode`), [lib/whatsapp.ts](lib/whatsapp.ts) (Meta WhatsApp **Cloud API** — template mode for production / free-form text mode within the 24h window for testing), and `sendAdminEmail` in [lib/email.ts](lib/email.ts).
- The old `components/shop/WhatsAppOrderDialog.tsx` (client-side `wa.me` deep-link order flow) was **removed** in favor of this server-side notification model. Customer-facing `wa.me` CTAs (homepage, checkout) still exist via `whatsappLink()` in `lib/site.ts`.

### Dynamic per-product customization — [lib/customization.ts](lib/customization.ts)

Replaces the fixed `CustomizationForm` (engraving/color/notes) with an **admin-configurable** model. The admin doesn't author fields from scratch — they tick which of a fixed `CUSTOMIZATION_CATALOG` (engraving / size / color / description / image) a product uses and set a per-field placeholder + required flag. Stored on `Product.customFields` (Json) as `Record<fieldKey, { placeholder?, required? }>` (presence of a key = enabled).

- `lib/customization.ts` is plain data (no React/Node deps) — shared by the admin builder, the storefront renderer, and server validation. `resolveEnabledFields(config)` returns enabled fields in catalog order with placeholders/required resolved.
- [components/shop/DynamicCustomizationForm.tsx](components/shop/DynamicCustomizationForm.tsx) renders the resolved fields on the storefront (inside ProductModal); validated via `CustomFieldsSchema` in `lib/validators.ts` and persisted through the product create/update routes.

### Support / "raise a concern" — [/api/support](app/api/support/route.ts)

Public POST (rate-limited 5/min/IP). **No schema migration** — persists as a `Lead` row with contact/category details packed into `notes` as a JSON marker (`{ type: "support", email, phone, category, orderNumber }`); the admin support inbox at [/admin/support](app/admin/support/page.tsx) parses it back out. Fires `notifyAdmin({ type: "support" })`. Input via `SupportConcernSchema`; UI in [components/site/SupportForm.tsx](components/site/SupportForm.tsx) on the `/contact` page.

### `BY_MISTAKE` order status

New `OrderStatus` value for orders placed in error (test/duplicate). Like `CANCELLED`/`REFUNDED`, it is **excluded from analytics** simply by being absent from `COUNTED_STATUSES` in [/api/admin/analytics](app/api/admin/analytics/route.ts).

### Settings now partially read — [lib/settings.ts](lib/settings.ts)

The Phase 4 caveat ("settings persisted but not read") is now partly resolved: `getOnlinePaymentsEnabled()` reads the `payments` Settings row to gate Razorpay. **Fails closed (off)** on any missing row / DB error, so online payments stay off until an admin explicitly enables them. Shipping/tax/WhatsApp-number are still hardcoded — wire the rest through this module.

### SEO, legal & site identity

- [lib/site.ts](lib/site.ts) is the **single source of truth** for public identity (name, description, contact, nav, footer groups, social links, `whatsappLink()`, `absoluteUrl()`) — used by metadata, [app/sitemap.ts](app/sitemap.ts), [app/robots.ts](app/robots.ts), [app/manifest.ts](app/manifest.ts), JSON-LD, the footer, and legal pages. Edit business-facing constants here, not inline.
- Legal/marketing pages: `/about`, `/contact`, `/terms`, `/privacy`, `/shipping-returns`. `POLICY_LAST_UPDATED` is a constant (not `new Date()`) — bump it manually when a policy actually changes.
- Product `description` is now **rich-text HTML** authored in the admin editor and **sanitized at the boundary** via `sanitizeHtml` in [lib/sanitize.ts](lib/sanitize.ts) (the `min(1)` runs on raw input first). Products also gained a `stockStatus` enum field (`in-stock | low-stock | out-of-stock`).

### Phase 7 env vars

- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — Telegram admin alerts (group chat id for a team)
- `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_NOTIFY_TO` — WhatsApp Cloud API admin alerts; optional `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANG` (template mode for production)
- `NEXT_PUBLIC_SITE_URL` — public origin for sitemap/robots/canonical/JSON-LD (default `https://shilpsmith.com`)
- `NEXT_PUBLIC_SUPPORT_EMAIL` — public support address shown on the site (empty when unset; callers guard rendering)
