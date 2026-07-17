// lib/faq.ts
//
// Single source of truth for the storefront FAQ. Dependency-free plain data so
// it can be pulled into both the client accordion (components/shop/FAQ.tsx) and
// the server-rendered FAQPage JSON-LD without duplicating copy.
//
// Why this matters for discoverability: answer engines (ChatGPT / Gemini /
// Perplexity / Google AI Overviews) preferentially quote clean, self-contained
// question/answer pairs backed by FAQPage structured data. Each answer below is
// written to stand ALONE — it names "ShilpSmith" and states a complete fact, so
// a bot can lift a single answer into a response without surrounding context.
//
// GENUINE DATA ONLY: every answer here reflects a real capability of the
// business or copy already published on the site. No invented numbers, no
// claimed track record, no fabricated reviews. Edit copy here (not in the
// component) and the JSON-LD updates with it. Answers are plain text (no HTML)
// because they're emitted verbatim into JSON-LD.

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What is ShilpSmith?",
    a: "ShilpSmith is a 3D printing studio in India that creates personalized gifts, aesthetic home decor, functional accessories, educational models, and one-of-a-kind custom pieces. Every product is designed digitally and 3D-printed on demand, so you get made-to-order items rather than mass-produced stock.",
  },
  {
    q: "Do you make custom 3D printed products, and how does it work?",
    a: "Yes — custom work is at the core of what ShilpSmith does. You share a reference photo, a sketch, or a rough idea over WhatsApp; our team turns it into a 3D model and shows you a preview before printing; then we print it and deliver it once you approve. The design consultation is free and no deposit is required to start.",
  },
  {
    q: "What kinds of products can I order?",
    a: "ShilpSmith offers personalized gifts, aesthetic decor, functional accessories, educational models, and fully custom commissions. If you can describe or sketch it, we can usually design and 3D print it for you.",
  },
  {
    q: "How do I place a custom order?",
    a: "To start a custom order with ShilpSmith, message us on WhatsApp with your idea, photo, or sketch. We build the 3D model, share a preview for your approval, and then print and ship it. You can also browse and buy ready-made products directly on the ShilpSmith website.",
  },
  {
    q: "What materials do you print with?",
    a: "ShilpSmith prints with sturdy, premium materials chosen to last, including biodegradable, food-safe filaments where a product calls for them. The right material is selected for each piece based on how it will be used.",
  },
  {
    q: "How long does delivery take, and where do you ship?",
    a: "ShilpSmith ships across India. Most standard pieces are printed and dispatched within 24–72 hours of order confirmation. Fully custom commissions can take a little longer depending on design complexity, and we confirm the timeline with you before printing.",
  },
  {
    q: "Can I personalize a product with names, colors, or sizes?",
    a: "Yes. ShilpSmith products can be personalized — you can add names or engraving, choose colors, and adjust measurements on customizable items. The available options are shown on each product, and for anything more specific you can request it over WhatsApp.",
  },
  {
    q: "What payment options are available?",
    a: "Your available payment options are shown at checkout on the ShilpSmith website, and you can also confirm your order with our team over WhatsApp.",
  },
  {
    q: "Do you take bulk or corporate gifting orders?",
    a: "Since every ShilpSmith piece is made to order, we can take on bulk and corporate gifting requests. Message us on WhatsApp with your quantity and timeline and we'll help you plan it.",
  },
];
