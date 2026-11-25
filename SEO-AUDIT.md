# ShilpSmith — SEO / GEO / AEO Audit & Local Strategy

**Site:** https://shilpsmith.com · **Audited:** 2 November 2026 · **Target market:** Bareilly, Uttar Pradesh first, then all of India

Terms used:
- **SEO:** ranking in Google and Bing results.
- **Local SEO:** ranking in the Google Maps "local pack" for searches like "3D printing near me" or "3D printing Bareilly".
- **AEO / GEO:** being quoted or recommended by AI answer engines: Google AI Overviews, ChatGPT search, Perplexity, Gemini and Copilot.

---

## 1. Audit summary

The technical foundation is in good shape for a site this size. The big gap was **local relevance**: before this change, the word "Bareilly" appeared nowhere a search engine weighs it (titles, meta descriptions, schema type, FAQ answers, llms.txt). It only existed as an address field. To Google, ShilpSmith was "a 3D printing shop somewhere in India".

| Area | Status | Notes |
|---|---|---|
| Server-rendered HTML | ✅ Good | Homepage, product, category and info pages render on the server, so non-JS crawlers (most AI bots) see the full content |
| Canonical tags | ✅ Good | Every page sets its own canonical. The old root-layout canonical bug is fixed |
| robots.txt | ✅ Good | Allows everything except admin, API, cart and checkout. AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) are allowed via `*` |
| sitemap.xml | ✅ Good | 40 URLs on the live site, with real `lastModified` values and empty categories excluded |
| llms.txt | ✅ Good | Generated from the database, so it can't drift |
| Organization + WebSite JSON-LD | ✅ Good | Includes founder, address, phone, contact points and SearchAction |
| Product JSON-LD | ✅ Good | Includes aggregateRating only when reviews exist, plus breadcrumbs |
| FAQPage JSON-LD | ✅ Good | Answers are written to stand alone, which suits AEO |
| E-E-A-T / trust | ✅ Good | Named founder with photo, full address, phone number, legal pages |
| Homepage response | ✅ OK | 1.8 s live. The Neon database is in `us-east-1`, so moving it to `ap-south-1` (Mumbai) would cut latency for Indian visitors |
| **City in titles/meta** | 🔧 **Fixed** | Default title and site description now name Bareilly |
| **LocalBusiness schema** | 🔧 **Fixed** | The business entity is now typed `Organization` + `LocalBusiness`, with `areaServed` set to Bareilly and India |
| **Local landing page** | 🔧 **Fixed** | New page at `/3d-printing-bareilly` |
| **Social `sameAs` URL** | 🔧 **Fixed** | The live Instagram link carried a `?igsh=` share tracker. Tracking params are now stripped automatically |
| **www → apex redirect** | ⚠️ **Action** | `www.shilpsmith.com` returns 200 instead of redirecting. Canonicals limit the damage, but it's still a duplicate host. See §3.1 |
| **Google Business Profile** | ⚠️ **Action** | The biggest local ranking factor, and it's off-site. See §3.2 |
| Geo coordinates / Maps link | ⏳ Pending | Hooks added (`BUSINESS_GEO`, `BUSINESS_MAP_URL` in `lib/site.ts`). Fill them from the Google Business Profile |
| ESLint | ℹ️ Minor | Not configured (`npm run lint` opens the setup prompt) |

---

## 2. What was changed in code

| File | Change |
|---|---|
| `lib/site.ts` | `SITE_DESCRIPTION` now leads with "Custom 3D printing studio in Bareilly, Uttar Pradesh". Added `BUSINESS_GEO`, `BUSINESS_MAP_URL` (both `null` until real) and `LOCAL_PAGE_PATH`. Footer → Company now links to the local page |
| `app/layout.tsx` | Default title is now "ShilpSmith 3D Studio — Custom 3D Printing in Bareilly & Across India". The schema entity is `["Organization","LocalBusiness"]` with `areaServed` (Bareilly → India), `image`, and optional `geo` / `hasMap`. Bareilly keywords added |
| `app/3d-printing-bareilly/page.tsx` | **New local landing page.** City-focused H1, title and description; 3-step custom-order flow; a carousel of real products and category links; 6 local FAQs (visible text plus FAQPage JSON-LD); `Service` JSON-LD pointing at the business entity; BreadcrumbList; a name/address/phone (NAP) block |
| `lib/faq.ts` | First answer now says "in Bareilly, Uttar Pradesh". New Q: "Where is ShilpSmith located? Is there a 3D printing service in Bareilly?" |
| `app/llms.txt/route.ts` | Intro names Bareilly. The local page is listed under Key pages |
| `app/sitemap.ts` | Local page added at priority 0.8 |
| `app/about/page.tsx` | Meta description names Bareilly |
| `lib/social.ts` | `normalizeSocialUrl()` strips `igsh`, `si`, `mibextid`, `fbclid`, `utm_*` and similar tracking params |

**Copy rule kept:** every claim on the local page is already published elsewhere on the site. It makes no promises about pickup, same-day delivery or walk-in visits. **If you do offer local pickup or faster delivery inside Bareilly, add it to the page.** It's the strongest local differentiator you could have.

---

## 3. Off-site actions (these matter more than code for the city)

### 3.1 Redirect www → apex (5 minutes)
Vercel → Project → Settings → **Domains** → `www.shilpsmith.com` → **Redirect to** `shilpsmith.com` (308).

### 3.2 Google Business Profile: priority #1 for "3D printing Bareilly"
The Maps local pack is ranked almost entirely from Google Business Profile (GBP), not from your website. Google AI Overviews and Gemini also read GBP for "near me" questions.

1. Create or claim the profile at business.google.com.
2. **Name:** `ShilpSmith 3D Studio`, exactly as on the site. Don't add keywords to the name, because Google suspends profiles for that.
3. **Primary category:** *3D printing service*. Secondary: *Gift shop*, *Custom t-shirt store* (only if true), *Religious goods store* (for the Smart idols).
4. **Address:** this is a home studio, so choose **service-area business** and hide the street address if you prefer. Set the service area to Bareilly plus nearby cities you deliver to. The site already shows the full address. If you hide it on GBP, consider whether you also want `BUSINESS_ADDRESS.locality` cleared on the site (see the privacy note in `lib/site.ts`).
5. **Phone:** `+91 82799 84069`, the same number as the site.
6. **Website:** `https://shilpsmith.com`.
7. Add products with photos, 10+ real work photos, a description that mentions Bareilly naturally, and opening hours.
8. Once verified, copy the pin coordinates and share link into `BUSINESS_GEO` and `BUSINESS_MAP_URL` in `lib/site.ts`.
9. Add the Google profile link in admin → Settings → Social profiles if the platform catalog gets a "Google" entry, or just keep it in `hasMap`.

### 3.3 Reviews: the #2 local factor, and what AI assistants quote
- Ask **every** Bareilly customer for a Google review. Send the GBP review short-link on WhatsApp after delivery.
- Reply to every review. Mentioning the product naturally ("glad the name plate arrived safely") helps.
- Keep collecting on-site reviews too: they feed Product `aggregateRating` stars in search results.

### 3.4 Citations: consistent name/address/phone everywhere
List the business with an **identical** name, address and phone on: **Bing Places** (feeds ChatGPT search and Copilot), **Apple Business Connect** (Apple Maps and Siri), **Justdial**, **IndiaMART**, **Sulekha** and a **Facebook Page**. Put "Bareilly" and the site URL in the Instagram bio.

### 3.5 Search consoles
- **Google Search Console:** verify the domain, submit `https://shilpsmith.com/sitemap.xml`, and use *URL inspection → Request indexing* on `/3d-printing-bareilly`.
- **Bing Webmaster Tools:** import from GSC. Bing's index powers ChatGPT search, Copilot and DuckDuckGo, so this is the cheapest AEO step there is.

---

## 4. AEO / GEO strategy (AI answer engines)

AI assistants recommend businesses they can **identify confidently** and **find corroborated** across several sources.

1. **One consistent entity:** same name, city and phone on the site, schema, GBP, citations and socials. ✅ Site side done.
2. **Quotable answers:** FAQ answers name "ShilpSmith" and "Bareilly" in every sentence that matters, so a single answer can be quoted on its own. ✅ Done for the homepage FAQ and the local FAQ.
3. **Third-party mentions:** this is where AI engines get corroboration. Aim for:
   - Bareilly local news or blogs (a "local maker" story; the Smart NFC idols make a good story)
   - Reddit (r/bareilly, r/3Dprinting, r/india) and Quora answers where you genuinely help. Never spam
   - College tech fests and maker clubs in Bareilly, if you offer student or project printing
   - Instagram Reels showing the process, with "Bareilly" in the caption
4. **Check visibility monthly:** ask ChatGPT, Perplexity and Gemini "3D printing service in Bareilly" and "custom 3D printed gifts Bareilly", and record whether ShilpSmith appears and what they say.

---

## 5. Content plan (next 90 days)

The search intent in a city like Bareilly clusters around gifts, festivals and personal items. Possible pages and posts, each linking to `/3d-printing-bareilly` and to the relevant products:

| Priority | Page / post | Target query |
|---|---|---|
| High | Personalized name plates (category or landing page) | "name plate Bareilly", "customized name plate" |
| High | Festival gift guides: Diwali, Raksha Bandhan, Karwa Chauth | "custom Diwali gifts", "rakhi gift for brother personalized" |
| High | Smart NFC idol explainer (already exists at `/smart-idols`; add a Bareilly mention) | "smart idol", "NFC murti" |
| Medium | Corporate gifting in Bareilly | "corporate gifts Bareilly" |
| Medium | "How custom 3D printing works" guide with pricing factors | "3D printing cost India" |
| Medium | Student / engineering project printing (only if offered) | "3D printing for college project Bareilly" |
| Later | A Hindi version of the local page | "बरेली में 3D प्रिंटिंग" |

A blog or guides section doesn't exist yet. When it's added, emit `Article` JSON-LD with the founder as author, and add the posts to the sitemap and llms.txt.

---

## 6. How to measure

| Metric | Where | Target (90 days) |
|---|---|---|
| Local page indexed | GSC → URL inspection | Week 1 |
| Impressions for "3d printing bareilly" and its variants | GSC → Performance → Queries | Rising month-on-month |
| Local pack appearance | Incognito search from Bareilly, plus GBP Insights | Top 3 for "3D printing Bareilly" |
| Google reviews | GBP | 15+ reviews, all replied to |
| AI mentions | Monthly manual prompts (§4.4) | Named in at least 2 of 4 assistants |
| Organic sessions & WhatsApp clicks | GA4 (G-SZKJF7L95J) | Track the baseline now |
