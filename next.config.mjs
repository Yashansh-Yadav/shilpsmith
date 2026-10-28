/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a local production build sit beside a running `next dev` (which owns
  // .next) — e.g. NEXT_DIST_DIR=.next-perf next build. Unset everywhere else.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Product photos live on Vercel Blob as multi-MB PNGs. Allowing the host
    // lets next/image resize them per device and serve AVIF/WebP instead.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Blob URLs carry a random suffix, so an upload never changes in place —
    // optimized variants can be cached for a long time.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    // Vercel serves /public files with max-age=0. These are versioned by
    // hand (rename on change), so a day of browser cache + a week of
    // background revalidation is safe.
    const longish = [
      { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
    ];
    return [
      { source: "/:file(favicon.ico|favicon.svg|favicon-96x96.png|apple-touch-icon.png)", headers: longish },
      { source: "/:file(web-app-manifest-192x192.png|web-app-manifest-512x512.png)", headers: longish },
      { source: "/:file(brandLogo_figure.png|brandLogo_Text.png|myPhoto.webp|heroImage_v1.png)", headers: longish },
    ];
  },
};

export default nextConfig;
