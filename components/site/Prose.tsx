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
    <div className="border-b border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            {intro}
          </p>
        )}
        {showUpdated && (
          <p className="mt-4 text-sm text-slate-400">
            Last updated: {POLICY_LAST_UPDATED}
          </p>
        )}
      </div>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <article className="text-[15px] leading-relaxed text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_h2:first-child]:mt-0 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1.5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </article>
    </div>
  );
}
