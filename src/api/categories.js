// src/api/categories.js
import api from "./client";

export const categoriesApi = {
  /**
   * GET /categories
   * Backend returns: { data: { categories: [...] } }
   */
  getAll: async (params = {}) => {
    const { data } = await api.get("/categories", { params });
    // data.data = { categories: [...] }
    const payload = data?.data ?? data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.categories)) return payload.categories;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  },

  getBySlug: async (slug) => {
    const { data } = await api.get(`/categories/${slug}`);
    return data?.data?.category ?? data?.data ?? null;
  },

  /**
   * POST /categories/suggest
   * Backend returns: { data: { category: { id, name, slug, ... }, alreadyExists } }
   *
   * Always returns a valid { id, name, slug } — name falls back to the
   * string the caller passed so it is NEVER undefined.
   */
  suggest: async (name) => {
    const trimmed = (name ?? "").trim();
    if (!trimmed) throw new Error("Name required");

    const { data } = await api.post("/categories/suggest", { name: trimmed });
    const raw = data?.data?.category ?? data?.data ?? {};

    return {
      id: raw.id ?? `custom_${Date.now()}`,
      name: raw.name ?? trimmed,
      slug: raw.slug ?? "",
      alreadyExists: data?.data?.alreadyExists ?? false,
    };
    // ← No try/catch — let errors propagate so the modal can catch them
  },
};
