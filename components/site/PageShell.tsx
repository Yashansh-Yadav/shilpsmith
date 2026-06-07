import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

// Standard wrapper for non-homepage public pages: shared header, page body,
// shared footer. Keeps the chrome consistent across about / contact / legal.
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
