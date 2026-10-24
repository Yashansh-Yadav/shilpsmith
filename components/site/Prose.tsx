import { POLICY_LAST_UPDATED } from "../../lib/site";

// Shared header band + typographic container for legal/info pages. The prose
// styling uses Tailwind arbitrary variants (no typography plugin in this repo).
export function PageHeader({
  eyebrow,
  title,
  intro,
  showUpdated = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  showUpdated?: boolean;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        {eyebrow && (
          <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-300">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            {intro}
          </p>
        )}
        {showUpdated && (
          <p className="mt-6 font-mono text-xs text-slate-500">
            Last updated: {POLICY_LAST_UPDATED}
          </p>
        )}
      </div>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
      <article className="text-[17px] leading-relaxed text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-14 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:tracking-[-0.03em] [&_h2]:text-slate-900 [&_h2:first-child]:mt-0 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1.5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </article>
    </div>
  );
}
