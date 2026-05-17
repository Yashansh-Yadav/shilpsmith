"use client";

import ProductGrid from "../components/ProductGrid";
import Image from "next/image";
import HeroBanner from "../public/heroImage_v1.png";
import Categories from "../components/Categories";
import BrandLogo_text from "../public/brandLogo_Text.png"
import BrandLogo_figure from "../public/brandLogo_figure.png"

import { useState } from "react";
import Link from "next/link";

const categories = [
  {
    emoji: "🎁",
    title: "Personalized Gifts",
    desc: "Custom figurines, photo plaques, and memorable keepsakes."
  },
  {
    emoji: "🏠",
    title: "Home & Decor",
    desc: "Modern aesthetic decor pieces, lamps, and creative accessories."
  },
  {
    emoji: "🧠",
    title: "Educational & Student",
    desc: "Study tools, anatomy models, desk organizers, and educational prints."
  },
  {
    emoji: "⚙️",
    title: "Functional Products",
    desc: "Practical organizers, holders, hooks, and utility-focused designs."
  },
  {
    emoji: "✨",
    title: "Jewelry & Fashion",
    desc: "Custom pendants, earrings, name necklaces, and wearable art."
  },
  {
    emoji: "🛕",
    title: "Spiritual & Artistic",
    desc: "Idols, meditation decor, artistic sculptures, and aesthetic collectibles."
  }
];

export default function Home() {

  const [activeCategory, setActiveCategory] = useState("3d printed gifts");
  const [mobileMenu, setMobileMenu] =
    useState(false);

  return (
    <main className="bg-slate-50 text-slate-900">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4">
          <div
            className="
            glass
            border
            border-white/70
            rounded-2xl
            shadow-lg
            px-4
            sm:px-6
            py-3
            flex
            items-center
            justify-between
            relative
          "
          >
            {/* LOGO */}
            <Link
              href="/"
              className="
              text-xl
              sm:text-2xl
              font-black
              tracking-tight
              shrink-0
              flex
            "
            >
              <div>
                <Image
                  src={BrandLogo_figure}
                  alt="ShilpSmith Logo"
                  width={40}
                  priority
                />
              </div>

              <Image
                src={BrandLogo_text}
                alt="ShilpSmith Logo"
                width={120}
                height={20}
                priority
              />
            </Link>

            {/* DESKTOP NAV */}
            <nav
              className="
              hidden
              lg:flex
              items-center
              gap-6
              text-sm
              font-medium
            "
            >
              <a
                href="#products"
                className="hover:text-brand-600"
              >
                Products
              </a>

              <a
                href="#categories"
                className="hover:text-brand-600"
              >
                Categories
              </a>

              <a
                href="#custom"
                className="hover:text-brand-600"
              >
                Custom Orders
              </a>

              <a
                href="#contact"
                className="hover:text-brand-600"
              >
                Contact
              </a>
            </nav>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-3">
              {/* WHATSAPP BUTTON */}
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
                target="_blank"
                className="
                hidden
                sm:flex
                bg-brand-600
                hover:bg-brand-700
                text-white
                px-5
                py-2.5
                rounded-xl
                font-semibold
                shadow-glow
                transition
                whitespace-nowrap
              "
              >
                Order Now
              </a>

              {/* MOBILE MENU BUTTON */}
              <button
                onClick={() =>
                  setMobileMenu(!mobileMenu)
                }
                className="
                lg:hidden
                w-11
                h-11
                rounded-xl
                border
                border-slate-200
                flex
                items-center
                justify-center
                bg-white
              "
              >
                {mobileMenu ? (
                  <span className="text-2xl">
                    ✕
                  </span>
                ) : (
                  <span className="text-2xl">
                    ☰
                  </span>
                )}
              </button>
            </div>

            {/* MOBILE MENU */}
            {mobileMenu && (
              <div
                className="
                absolute
                top-[calc(100%+12px)]
                left-0
                right-0
                bg-white
                rounded-2xl
                shadow-2xl
                border
                border-slate-100
                p-4
                lg:hidden
              "
              >
                <nav
                  className="
                  flex
                  flex-col
                  gap-2
                "
                >
                  <a
                    href="#products"
                    onClick={() =>
                      setMobileMenu(false)
                    }
                    className="
                    px-4
                    py-3
                    rounded-xl
                    hover:bg-slate-100
                    font-medium
                  "
                  >
                    Products
                  </a>

                  <a
                    href="#categories"
                    onClick={() =>
                      setMobileMenu(false)
                    }
                    className="
                    px-4
                    py-3
                    rounded-xl
                    hover:bg-slate-100
                    font-medium
                  "
                  >
                    Categories
                  </a>

                  <a
                    href="#custom"
                    onClick={() =>
                      setMobileMenu(false)
                    }
                    className="
                    px-4
                    py-3
                    rounded-xl
                    hover:bg-slate-100
                    font-medium
                  "
                  >
                    Custom Orders
                  </a>

                  <a
                    href="#contact"
                    onClick={() =>
                      setMobileMenu(false)
                    }
                    className="
                    px-4
                    py-3
                    rounded-xl
                    hover:bg-slate-100
                    font-medium
                  "
                  >
                    Contact
                  </a>

                  {/* MOBILE CTA */}
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
                    target="_blank"
                    className="
                    mt-3
                    bg-brand-600
                    hover:bg-brand-700
                    text-white
                    text-center
                    py-3.5
                    rounded-xl
                    font-semibold
                  "
                  >
                    Order on WhatsApp
                  </a>
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50"></div>

        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl"></div>

        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold mb-6">
                ✨ Personalized • Functional • Artistic • Premium Quality
              </span>

              <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
                Bring Your Ideas To Life With{" "}
                <span className="bg-gradient-to-r from-brand-600 to-cyan-600 bg-clip-text text-transparent">
                  Premium 3D Printing
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 max-w-xl leading-8">
                Discover personalized gifts, aesthetic decor, functional
                accessories, educational products, jewelry, spiritual items,
                and custom 3D printed creations crafted with precision.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#products"
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:opacity-90"
                >
                  Explore Products
                </a>

                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20I%20want%20a%20custom%203D%20printed%20product`}
                  target="_blank"
                  className="bg-white border border-slate-200 px-6 py-3 rounded-2xl font-semibold hover:border-brand-500"
                >
                  Get Custom Quote
                </a>
              </div>

              {/* <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-xs text-slate-500">Customizable</p>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-2xl font-bold">24h</p>
                  <p className="text-xs text-slate-500">
                    Fast Turnaround
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-2xl font-bold">Premium</p>
                  <p className="text-xs text-slate-500">
                    Print Quality
                  </p>
                </div>
              </div> */}

              <div
                className="
    mt-10
    grid
    grid-cols-3
    gap-3
    sm:gap-4
    w-full
  "
              >
                <div
                  className="
      bg-white
      rounded-2xl
      p-3
      sm:p-4
      shadow-sm
      border
      border-slate-100
      min-w-0
    "
                >
                  <p
                    className="
        text-xl
        sm:text-2xl
        lg:text-3xl
        font-bold
        leading-none
      "
                  >
                    100%
                  </p>

                  <p
                    className="
        text-[10px]
        sm:text-xs
        text-slate-500
        mt-2
      "
                  >
                    Customizable
                  </p>
                </div>

                <div
                  className="
      bg-white
      rounded-2xl
      p-3
      sm:p-4
      shadow-sm
      border
      border-slate-100
      min-w-0
    "
                >
                  <p
                    className="
        text-xl
        sm:text-2xl
        lg:text-3xl
        font-bold
        leading-none
      "
                  >
                    24h
                  </p>

                  <p
                    className="
        text-[10px]
        sm:text-xs
        text-slate-500
        mt-2
      "
                  >
                    Fast Turnaround
                  </p>
                </div>

                <div
                  className="
      bg-white
      rounded-2xl
      p-3
      sm:p-4
      shadow-sm
      border
      border-slate-100
      min-w-0
    "
                >
                  <p
                    className="
        text-xl
        sm:text-2xl
        lg:text-3xl
        font-bold
        leading-none
      "
                  >
                    Premium
                  </p>

                  <p
                    className="
        text-[10px]
        sm:text-xs
        text-slate-500
        mt-2
      "
                  >
                    Print Quality
                  </p>
                </div>
              </div>
            </div>

            <div className="relative" style={{ width: "100%" }}>
              <Image
                src={HeroBanner}
                alt="3D Product Catalog"
                className="rounded-[2rem] shadow-2xl border border-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}

      {/* <section id="categories" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-4xl font-bold">
              Explore Categories
            </h2>

            <p className="mt-4 text-slate-600">
              Versatile 3D printed products designed for gifting,
              decor, education, utility, and custom creativity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div
                key={category.title}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all"
              >
                <div className="text-4xl mb-4">
                  {category.emoji}
                </div>

                <h3 className="font-bold text-lg">
                  {category.title}
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  {category.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      <Categories
        // activeCategory={activeCategory}
        // setActiveCategory={setActiveCategory}
      />

      {/* Products */}
      <section
        id="products"
        className="py-20 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-4xl font-black">
              Trending Products
            </h2>

            <p className="mt-4 text-slate-600">
              Discover our most loved 3D printed
              creations.
            </p>
          </div>

          {/* IMPORTANT */}
          <ProductGrid category="" />
        </div>
      </section>

      {/* <section id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-4xl font-bold">
                Trending 3D Products
              </h2>

              <p className="text-slate-600 mt-2">
                Dynamic Pinterest-powered inspiration for your next
                custom print.
              </p>
            </div>
          </div>

          <ProductGrid />
        </div>
      </section> */}

      {/* Custom Order */}
      <section id="custom" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2rem] p-10 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-4xl font-bold">
                  Have an Idea? We’ll Print It.
                </h2>

                <p className="mt-4 text-slate-300 leading-8">
                  Share a sketch, Pinterest inspiration, image, or concept,
                  and we’ll transform it into a premium-quality 3D printed product.
                </p>

                <ul className="mt-6 space-y-3 text-slate-200">
                  <li>✓ Personalized product creation</li>
                  <li>✓ Preview before printing</li>
                  <li>✓ WhatsApp-based ordering</li>
                  <li>✓ Delivery support available</li>
                </ul>
              </div>

              <div className="bg-white/10 rounded-3xl p-8 border border-white/10">
                <h3 className="text-2xl font-semibold mb-4">
                  Start Your Custom Order
                </h3>

                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20I%20want%20to%20create%20a%20custom%203D%20printed%20product`}
                  target="_blank"
                  className="block text-center bg-brand-600 hover:bg-brand-700 py-4 rounded-2xl font-semibold shadow-glow"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="py-20 bg-slate-900 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold">
            Ready to Create Something Unique?
          </h2>

          <p className="mt-4 text-slate-300 max-w-2xl mx-auto">
            Browse inspiration, customize your design,
            and place your order directly through WhatsApp.
          </p>

          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
            target="_blank"
            className="inline-block mt-8 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold shadow-lg"
          >
            Order via WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 text-center text-sm">
        © 2026 shilpsmith 3D Studio.
        Crafted with precision using Bambu Lab printers.
      </footer>
    </main>
  );
}