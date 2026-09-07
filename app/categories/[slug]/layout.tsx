// app/categories/[slug]/layout.tsx
//
// Category landings previously rendered with no chrome at all — no header, no
// footer, no cart. That left them orphaned for crawlers (no internal links out)
// and dead-ended customers who landed on one from search. Mirrors the product
// page: chrome in the layout so it stays mounted while the page's data loads.

import PageShell from "../../../components/site/PageShell";
import StorefrontChrome from "../../../components/shop/StorefrontChrome";

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      {children}
      <StorefrontChrome />
    </PageShell>
  );
}
