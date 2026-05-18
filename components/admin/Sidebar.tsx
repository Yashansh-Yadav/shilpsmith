"use client";

import Link from "next/link";

import {
  LayoutDashboard,
  Package,
  FolderKanban,
  Users,
  Images,
  BarChart3,
  FileEdit
} from "lucide-react";

const links = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: FolderKanban
  },
  {
    label: "Leads",
    href: "/admin/leads",
    icon: Users
  },
  {
    label: "Media",
    href: "/admin/media",
    icon: Images
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3
  },
  {
    label: "Homepage CMS",
    href: "/admin/cms",
    icon: FileEdit
  }
];

export const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-slate-950 text-white hidden lg:flex flex-col">
      <div className="px-8 py-7 border-b border-slate-800">
        <h1 className="text-2xl font-bold">
          ShilpSmith
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Admin Dashboard
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-800 transition"
            >
              <Icon size={20} />

              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}