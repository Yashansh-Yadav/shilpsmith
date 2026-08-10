// app/(shop)/track/layout.tsx
//
// The track page is a client component and can't export metadata itself. It
// needs its own canonical: without one it inherited the root layout's, which
// pointed at "/" and told Google this page was a duplicate of the homepage.

import type { Metadata } from "next";

import { SITE_NAME } from "../../../lib/site";

export const metadata: Metadata = {
  title: "Track your order",
  description: `Track a ${SITE_NAME} order with your order number and the email or phone you used at checkout.`,
  alternates: { canonical: "/track" },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
