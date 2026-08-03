// app/products/[slug]/layout.tsx
//
// The chrome lives in a layout, not in page.tsx, so it stays mounted while the
// page's data loads — that's what lets loading.tsx paint a skeleton inside the
// real header/footer instead of the whole screen going blank.

import PageShell from "../../../components/site/PageShell";
import StorefrontChrome from "../../../components/shop/StorefrontChrome";

export default function ProductLayout({
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
