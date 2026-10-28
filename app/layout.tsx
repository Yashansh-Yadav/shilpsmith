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
  // Small purpose-made icons. (Previously BRAND_LOGO — a 1.5 MB 1024px PNG —
  // which every browser downloaded as the tab icon on every visit.)
  // app/favicon.ico and app/apple-touch-icon.png are also picked up by Next's
  // file conventions.
  icons: {
    // (Not /favicon.svg: it's a 2 MB SVG wrapping a 1024px bitmap.)
    icon: [{ url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" }],
    apple: "/apple-touch-icon.png",
  },
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

// Google Analytics 4. Production-only so local dev traffic doesn't pollute the
// property. `lazyOnload` waits until the page has fully loaded and the
// browser is idle, so the 177 KB gtag.js never competes with the page itself.
const GA_MEASUREMENT_ID = "G-SZKJF7L95J";

function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
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
