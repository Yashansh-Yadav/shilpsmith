// app/search/layout.tsx
//
// Shared storefront chrome (header with search + cart, footer, cart drawer,
// toast host) for the shop / search page. Lives in a layout so it stays
// mounted while the page's results load.

import PageShell from "../../components/site/PageShell";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
