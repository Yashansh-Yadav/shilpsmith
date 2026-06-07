import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_LEGAL_NAME, SITE_DESCRIPTION, BRAND_LOGO } from "../lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_LEGAL_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    icons: [
      { src: BRAND_LOGO, sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
