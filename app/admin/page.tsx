"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import VariantsPanel from "../../components/admin/VariantsPanel";
import Modal from "../../components/admin/Modal";
import ProductImage from "../../components/shop/ProductImage";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  discountPrice: string | null;
  customizable: boolean;
  featured: boolean;
  stockStatus: string;
  stock: number;
  modelUrl: string | null;
  category: { slug: string; name: string };
  images: { url: string }[];
  createdAt: string;
}

interface Category {
  id: number;
  slug: string;
  name: string;
}

interface ProductForm {
  category: string;
  name: string;
  description: string;
  price: string;
  image: string;
  modelUrl: string;
  featured: boolean;
  customizable: boolean;
}

const EMPTY_FORM: ProductForm = {
  category: "",
  name: "",
  description: "",
  price: "",
  image: "",
  modelUrl: "",
  featured: false,
  customizable: false,
};

const PAGE_SIZE = 10;

export default function AdminProductsPage() {
  // -------- Data --------
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // -------- Pagination + filter --------
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  // -------- Modal + form --------
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // -------- Inline category create (inside modal) --------
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // ───────────── Fetchers ─────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    const res = await fetch(`/api/admin/products?${params}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load products");
      return;
    }
    setProducts(body.data.items);
    setTotal(body.data.total);
    setPages(body.data.pages);
  }, [categoryFilter, search, page]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load categories");
      return;
    }
    setCategories(body.data);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Snap back to page 1 when filters change so the user never lands on an
  // empty page after narrowing the result set.
  useEffect(() => {
    setPage(1);
  }, [categoryFilter, search]);

  // ───────────── Uploads ─────────────

  async function uploadFile(
    file: File,
    kind: "image" | "model"
  ): Promise<string | null> {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const url = kind === "model" ? "/api/upload?kind=model" : "/api/upload";
    const res = await fetch(url, { method: "POST", body: fd });
    const body = await res.json();
    setUploading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Upload failed");
      return null;
    }
    return body.data.url as string;
  }

  // ───────────── Modal lifecycle ─────────────

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCreatingCategory(false);
    setNewCategoryName("");
    setModalOpen(true);
  }

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setForm({
      category:
        typeof p.category === "string" ? p.category : p.category?.slug ?? "",
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.images?.[0]?.url ?? "",
      modelUrl: p.modelUrl ?? "",
      featured: p.featured,
      customizable: p.customizable,
    });
    setCreatingCategory(false);
    setNewCategoryName("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // ───────────── Submit + delete ─────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `/api/admin/products/${editingId}`
      : "/api/admin/products";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    setSaving(false);

    if (!res.ok || !body.success) {
      const detail = body?.error?.details?.[0];
      toast.error(
        detail
          ? `${detail.field ?? "field"}: ${detail.message}`
          : body?.error?.message ?? "Something went wrong"
      );
      return;
    }

    toast.success(editingId ? "Product updated" : "Product created");
    fetchProducts();
    closeModal();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success("Product deleted");
    fetchProducts();
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json();
    setSavingCategory(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Could not create category");
      return;
    }
    const created: Category = body.data;
    setCategories((c) => [...c, created]);
    setForm((f) => ({ ...f, category: created.slug }));
    setNewCategoryName("");
    setCreatingCategory(false);
    toast.success(`Created "${created.name}"`);
  }

  // ───────────── Render ─────────────

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-slate-500">
            {total} total · page {page} of {pages}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Add product
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or slug"
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  {search || categoryFilter
                    ? "No products match these filters."
                    : "No products yet — click \"+ Add product\" to create your first."}
                </td>
              </tr>
            )}
            {!loading &&
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 flex-none overflow-hidden rounded-xl">
                        <ProductImage
                          src={p.images?.[0]?.url}
                          alt={p.name}
                          productId={p.id}
                          aspectClass="h-full w-full"
                          variant="mini"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 line-clamp-1">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {p.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    ₹{p.price}
                    {p.discountPrice && (
                      <span className="ml-1 text-xs text-amber-600">
                        ₹{p.discountPrice}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.featured && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Featured
                        </span>
                      )}
                      {p.customizable && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700 ring-1 ring-brand-600/20">
                          Custom
                        </span>
                      )}
                      {p.modelUrl && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                          3D
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page === pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* ───────────── Add / Edit Modal ───────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit product" : "Add product"}
        subtitle={
          editingId
            ? "Update product details, image, model, and flags."
            : "Fill in the basics — variants can be added after creation."
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Category + inline create */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Category</span>
              <button
                type="button"
                onClick={() => setCreatingCategory((v) => !v)}
                className="text-xs font-medium text-slate-900 hover:underline"
              >
                {creatingCategory ? "Cancel" : "+ New category"}
              </button>
            </div>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="" disabled>
                {categories.length === 0
                  ? "No categories — add one →"
                  : "Select a category"}
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {creatingCategory && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name (e.g. Wall Art)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory(e as unknown as React.FormEvent);
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={(e) =>
                    handleCreateCategory(e as unknown as React.FormEvent)
                  }
                  disabled={savingCategory || !newCategoryName.trim()}
                  className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingCategory ? "Adding…" : "Add"}
                </button>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Product name</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Price (₹)</span>
            <input
              type="text"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Description</span>
            <textarea
              rows={4}
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Product image
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await uploadFile(file, "image");
                if (!url) return;
                setForm((f) => ({ ...f, image: url }));
                toast.success("Image uploaded");
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            {form.image && (
              <img
                src={form.image}
                alt="Preview"
                className="mt-2 h-24 w-24 rounded-xl border border-slate-200 object-cover"
              />
            )}
          </div>

          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              3D model (.glb / .gltf, optional)
            </span>
            <input
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await uploadFile(file, "model");
                if (!url) return;
                setForm((f) => ({ ...f, modelUrl: url }));
                toast.success("3D model uploaded");
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            {form.modelUrl && (
              <p className="mt-1 truncate text-xs text-slate-500">
                <a
                  href={form.modelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {form.modelUrl}
                </a>{" "}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, modelUrl: "" })}
                  className="ml-2 text-red-600 hover:underline"
                >
                  Remove
                </button>
              </p>
            )}
            {uploading && <p className="text-xs text-slate-500 mt-1">Uploading…</p>}
          </div>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.customizable}
              onChange={(e) =>
                setForm({ ...form, customizable: e.target.checked })
              }
            />
            <span className="text-sm">Customizable product</span>
          </label>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            <span className="text-sm">Featured (shows in the editor&apos;s-pick carousel)</span>
          </label>

          <div className="md:col-span-2 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Update product"
                  : "Create product"}
            </button>
          </div>
        </form>

        {/* Variants live in the same modal when editing — keeps everything
            for one product in one place. Hidden during create since the
            product doesn't have an id yet. */}
        {editingId && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <VariantsPanel productId={editingId} />
          </div>
        )}
      </Modal>
    </div>
  );
}
