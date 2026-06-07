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
  SOCIAL_LINKS,
} from "../lib/site";

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
  alternates: { canonical: "/" },
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

// Organization + WebSite structured data. Helps Google build the brand knowledge
// panel and enables the sitelinks search box. ContactPoint surfaces support
// channels; sameAs links social profiles when configured.
function StructuredData() {
  const sameAs = Object.values(SOCIAL_LINKS).filter(Boolean);
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
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            ...(SUPPORT_EMAIL ? { email: SUPPORT_EMAIL } : {}),
            ...(WHATSAPP_NUMBER ? { telephone: `+${WHATSAPP_NUMBER}` } : {}),
            areaServed: "IN",
            availableLanguage: ["en", "hi"],
          },
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
