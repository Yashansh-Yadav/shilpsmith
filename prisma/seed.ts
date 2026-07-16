import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    slug: "personalized-gifts",
    name: "Personalized Gifts",
    description: "Custom figurines, photo plaques, and memorable keepsakes.",
  },
  {
    slug: "home-decor",
    name: "Home & Decor",
    description: "Modern aesthetic decor pieces, lamps, and creative accessories.",
  },
  {
    slug: "educational-student",
    name: "Educational & Student",
    description: "Study tools, anatomy models, desk organizers, and educational prints.",
  },
  {
    slug: "functional-products",
    name: "Functional Products",
    description: "Practical organizers, holders, hooks, and utility-focused designs.",
  },
  {
    slug: "jewelry-fashion",
    name: "Jewelry & Fashion",
    description: "Custom pendants, earrings, name necklaces, and wearable art.",
  },
  {
    slug: "spiritual-artistic",
    name: "Spiritual & Artistic",
    description: "Idols, meditation decor, artistic sculptures, and aesthetic collectibles.",
  },
];

// Earlier versions of this seed shipped 10 demo products + a few sample
// reviews. The storefront now ships imageless and content-less — admins add
// real products through /admin. We keep the slugs here so re-seeding cleans
// up any leftover demo rows from upgrading installs.
const LEGACY_DEMO_PRODUCT_SLUGS = [
  "minime-custom-figurine",
  "glowname-led-lamp",
  "modern-vase-trio",
  "moon-mood-lamp",
  "spotify-music-plaque",
  "anatomy-heart-model",
  "modular-desk-organizer",
  "namechain-pendant",
  "ganesha-mini-idol",
  "diwali-diya-set",
];

// Darshan deity catalog. We seed the genuinely-safe, useful data: identity,
// mantras, and accurate special-day rules (weekday / tithi). Media entries are
// PLACEHOLDERS — real aarti/bhajan YouTube ids and scripture PDFs must be added
// in /admin/deities from official / public-domain sources (see the legal
// safeguards: embed-only + source + license on every item). The placeholder
// youtubeId is a structurally-valid dummy so pages render for QA; the link
// health check will flag it until replaced.
const PLACEHOLDER_YT = "ZZZZZZZZZZZ"; // 11 chars; replace in admin
const REPLACE_SOURCE = "PLACEHOLDER — replace with official source in admin";
const REPLACE_LICENSE = "Unverified — confirm rights before going live";

const DEITIES = [
  {
    key: "shiva",
    nameEn: "Mahadev",
    nameHi: "महादेव",
    mantra: "ॐ नमः शिवाय",
    transliteration: "Om Namah Shivaya",
    jaikaraHi: "हर हर महादेव",
    jaikaraEn: "Har Har Mahadev",
    sortOrder: 1,
    aartis: [
      {
        labelEn: "Shiv Aarti (Morning)",
        labelHi: "शिव आरती (प्रातः)",
        youtubeId: PLACEHOLDER_YT,
        slot: "morning",
        source: REPLACE_SOURCE,
        license: REPLACE_LICENSE,
      },
      {
        labelEn: "Shiv Aarti (Sandhya)",
        labelHi: "शिव आरती (संध्या)",
        youtubeId: PLACEHOLDER_YT,
        slot: "sandhya",
        source: REPLACE_SOURCE,
        license: REPLACE_LICENSE,
      },
    ],
    bhajans: [],
    scriptures: [
      {
        titleEn: "Shiv Purana",
        titleHi: "शिव पुराण",
        lang: "hi",
        pdfUrl: "https://example.com/replace-shiv-purana.pdf",
        description: "The legends, glory and worship of Lord Shiva.",
        source: REPLACE_SOURCE,
        license: REPLACE_LICENSE,
      },
    ],
    specialDays: [
      { labelEn: "Somvar (Monday)", labelHi: "सोमवार", weekday: 1, note: "Most auspicious day for Mahadev", noteHi: "महादेव की आराधना का सर्वोत्तम दिन" },
      { labelEn: "Pradosh Vrat", labelHi: "प्रदोष व्रत", tithi: "Trayodashi" },
      { labelEn: "Masik Shivratri", labelHi: "मासिक शिवरात्रि", tithi: "Chaturdashi", paksha: "krishna" },
      { labelEn: "Purnima", labelHi: "पूर्णिमा", tithi: "Purnima" },
    ],
  },
  {
    key: "durga",
    nameEn: "Maa Durga",
    nameHi: "माँ दुर्गा",
    mantra: "ॐ दुं दुर्गायै नमः",
    transliteration: "Om Dum Durgayai Namah",
    jaikaraHi: "जय माता दी",
    jaikaraEn: "Jai Mata Di",
    sortOrder: 2,
    aartis: [
      {
        labelEn: "Durga Aarti",
        labelHi: "दुर्गा आरती",
        youtubeId: PLACEHOLDER_YT,
        slot: "morning",
        source: REPLACE_SOURCE,
        license: REPLACE_LICENSE,
      },
    ],
    bhajans: [],
    scriptures: [
      {
        titleEn: "Durga Saptashati",
        titleHi: "दुर्गा सप्तशती",
        lang: "sa",
        pdfUrl: "https://example.com/replace-durga-saptashati.pdf",
        description: "700 verses in praise of the Divine Mother.",
        source: REPLACE_SOURCE,
        license: REPLACE_LICENSE,
      },
    ],
    specialDays: [
      { labelEn: "Shukravar (Friday)", labelHi: "शुक्रवार", weekday: 5 },
      { labelEn: "Durga Ashtami", labelHi: "दुर्गा अष्टमी", tithi: "Ashtami", paksha: "shukla" },
    ],
  },
  {
    key: "ganesha",
    nameEn: "Ganpati",
    nameHi: "गणपति",
    mantra: "ॐ गं गणपतये नमः",
    transliteration: "Om Gam Ganapataye Namah",
    jaikaraHi: "गणपति बप्पा मोरया",
    jaikaraEn: "Ganpati Bappa Morya",
    sortOrder: 3,
    aartis: [
      {
        labelEn: "Ganesh Aarti (Sukhkarta Dukhharta)",
        labelHi: "गणेश आरती (सुखकर्ता दुखहर्ता)",
        youtubeId: PLACEHOLDER_YT,
        slot: "morning",
        source: REPLACE_SOURCE,
        license: REPLACE_LICENSE,
      },
    ],
    bhajans: [],
    scriptures: [],
    specialDays: [
      { labelEn: "Budhvar (Wednesday)", labelHi: "बुधवार", weekday: 3 },
      { labelEn: "Sankashti Chaturthi", labelHi: "संकष्टी चतुर्थी", tithi: "Chaturthi", paksha: "krishna" },
      { labelEn: "Vinayaka Chaturthi", labelHi: "विनायक चतुर्थी", tithi: "Chaturthi", paksha: "shukla" },
    ],
  },
] as const;

async function main() {
  // This seed creates a SUPER_ADMIN. Running it against production would hand
  // out full access — and because the upsert below has an `update` branch, it
  // would also silently reset an already-hardened password back to the demo
  // one. Refuse outright; there is no legitimate reason to seed prod.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed a production database. Unset NODE_ENV=production if this is genuinely a local/dev database."
    );
  }

  // Demo admin. Password comes from the environment so a real deployment can
  // set its own; the fallback exists only for local development.
  const demoEmail = process.env.SEED_ADMIN_EMAIL || "admin@shilpsmith.com";
  const demoPassword = process.env.SEED_ADMIN_PASSWORD || "demo";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.admin.upsert({
    where: { email: demoEmail },
    // Only fill in a password when creating. Re-running the seed to refresh
    // categories must never reset the password of an existing admin.
    update: { role: "SUPER_ADMIN" },
    create: {
      email: demoEmail,
      password: passwordHash,
      role: "SUPER_ADMIN",
      name: "Demo Admin",
    },
  });
  console.log(`Admin upserted: ${demoEmail}`);

  // Categories
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }
  console.log(`Categories upserted: ${CATEGORIES.length}`);

  // Cleanup of legacy demo data. Reviews + ProductImage + ProductVariant
  // cascade-delete via FK; OrderItem references RESTRICT, so we keep
  // products that already have orders attached and just log them.
  let removedProducts = 0;
  let skippedProducts = 0;
  for (const slug of LEGACY_DEMO_PRODUCT_SLUGS) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { orderItems: true } } },
    });
    if (!product) continue;
    if (product._count.orderItems > 0) {
      skippedProducts++;
      continue;
    }
    await prisma.product.delete({ where: { id: product.id } });
    removedProducts++;
  }
  if (removedProducts > 0) {
    console.log(`Removed legacy demo products: ${removedProducts}`);
  }
  if (skippedProducts > 0) {
    console.log(
      `Left ${skippedProducts} legacy demo product(s) in place — they already have orders attached.`
    );
  }

  // Deities (Darshan / NFC idols). Upsert by key so re-seeding refreshes the
  // identity/special-days without clobbering media an admin has already added.
  for (const d of DEITIES) {
    const existing = await prisma.deity.findUnique({
      where: { key: d.key },
      select: { id: true },
    });
    await prisma.deity.upsert({
      where: { key: d.key },
      // On update keep admin-curated media; only refresh identity + rules.
      update: {
        nameEn: d.nameEn,
        nameHi: d.nameHi,
        mantra: d.mantra,
        transliteration: d.transliteration,
        jaikaraHi: d.jaikaraHi,
        jaikaraEn: d.jaikaraEn,
        sortOrder: d.sortOrder,
        specialDays: d.specialDays as object,
      },
      create: {
        key: d.key,
        nameEn: d.nameEn,
        nameHi: d.nameHi,
        mantra: d.mantra,
        transliteration: d.transliteration,
        jaikaraHi: d.jaikaraHi,
        jaikaraEn: d.jaikaraEn,
        sortOrder: d.sortOrder,
        aartis: d.aartis as object,
        bhajans: d.bhajans as object,
        scriptures: d.scriptures as object,
        specialDays: d.specialDays as object,
      },
    });
    console.log(
      `Deity ${existing ? "updated" : "created"}: ${d.key} (${d.nameEn})`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
