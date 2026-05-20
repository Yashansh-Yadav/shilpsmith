"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  variant?: "up" | "scale";
  // Delay in ms before the reveal animation starts (after the element enters
  // view). Useful for staggering siblings.
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

// Lightweight scroll-reveal wrapper backed by IntersectionObserver. Uses the
// classes defined in globals.css so animations stay in the CSS layer and we
// avoid a runtime animation library.
//
// Once an element has entered view we leave it visible — re-animating on
// scroll-back is rarely what users want and slightly more expensive.
export default function Reveal({
  variant = "up",
  delay = 0,
  className = "",
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // SSR / very old browsers — just show the element.
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setVisible(true), delay);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const baseClass = variant === "scale" ? "reveal-scale" : "reveal";
  const combined = `${baseClass}${visible ? " is-visible" : ""} ${className}`.trim();

  return (
    <div ref={ref} className={combined}>
      {children}
    </div>
  );
}
