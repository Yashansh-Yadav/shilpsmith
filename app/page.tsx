// app/page.tsx
//
// Server component. It resolves the storefront payload before rendering, then
// hands it to the client component that owns the interactive bits (nav search,
// mobile menu, cart). Previously this whole file was "use client" and fetched
// /api/storefront in a useEffect, so the featured / new / trending / testimonial
// shelves existed only after JavaScript ran — invisible to AI crawlers, and only
// picked up by Google on its deferred rendering pass.

import type { Metadata } from "next";

import HomeContent from "../components/home/HomeContent";
import { getStorefrontData } from "../lib/storefront";

// The canonical used to live on the root layout, where every page inherited it.
// It belongs here, on the page it actually describes.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Same 1-minute window as /products/[slug] and /categories/[slug]: admin edits
// surface quickly without re-querying Neon on every request.
export const revalidate = 60;

export default async function Home() {
  const data = await getStorefrontData();
  return <HomeContent data={data} />;
}
