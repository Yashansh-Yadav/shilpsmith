import Reveal from "../shop/Reveal";

// Outline of the vase in both drawings — the sketch strokes it, the print fills it.
const VASE = "M62 20 c0 22 -38 38 -38 92 c0 52 22 108 56 108 c34 0 56 -56 56 -108 c0 -54 -38 -70 -38 -92";

// "Have an idea? We'll print it." — the custom-order pitch. On entering view a
// sketch draws itself, then the same shape prints beside it layer by layer
// (CSS .sketch-path / .printed-shape, keyed off Reveal's .is-visible).
export default function CustomOrderBand({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section id="custom" className="scroll-mt-20 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal variant="scale">
          <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white sm:p-12 lg:p-16">
            <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10 opacity-60" />
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.035em] sm:text-6xl">
                  Have an idea?
                  <br />
                  <span className="text-brand-400">We&apos;ll print it.</span>
                </h2>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
                  Share a sketch, Pinterest mood-board, image, or rough concept —
                  we turn it into a premium-quality 3D printed product.
                </p>
                <ul className="mt-8 space-y-3 text-slate-200">
                  {["Personalized product design", "Preview before printing", "Delivery across India"].map((line) => (
                    <li key={line} className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-400" />
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-wrap items-center gap-5">
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-4 font-semibold text-slate-950 transition hover:bg-brand-400 active:scale-[.97]"
                    >
                      Chat on WhatsApp
                    </a>
                  )}
                  <p className="text-sm text-slate-400">Free design consultation. No deposit required.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 items-end gap-6" aria-hidden="true">
                <figure>
                  <svg className="mx-auto h-64 w-full" viewBox="0 0 160 240" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                    <path className="sketch-path" d={`M58 20 h44 ${VASE}`} />
                    <path className="sketch-path" d="M40 120 c26 10 54 10 80 0 M34 160 c30 12 62 12 92 0" strokeDasharray="3 6" />
                  </svg>
                  <figcaption className="mt-3 text-center font-mono text-xs text-slate-500">Your sketch</figcaption>
                </figure>
                <figure>
                  <svg className="printed-shape mx-auto h-64 w-full" viewBox="0 0 160 240">
                    <defs>
                      <pattern id="layer-lines" width="4" height="4" patternUnits="userSpaceOnUse">
                        <rect width="4" height="3" fill="#10b981" />
                        <rect y="3" width="4" height="1" fill="#047857" />
                      </pattern>
                    </defs>
                    <path d={`${VASE} Z`} fill="url(#layer-lines)" />
                  </svg>
                  <figcaption className="mt-3 text-center font-mono text-xs text-brand-300">Printed in PLA</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
