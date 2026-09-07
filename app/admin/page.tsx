"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import VariantsPanel from "../../components/admin/VariantsPanel";
import Modal from "../../components/admin/Modal";
import ProductImage from "../../components/shop/ProductImage";
import RichTextEditor from "../../components/admin/RichTextEditor";
import {
  CUSTOMIZATION_CATALOG,
  MAX_COLOR_OPTIONS,
  type ColorOption,
  type CustomFieldsConfig,
} from "../../lib/customization";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  discountPrice: string | null;
  customizable: boolean;
  customFields: CustomFieldsConfig | null;
  featured: boolean;
  stockStatus: string;
  stock: number;
  modelUrl: string | null;
  deityId: number | null;
  category: { slug: string; name: string };
  images: { url: string }[];
  createdAt: string;
}

interface Category {
  id: number;
  slug: string;
  name: string;
}

interface DeityOption {
  id: number;
  key: string;
  nameEn: string;
}

interface ProductForm {
  category: string;
  name: string;
  description: string;
  price: string;
  images: string[];
  modelUrl: string;
  deityId: number | null;
  featured: boolean;
  customizable: boolean;
  customFields: CustomFieldsConfig;
}

const MAX_IMAGES = 10;

const EMPTY_FORM: ProductForm = {
  category: "",
  name: "",
  description: "",
  price: "",
  images: [],
  modelUrl: "",
  deityId: null,
  featured: false,
  customizable: false,
  customFields: {},
};

const PAGE_SIZE = 10;

// The Save button is pinned in the modal footer, outside the <form>, and
// reaches it via <button form={...}>.
const PRODUCT_FORM_ID = "admin-product-form";

// A colour row needs a name — the name is what the customer picks and what the
// order/packing slip shows; the hex only paints the swatch. Blank-named rows
// used to be filtered out silently here, which meant "pick a swatch, save" lost
// the colour with no error. Now the save is blocked and the row is called out.
function findBlankColorRow(
  config: CustomFieldsConfig
): { label: string; index: number } | null {
  for (const field of CUSTOMIZATION_CATALOG) {
    const options = config[field.key]?.options;
    if (!options) continue;
    const index = options.findIndex((o) => !o.name.trim());
    if (index !== -1) return { label: field.label, index };
  }
  return null;
}

export default function AdminProductsPage() {
  // -------- Data --------
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deities, setDeities] = useState<DeityOption[]>([]);
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

  const fetchDeities = useCallback(async () => {
    const res = await fetch("/api/admin/deities");
    const body = await res.json();
    if (!res.ok || !body.success) return; // non-fatal — deity link is optional
    setDeities(
      body.data.map((d: { id: number; key: string; nameEn: string }) => ({
        id: d.id,
        key: d.key,
        nameEn: d.nameEn,
      }))
    );
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchDeities();
  }, [fetchCategories, fetchDeities]);

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

  // Upload one or more selected images and append them to the gallery (in the
  // order they were chosen). First image in the list is the cover.
  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.error(`Up to ${MAX_IMAGES} images`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    if (picked.length < files.length) {
      toast.error(`Only the first ${picked.length} image(s) were added (max ${MAX_IMAGES})`);
    }
    let added = 0;
    for (const file of picked) {
      const url = await uploadFile(file, "image");
      if (url) {
        setForm((f) => ({ ...f, images: [...f.images, url] }));
        added++;
      }
    }
    if (added > 0) toast.success(`${added} image${added > 1 ? "s" : ""} uploaded`);
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  // ───────────── Customization fields ─────────────

  function toggleCustomField(key: string, enabled: boolean) {
    setForm((f) => {
      const next = { ...f.customFields };
      if (enabled) next[key] = next[key] ?? {};
      else delete next[key];
      return { ...f, customFields: next };
    });
  }

  function setCustomFieldPlaceholder(key: string, placeholder: string) {
    setForm((f) => ({
      ...f,
      customFields: {
        ...f.customFields,
        [key]: { ...f.customFields[key], placeholder },
      },
    }));
  }

  function setCustomFieldRequired(key: string, required: boolean) {
    setForm((f) => ({
      ...f,
      customFields: {
        ...f.customFields,
        [key]: { ...f.customFields[key], required },
      },
    }));
  }

  // ───────────── Colour palette (color-type fields) ─────────────

  // Always derive from the previous state — reading `form` from the closure
  // drops edits when two changes land before a re-render (fast typing, or
  // clicking "+ Add colour" twice).
  function setColorOptions(
    key: string,
    update: (current: ColorOption[]) => ColorOption[]
  ) {
    setForm((f) => ({
      ...f,
      customFields: {
        ...f.customFields,
        [key]: {
          ...f.customFields[key],
          options: update(f.customFields[key]?.options ?? []),
        },
      },
    }));
  }

  function addColorOption(key: string) {
    setColorOptions(key, (current) => {
      if (current.length >= MAX_COLOR_OPTIONS) {
        toast.error(`Up to ${MAX_COLOR_OPTIONS} colours`);
        return current;
      }
      return [...current, { name: "", hex: "#10b981" }];
    });
  }

  function updateColorOption(
    key: string,
    index: number,
    patch: Partial<ColorOption>
  ) {
    setColorOptions(key, (current) =>
      current.map((o, i) => (i === index ? { ...o, ...patch } : o))
    );
  }

  function removeColorOption(key: string, index: number) {
    setColorOptions(key, (current) => current.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    setForm((f) => {
      if (index === 0) return f;
      const arr = [...f.images];
      const [moved] = arr.splice(index, 1);
      return { ...f, images: [moved, ...arr] };
    });
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
      images: p.images?.map((im) => im.url) ?? [],
      modelUrl: p.modelUrl ?? "",
      deityId: p.deityId ?? null,
      featured: p.featured,
      customizable: p.customizable,
      customFields: (p.customFields as CustomFieldsConfig) ?? {},
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

    if (form.images.length === 0) {
      toast.error("Add at least one product image");
      return;
    }

    const blankColor = findBlankColorRow(form.customFields);
    if (blankColor) {
      toast.error(
        `${blankColor.label}: name colour #${blankColor.index + 1} (e.g. "Matte Black") or remove the row`
      );
      return;
    }

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
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {/* Lives outside <form>, so it submits via the form attribute. */}
            <button
              type="submit"
              form={PRODUCT_FORM_ID}
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
        }
      >
        <form
          id={PRODUCT_FORM_ID}
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
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

          <div className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Description</span>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm((f) => ({ ...f, description: html }))}
              resetKey={editingId ?? "new"}
              placeholder="Describe the product — use headings, bold, and bullet lists to keep it scannable."
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Product images{" "}
                <span className="text-slate-400">
                  ({form.images.length}/{MAX_IMAGES} · first is the cover)
                </span>
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || form.images.length >= MAX_IMAGES}
              onChange={async (e) => {
                await handleImageFiles(e.target.files);
                // Reset so re-selecting the same file fires onChange again.
                e.target.value = "";
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:opacity-50"
            />
            {form.images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {form.images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img
                      src={url}
                      alt={`Product image ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded-md bg-slate-900/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition group-hover:opacity-100">
                      {i !== 0 ? (
                        <button
                          type="button"
                          onClick={() => makeCover(i)}
                          className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 hover:bg-white"
                        >
                          Cover
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Deity (NFC idol) — optional
            </label>
            <select
              value={form.deityId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  deityId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {deities.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameEn} ({d.key})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Links this idol to a Darshan page at{" "}
              <code className="rounded bg-slate-100 px-1">/darshan/&lt;key&gt;</code>
              . Manage deities under{" "}
              <a href="/admin/deities" className="underline">
                Deities
              </a>
              .
            </p>
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

          {form.customizable && (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="mb-1 text-xs font-semibold text-slate-600">
                Customization fields
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Tick the fields customers can fill, set a placeholder/hint, and
                optionally mark required. Leave all unticked to use the default
                form.
              </p>
              <div className="space-y-2">
                {CUSTOMIZATION_CATALOG.map((field) => {
                  const enabled = !!form.customFields[field.key];
                  const cfg = form.customFields[field.key];
                  return (
                    <div
                      key={field.key}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              toggleCustomField(field.key, e.target.checked)
                            }
                          />
                          <span className="text-sm font-medium text-slate-800">
                            {field.label}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                            {field.type}
                          </span>
                        </label>
                        {enabled && (
                          <label className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={cfg?.required ?? false}
                              onChange={(e) =>
                                setCustomFieldRequired(field.key, e.target.checked)
                              }
                            />
                            Required
                          </label>
                        )}
                      </div>
                      {enabled && (
                        <input
                          type="text"
                          value={cfg?.placeholder ?? ""}
                          maxLength={120}
                          onChange={(e) =>
                            setCustomFieldPlaceholder(field.key, e.target.value)
                          }
                          placeholder={`Placeholder / hint (default: "${field.defaultPlaceholder}")`}
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                        />
                      )}

                      {enabled && field.type === "color" && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            Available colours
                          </p>
                          <div className="space-y-2">
                            {(cfg?.options ?? []).map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={opt.hex}
                                  aria-label={`Colour ${i + 1} swatch`}
                                  onChange={(e) =>
                                    updateColorOption(field.key, i, {
                                      hex: e.target.value,
                                    })
                                  }
                                  className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-200"
                                />
                                <input
                                  type="text"
                                  value={opt.name}
                                  maxLength={40}
                                  required
                                  onChange={(e) =>
                                    updateColorOption(field.key, i, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Colour name (e.g. Matte Black) — required"
                                  className={`flex-1 rounded-lg border px-3 py-1.5 text-sm ${
                                    opt.name.trim()
                                      ? "border-slate-200"
                                      : "border-red-300 bg-red-50/50"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeColorOption(field.key, i)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:border-red-300 hover:text-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addColorOption(field.key)}
                            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500"
                          >
                            + Add colour
                          </button>
                          {!(cfg?.options ?? []).length && (
                            <p className="mt-2 text-xs text-amber-700">
                              No colours added — this field stays hidden on the
                              product page until you add at least one.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            <span className="text-sm">Featured (shows in the editor&apos;s-pick carousel)</span>
          </label>

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
