import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";

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
  BUSINESS_GEO,
  BUSINESS_MAP_URL,
} from "../lib/site";
import { getSocialLinks } from "../lib/settings";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Display face for headlines — geometric, engineered, maker-ish. Inter stays
// the body face; mono stays for prices and specs.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

// Tech/maker pairing — mono used for prices, specs, build numbers. JetBrains
// Mono has the cleanest character shapes for tabular numerals.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

// City in the default title: it's what every page without its own title shows,
// and "3D printing Bareilly" is the query the local strategy is built around.
const DEFAULT_TITLE = `${SITE_LEGAL_NAME} — Custom 3D Printing in Bareilly & Across India`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "3D printing Bareilly",
    "3D printing service in Bareilly",
    "custom gifts Bareilly",
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
    title: DEFAULT_TITLE,
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
        // Both types on one entity (one @id) rather than two look-alike nodes:
        // Organization carries the brand signals (logo, sameAs), LocalBusiness
        // the local ones (address, geo, areaServed) that tie it to Bareilly.
        "@type": ["Organization", "LocalBusiness"],
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
        ...(BUSINESS_GEO
          ? { geo: { "@type": "GeoCoordinates", ...BUSINESS_GEO } }
          : {}),
        ...(BUSINESS_MAP_URL ? { hasMap: BUSINESS_MAP_URL } : {}),
        image: `${SITE_URL}${OG_IMAGE}`,
        telephone: BUSINESS_PHONE_E164,
        // Home city first, then the rest of the country it ships to.
        areaServed: [
          { "@type": "City", name: BUSINESS_ADDRESS.city },
          { "@type": "Country", name: BUSINESS_ADDRESS.country },
        ],
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

// Google Analytics 4. Production-only so local dev traffic doesn't pollute the
// property. `afterInteractive` keeps gtag.js off the critical rendering path.
const GA_MEASUREMENT_ID = "G-SZKJF7L95J";

function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <StructuredData />
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
