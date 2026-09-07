import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import {
  SITE_URL,
  SITE_NAME,
  SITE_LEGAL_NAME,
  SITE_DESCRIPTION,
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
  OG_IMAGE,
  BRAND_LOGO,
  FOUNDER_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_PHONE_E164,
} from "../lib/site";
import { getSocialLinks } from "../lib/settings";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Tech/maker pairing — mono used for prices, specs, build numbers. JetBrains
// Mono has the cleanest character shapes for tabular numerals.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_LEGAL_NAME} — Premium 3D Printed Gifts & Custom Creations`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "3D printing India",
    "custom 3D printed gifts",
    "personalized gifts",
    "3D printed decor",
    "custom commissions",
    "ShilpSmith",
  ],
  authors: [{ name: SITE_LEGAL_NAME }],
  creator: SITE_LEGAL_NAME,
  publisher: SITE_LEGAL_NAME,
  // NO `alternates.canonical` here on purpose. Next merges metadata down the
  // tree, so a canonical set on the root layout is inherited by every page that
  // doesn't override it — which had /smart-idols and /track both declaring
  // themselves duplicates of the homepage, i.e. asking Google to drop them from
  // the index. Each page sets its own; a page that forgets one now emits none
  // (Google self-canonicalizes) rather than a wrong one.
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_LEGAL_NAME} — Premium 3D Printed Gifts & Custom Creations`,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_LEGAL_NAME}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: { icon: BRAND_LOGO, apple: BRAND_LOGO },
  category: "shopping",
};

// The Organization JSON-LD below reads social profiles from the database, so
// otherwise-static pages need a refresh window or they'd serve whatever was in
// the DB at build time forever. Admin saves also revalidate the cache tag
// directly, so this is only the backstop. Pages with a shorter revalidate (e.g.
// /products/[slug] at 60s) keep theirs.
export const revalidate = 300;

// Organization + WebSite structured data. Helps Google build the brand knowledge
// panel and enables the sitelinks search box. ContactPoint surfaces support
// channels; `sameAs` claims the business's social profiles.
//
// `sameAs` is the single strongest signal for entity disambiguation — it's what
// stops a search/AI answer from attaching a similarly-named stranger's account
// to this brand. The URLs come from admin → Settings → Social profiles, cached
// (and tag-revalidated on save) so this per-page read isn't a per-page query.
//
// Async on purpose: it's a nested server component, so the root layout itself
// stays synchronous.
async function StructuredData() {
  const sameAs = (await getSocialLinks()).map((s) => s.url);
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_LEGAL_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}${BRAND_LOGO}`,
        description: SITE_DESCRIPTION,
        ...(sameAs.length ? { sameAs } : {}),
        // A named person and a real address are what let Google treat this as a
        // genuine business rather than an anonymous storefront.
        founder: { "@type": "Person", name: FOUNDER_NAME },
        address: {
          "@type": "PostalAddress",
          ...(BUSINESS_ADDRESS.locality
            ? { streetAddress: BUSINESS_ADDRESS.locality }
            : {}),
          addressLocality: BUSINESS_ADDRESS.city,
          addressRegion: BUSINESS_ADDRESS.state,
          ...(BUSINESS_ADDRESS.postalCode
            ? { postalCode: BUSINESS_ADDRESS.postalCode }
            : {}),
          addressCountry: "IN",
        },
        telephone: BUSINESS_PHONE_E164,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            ...(SUPPORT_EMAIL ? { email: SUPPORT_EMAIL } : {}),
            telephone: BUSINESS_PHONE_E164,
            areaServed: "IN",
            availableLanguage: ["en", "hi"],
          },
          ...(WHATSAPP_NUMBER
            ? [
                {
                  "@type": "ContactPoint",
                  contactType: "sales",
                  telephone: `+${WHATSAPP_NUMBER}`,
                  areaServed: "IN",
                  availableLanguage: ["en", "hi"],
                },
              ]
            : []),
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
