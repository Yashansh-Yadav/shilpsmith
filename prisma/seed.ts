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

async function main() {
  // Demo admin
  const demoEmail = "admin@shilpsmith.com";
  const demoPassword = "demo";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.admin.upsert({
    where: { email: demoEmail },
    update: { password: passwordHash, role: "SUPER_ADMIN", name: "Demo Admin" },
    create: {
      email: demoEmail,
      password: passwordHash,
      role: "SUPER_ADMIN",
      name: "Demo Admin",
    },
  });
  console.log(`Admin upserted: ${demoEmail} (password: ${demoPassword})`);

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
