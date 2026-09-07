import type { MetadataRoute } from "next";

import { SITE_URL } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private / transactional surfaces shouldn't be indexed.
        disallow: ["/admin", "/api", "/cart", "/checkout", "/order", "/admin-login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
    // /llms.txt isn't part of the robots spec, but pointing at it costs nothing
    // and some agents look here first for a site map of any kind.
  };
}
