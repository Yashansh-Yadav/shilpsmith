// app/llms.txt/route.ts
//
// /llms.txt — an emerging convention (llmstxt.org) giving AI assistants a
// compact, plain-text map of the site instead of making them infer one from
// rendered HTML. Generated rather than static so the catalog, categories and
// FAQ can't drift from what the site actually serves.
//
// Everything here is derived from the database or from lib/faq.ts + lib/site.ts,
// so there are no hand-maintained duplicate facts to fall out of date — the same
// discipline as the FAQ: no invented capabilities, no fabricated numbers.

import { prisma } from "../../lib/prisma";
import { FAQ_ITEMS } from "../../lib/faq";
import {
  SITE_URL,
  SITE_NAME,
  SITE_LEGAL_NAME,
  SITE_DESCRIPTION,
  BUSINESS_COUNTRY,
  SUPPORT_EMAIL,
  FOUNDER_NAME,
  FOUNDER_ROLE,
  BUSINESS_PHONE,
  BUSINESS_ADDRESS_LINE,
} from "../../lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { products: { some: { deletedAt: null } } },
      select: { name: true, slug: true, description: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { name: true, slug: true, shortDescription: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const lines: string[] = [
    `# ${SITE_LEGAL_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    `${SITE_NAME} is a 3D printing studio based in ${BUSINESS_COUNTRY}. Products are`,
    "designed digitally and printed on demand, so items are made to order rather",
    "than held as mass-produced stock. Custom commissions are a core part of the",
    "business: customers can send a photo, sketch or description and receive a",
    "preview before anything is printed.",
    "",
    "## Key pages",
    "",
    `- [Home](${SITE_URL}/): brand overview, featured and new products`,
    `- [Shop all products](${SITE_URL}/search): full catalog with category, price and customization filters`,
    `- [Smart NFC Idols](${SITE_URL}/smart-idols): idols with an embedded NFC tag that opens a live darshan page`,
    `- [About](${SITE_URL}/about): studio background, materials and process`,
    `- [Contact & support](${SITE_URL}/contact): raise a concern or request a custom quote`,
    `- [Track order](${SITE_URL}/track): order status by order number`,
    `- [Shipping & returns](${SITE_URL}/shipping-returns): dispatch and delivery windows, cancellations, refunds`,
    `- [Terms](${SITE_URL}/terms) · [Privacy](${SITE_URL}/privacy)`,
    "",
  ];

  if (categories.length > 0) {
    lines.push("## Categories", "");
    for (const c of categories) {
      const desc = c.description?.trim().replace(/\s+/g, " ");
      lines.push(
        `- [${c.name}](${SITE_URL}/categories/${c.slug})${desc ? `: ${desc}` : ""}`
      );
    }
    lines.push("");
  }

  if (products.length > 0) {
    lines.push("## Products", "");
    for (const p of products) {
      const desc = p.shortDescription?.trim().replace(/\s+/g, " ").slice(0, 160);
      lines.push(
        `- [${p.name}](${SITE_URL}/products/${p.slug})${desc ? `: ${desc}` : ""}`
      );
    }
    lines.push("");
  }

  lines.push("## Frequently asked questions", "");
  for (const item of FAQ_ITEMS) {
    lines.push(`### ${item.q}`, "", item.a, "");
  }

  lines.push(
    "## Business details",
    "",
    `- Legal name: ${SITE_LEGAL_NAME}`,
    `- ${FOUNDER_ROLE}: ${FOUNDER_NAME}`,
    `- Address: ${BUSINESS_ADDRESS_LINE}`,
    `- Phone: ${BUSINESS_PHONE}`,
    ...(SUPPORT_EMAIL ? [`- Email: ${SUPPORT_EMAIL}`] : []),
    ""
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
