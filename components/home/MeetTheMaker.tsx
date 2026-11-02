import Image from "next/image";

import {
  FOUNDER_NAME,
  FOUNDER_ROLE,
  FOUNDER_PHOTO,
  FOUNDER_STORY,
  SITE_LEGAL_NAME,
  SUPPORT_EMAIL,
  BUSINESS_PHONE,
  BUSINESS_PHONE_E164,
  BUSINESS_ADDRESS,
  WHATSAPP_NUMBER,
  normalizeWhatsAppNumber,
  whatsappLink,
} from "../../lib/site";
import Reveal from "../shop/Reveal";

// Used until FOUNDER_STORY is set in lib/site.ts. Every sentence here is a fact
// the site already states elsewhere — no invented history.
const FALLBACK_STORY = [
  `${SITE_LEGAL_NAME} is a small, made-to-order 3D printing studio in ${BUSINESS_ADDRESS.city}, run by ${FOUNDER_NAME}.`,
  "Every piece is modelled, printed and finished by hand here, checked before it's packed, and shipped across India. Have an idea, a question, or a custom piece in mind? Talk to me directly.",
];

function prettyWhatsApp(raw: string) {
  const d = normalizeWhatsAppNumber(raw);
  return d.length === 12 ? `+${d.slice(0, 2)} ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`;
}

// "Meet the maker": the founder's photo, story and direct contact. Photo and
// story are configured in lib/site.ts (FOUNDER_PHOTO / FOUNDER_STORY).
export default function MeetTheMaker() {
  const wa = whatsappLink("Hi Yashansh! I have a question about ShilpSmith.");
  const story = FOUNDER_STORY ?? FALLBACK_STORY;
  const parts = FOUNDER_NAME.split(" ").filter(Boolean);
  const initials = `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`;

  const contacts = [
    wa && WHATSAPP_NUMBER
      ? { label: "WhatsApp", value: prettyWhatsApp(WHATSAPP_NUMBER), href: wa, mono: true, external: true }
      : null,
    { label: "Call", value: BUSINESS_PHONE, href: `tel:${BUSINESS_PHONE_E164}`, mono: true },
    SUPPORT_EMAIL ? { label: "Email", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` } : null,
    {
      label: "Studio",
      value: [BUSINESS_ADDRESS.locality, BUSINESS_ADDRESS.city, BUSINESS_ADDRESS.state, BUSINESS_ADDRESS.postalCode]
        .filter(Boolean)
        .join(", "),
    },
  ].filter(Boolean) as { label: string; value: string; href?: string; mono?: boolean; external?: boolean }[];

  return (
    <section id="maker" className="scroll-mt-20 bg-white py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <Reveal>
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-950">
              {FOUNDER_PHOTO ? (
                <Image
                  src={FOUNDER_PHOTO}
                  alt={`${FOUNDER_NAME}, ${FOUNDER_ROLE.toLowerCase()} of ${SITE_LEGAL_NAME}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover object-top"
                />
              ) : (
                <>
                  <div aria-hidden="true" className="plate-grid absolute inset-0" />
                  <div aria-hidden="true" className="heated-bed absolute inset-0" />
                  <span className="absolute inset-0 grid place-items-center font-display text-[9rem] font-semibold tracking-[-0.06em] text-brand-400">
                    {initials}
                  </span>
                </>
              )}
            </div>
            <div className="absolute -bottom-6 -right-3 rounded-2xl bg-slate-950 px-5 py-4 text-white ring-1 ring-white/10 sm:-right-6">
              <p className="font-mono text-xs text-brand-300">STUDIO</p>
              <p className="mt-1 font-semibold">
                {BUSINESS_ADDRESS.city}, {BUSINESS_ADDRESS.state}
              </p>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <h2 className="font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl">
              Meet the maker
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              <span className="font-semibold text-slate-900">{FOUNDER_NAME}</span> · {FOUNDER_ROLE},{" "}
              {SITE_LEGAL_NAME}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-slate-700">
              {story.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {contacts.map((c) => {
                const inner = (
                  <>
                    <p className="text-sm text-slate-500">{c.label}</p>
                    <p className={`mt-1 text-lg font-semibold text-slate-900 ${c.mono ? "font-mono" : ""}`}>
                      {c.value}
                    </p>
                  </>
                );
                return c.href ? (
                  <a
                    key={c.label}
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="rounded-2xl bg-slate-50 p-5 transition hover:bg-brand-50"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={c.label} className="rounded-2xl bg-slate-50 p-5">
                    {inner}
                  </div>
                );
              })}
            </div>
          </Reveal>

          {wa && (
            <Reveal delay={220}>
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-4 font-semibold text-white transition hover:bg-slate-800 active:scale-[.97]"
              >
                Talk to me directly
              </a>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
