import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchListing,
  fetchListings,
  fetchMyListings,
  createListing,
  updateListing,
  updateListingPrice,
  updateListingStock,
  publishListing,
  hideListing,
  deleteListing,
  attachListingMedia,
  listingImageUrl,
  uploadCatalogueImage,
  replaceListingMedia,
  fetchMe,
  fetchSales,
  fetchCategories,
  type Listing,
  type ListingDestination,
  type CatalogCategory,
  type Me,
} from "@/lib/api";
import { DEST_TO_API, DEST_TO_UI } from "@/lib/api/mappers";
import type { ListingDestination as UiDestination } from "@/lib/seller-domain";

export type DashboardArticle = {
  _id: string;
  title: string;
  brand?: string;
  description: string;
  images: string[];
  /** Display label (e.g. "Mode › Hommes") */
  category: string;
  /** Root category nameFr for filters (e.g. "Mode") */
  rootCategory: string;
  categoryId: string;
  subCategory?: string;
  /** Buyer display price (API `priceGnf`) */
  price: number;
  /** Seller net (API `netPriceGnf`) */
  netPrice: number;
  commissionRate: number;
  commissionAmount: number;
  negotiable: boolean;
  discountEnabled: boolean;
  compareAtPrice: number | null;
  shippingCost: number;
  condition: string;
  size?: string;
  color?: string;
  colors?: string[];
  stock: number;
  status: "active" | "pending" | "sold" | "rejected" | "flagged";
  seller: {
    _id: string;
    pseudo: string;
    firstName?: string;
    avatar?: string;
    rating?: number;
    reviewCount?: number;
    reviewsCount?: number;
  };
  favoritesCount: number;
  listingDestination: UiDestination;
  /** Nest destination enum (ENSEIGNES, …) for capability gates */
  destination?: string;
  createdAt: string;
};

export type ArticleFilters = {
  category?: string;
  subCategory?: string;
  itemType?: string;
  condition?: string;
  size?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  destination?: string;
};

function mapStatus(status: Listing["status"]): DashboardArticle["status"] {
  if (status === "ACTIVE") return "active";
  if (status === "DRAFT") return "pending";
  if (status === "SOLD" || status === "SOLD_OUT") return "sold";
  if (status === "REJECTED") return "rejected";
  if (status === "FLAGGED") return "flagged";
  return "active";
}

function categoryParts(
  categoryId: string | null | undefined,
  byId: Map<string, CatalogCategory>
): { label: string; root: string; sub?: string } {
  if (!categoryId) return { label: "Catalogue", root: "Catalogue" };
  const cat = byId.get(categoryId);
  if (!cat) return { label: "Catalogue", root: "Catalogue" };
  const name = cat.nameFr || cat.nameEn || cat.slug;
  if (cat.parentId) {
    const parent = byId.get(cat.parentId);
    if (parent) {
      const root = parent.nameFr || parent.nameEn || parent.slug;
      return { label: `${root} › ${name}`, root, sub: name };
    }
  }
  return { label: name, root: name };
}

/** Resolve URL/filter category names to catalog IDs (parent expands to all children). */
export function resolveCategoryFilterIds(
  byId: Map<string, CatalogCategory>,
  categoryName?: string,
  subCategoryName?: string
): string[] | undefined {
  if (!categoryName && !subCategoryName) return undefined;
  const all = [...byId.values()];
  const matchName = (c: CatalogCategory, name: string) => {
    const n = name.trim().toLowerCase();
    return (
      c.id === name ||
      c.slug?.toLowerCase() === n ||
      c.nameFr?.toLowerCase() === n ||
      c.nameEn?.toLowerCase() === n
    );
  };

  if (subCategoryName && categoryName) {
    const parent = all.find((c) => !c.parentId && matchName(c, categoryName));
    const leaf = all.find(
      (c) =>
        matchName(c, subCategoryName) &&
        (!parent || c.parentId === parent.id)
    );
    if (leaf) return [leaf.id];
  }

  if (subCategoryName) {
    const leaf = all.find((c) => matchName(c, subCategoryName));
    if (leaf) return [leaf.id];
  }

  if (!categoryName) return undefined;

  const hit = all.find((c) => matchName(c, categoryName));
  if (!hit) return undefined;
  if (!hit.parentId) {
    const children = all.filter((c) => c.parentId === hit.id).map((c) => c.id);
    // Parent + children so exact-parent listings also match
    return [hit.id, ...children];
  }
  return [hit.id];
}

export function listingToArticle(
  l: Listing,
  categoriesById?: Map<string, CatalogCategory>
): DashboardArticle {
  const images = (l.media || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => {
      // Prefer Cloudinary `url`. Skip legacy seed keys with no url (broken MinIO).
      if (m.url) return m.url;
      const key = m.storageKey || "";
      if (!key || key.startsWith("seed/")) return null;
      return listingImageUrl(m);
    })
    .filter((u): u is string => !!u);

  const parts = categoryParts(l.categoryId, categoriesById ?? new Map());

  const displayRaw = Number(
    (l as Listing & { displayPriceGnf?: number }).displayPriceGnf ?? l.priceGnf
  );
  const netPriceGnf = Number(l.netPriceGnf);
  const buyerPrice = Number.isFinite(displayRaw) ? displayRaw : 0;
  const netPrice = Number.isFinite(netPriceGnf) ? netPriceGnf : buyerPrice;

  const sellerBlob = l.seller ?? null;
  const sellerProfile = l.sellerProfile ?? null;
  const sellerPseudo =
    sellerBlob?.name ||
    sellerBlob?.displayName ||
    sellerBlob?.username ||
    sellerProfile?.displayName ||
    "vendeur";
  const sellerId =
    sellerBlob?.id || sellerProfile?.id || l.sellerProfileId || "";
  const sellerRating = Number(
    sellerBlob?.rating ??
      (sellerProfile as { rating?: number } | null)?.rating
  );
  const sellerReviews = Number(
    sellerBlob?.reviewCount ??
      sellerBlob?.reviewsCount ??
      (sellerProfile as { reviewCount?: number; reviewsCount?: number } | null)
        ?.reviewCount ??
      (sellerProfile as { reviewsCount?: number } | null)?.reviewsCount
  );

  return {
    _id: l.id,
    title: l.title,
    description: l.description || "",
    images,
    category: parts.label,
    rootCategory: parts.root,
    subCategory: parts.sub,
    categoryId: l.categoryId || "",
    price: buyerPrice,
    netPrice,
    commissionRate: Number(l.commissionRate) || 0,
    commissionAmount: Number(l.commissionAmountGnf) || 0,
    negotiable: l.negotiable === true,
    discountEnabled: l.discountEnabled === true,
    compareAtPrice: l.compareAtPriceGnf ?? null,
    shippingCost: Number(
      (l as Listing & { shippingCostGnf?: number }).shippingCostGnf ?? 0
    ) || 0,
    condition: l.conditionNote || "Bon état",
    stock: l.quantity ?? 1,
    status: mapStatus(l.status),
    seller: {
      _id: sellerId,
      pseudo: sellerPseudo,
      rating: Number.isFinite(sellerRating) ? sellerRating : 0,
      reviewCount: Number.isFinite(sellerReviews) ? sellerReviews : 0,
      reviewsCount: Number.isFinite(sellerReviews) ? sellerReviews : 0,
    },
    favoritesCount:
      typeof (l as unknown as { favoritesCount?: number }).favoritesCount ===
      "number"
        ? (l as unknown as { favoritesCount: number }).favoritesCount
        : 0,
    listingDestination:
      (l.destination &&
        (DEST_TO_UI[l.destination] as UiDestination)) ||
      "secondeMain",
    destination: l.destination,
    createdAt: l.publishedAt || l.createdAt || new Date().toISOString(),
  };
}

function asArraySafe(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  return [];
}

function cacheSellerProfileId(userId: string, profileId: string) {
  if (typeof window === "undefined" || !userId || !profileId) return;
  try {
    sessionStorage.setItem(`fripcash:sellerProfileId:${userId}`, profileId);
  } catch {
    /* ignore */
  }
}

function readCachedSellerProfileId(userId: string): string | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return sessionStorage.getItem(`fripcash:sellerProfileId:${userId}`);
  } catch {
    return null;
  }
}

/** Resolve seller profile id from /me (if present), sales, or session cache. */
async function resolveSellerProfileId(me: Me): Promise<string | null> {
  if (!me.seller) return null;

  const fromMe =
    (me.seller as { profileId?: string; id?: string }).profileId ||
    (me.seller as { profileId?: string; id?: string }).id ||
    null;
  if (fromMe) {
    cacheSellerProfileId(me.id, fromMe);
    return fromMe;
  }

  const cached = readCachedSellerProfileId(me.id);
  if (cached) return cached;

  const sales = asArraySafe(await fetchSales());
  const fromSales =
    sales[0]?.sellerProfileId || sales[0]?.seller?.id || null;
  if (fromSales) {
    cacheSellerProfileId(me.id, fromSales);
    return fromSales;
  }

  return null;
}

async function loadCategoryMap() {
  try {
    const rows = await fetchCategories();
    return new Map(rows.map((c) => [c.id, c]));
  } catch {
    return new Map<string, CatalogCategory>();
  }
}

export function useArticles(filters: ArticleFilters = {}) {
  return useQuery({
    queryKey: ["articles", filters],
    queryFn: async () => {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const dest =
        filters.destination &&
        (DEST_TO_API[filters.destination] || filters.destination);
      const catMap = await loadCategoryMap();
      const categoryIds = resolveCategoryFilterIds(
        catMap,
        filters.category,
        filters.subCategory
      );

      // API matches exact categoryId only — never pass a display name.
      // For parent categories (Mode), fetch all then filter to children.
      const apiCategoryId =
        categoryIds && categoryIds.length === 1 ? categoryIds[0] : undefined;

      const rows = await fetchListings({
        destination: dest,
        categoryId: apiCategoryId,
      });
      let mapped = rows.map((l) => listingToArticle(l, catMap));

      if (categoryIds && categoryIds.length > 0) {
        const allowed = new Set(categoryIds);
        mapped = mapped.filter((a) => allowed.has(a.categoryId));
      }

      if (filters.q) {
        const q = filters.q.toLowerCase();
        mapped = mapped.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q) ||
            (a.subCategory || "").toLowerCase().includes(q)
        );
      }
      if (filters.status === "active") {
        mapped = mapped.filter((a) => a.status === "active");
      }
      const start = (page - 1) * limit;
      const data = mapped.slice(start, start + limit);
      return { data, total: mapped.length, page, limit };
    },
  });
}

/** Live product search for the public navbar autocomplete. */
export function useArticleSearch(q: string, limit = 8) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ["articles", "search", trimmed, limit],
    queryFn: async () => {
      const [rows, catMap] = await Promise.all([
        fetchListings(),
        loadCategoryMap(),
      ]);
      const needle = trimmed.toLowerCase();
      const mapped = rows
        .map((l) => listingToArticle(l, catMap))
        .filter((a) => a.status === "active")
        .filter(
          (a) =>
            a.title.toLowerCase().includes(needle) ||
            a.description.toLowerCase().includes(needle) ||
            a.category.toLowerCase().includes(needle) ||
            (a.subCategory || "").toLowerCase().includes(needle)
        );
      return {
        data: mapped.slice(0, limit),
        total: mapped.length,
      };
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ["articles", id],
    queryFn: async () => {
      const [listing, catMap] = await Promise.all([
        fetchListing(id),
        loadCategoryMap(),
      ]);
      return listingToArticle(listing, catMap);
    },
    enabled: !!id,
  });
}

export function useArticlesByUser(userId: string) {
  return useQuery({
    queryKey: ["articles", "user", userId],
    queryFn: async () => {
      const [rows, catMap] = await Promise.all([
        fetchListings(),
        loadCategoryMap(),
      ]);
      return rows
        .filter((l) => l.sellerProfileId === userId)
        .map((l) => listingToArticle(l, catMap));
    },
    enabled: !!userId,
  });
}

export function useMyArticles(status?: string) {
  return useQuery({
    queryKey: ["my-articles", status],
    queryFn: async () => {
      const me = await fetchMe();
      if (!me.seller) return [] as DashboardArticle[];

      const [rows, catMap] = await Promise.all([
        fetchMyListings(status ? { status: status.toUpperCase() } : undefined),
        loadCategoryMap(),
      ]);
      return rows.map((l) => listingToArticle(l, catMap));
    },
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: Partial<DashboardArticle> & {
        categoryId?: string;
        imageFiles?: File[];
        netPrice?: number;
        negotiable?: boolean;
        discountEnabled?: boolean;
        compareAtPrice?: number | null;
      }
    ) => {
      const destination = (DEST_TO_API[body.listingDestination || "secondeMain"] ||
        "SECONDE_MAIN") as ListingDestination;
      const net =
        body.netPrice ??
        (body as { netPriceGnf?: number }).netPriceGnf ??
        body.price ??
        0;
      // Server assigns destination from seller profile — do not send it.
      void destination;
      const created = await createListing({
        title: body.title || "Nouvel article",
        description: body.description,
        netPriceGnf: Math.round(net),
        stock: Math.max(1, body.stock ?? 1),
        categoryId: body.categoryId || undefined,
        conditionNote: body.condition,
        negotiable: body.negotiable === true,
        discountEnabled: body.discountEnabled === true,
        compareAtPriceGnf:
          body.discountEnabled === true && body.compareAtPrice
            ? Math.round(body.compareAtPrice)
            : null,
      });
      if (created.sellerProfileId) {
        const me = await fetchMe().catch(() => null);
        if (me?.id) cacheSellerProfileId(me.id, created.sellerProfileId);
      }

      let files = body.imageFiles?.filter(Boolean) ?? [];
      if (files.length === 0) {
        throw new Error("Ajoute au moins une photo.");
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await uploadCatalogueImage(file, "listings");
        await attachListingMedia(created.id, {
          publicId: uploaded.public_id,
          url: uploaded.secure_url,
          mimeType: file.type || "image/jpeg",
          sortOrder: i,
        });
      }

      const refreshed = await fetchListing(created.id).catch(() => created);
      return { success: true, data: listingToArticle(refreshed) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      description?: string;
      price?: number;
      netPrice?: number;
      stock?: number;
      condition?: string;
      categoryId?: string;
      listingDestination?: string;
      status?: string;
      negotiable?: boolean;
      discountEnabled?: boolean;
      compareAtPrice?: number | null;
      imageFiles?: File[];
      [key: string]: unknown;
    }) => {
      const net =
        body.netPrice !== undefined
          ? body.netPrice
          : body.price !== undefined
            ? body.price
            : undefined;
      const patch: Parameters<typeof updateListing>[1] = {
        title: body.title,
        description: body.description,
        conditionNote: body.condition,
        categoryId: body.categoryId,
        negotiable:
          body.negotiable !== undefined ? body.negotiable === true : undefined,
        discountEnabled:
          body.discountEnabled !== undefined
            ? body.discountEnabled === true
            : undefined,
        compareAtPriceGnf:
          body.discountEnabled === false
            ? null
            : body.compareAtPrice !== undefined && body.compareAtPrice !== null
              ? Math.round(body.compareAtPrice)
              : body.discountEnabled === true && body.compareAtPrice
                ? Math.round(body.compareAtPrice)
                : undefined,
      };
      await updateListing(id, patch);
      if (net !== undefined) await updateListingPrice(id, Math.round(net));
      if (body.stock !== undefined) await updateListingStock(id, body.stock);
      if (body.status === "pending") await hideListing(id);
      if (body.status === "active") await publishListing(id);

      const files = body.imageFiles?.filter(Boolean) ?? [];
      if (files.length > 0) {
        const listing = await fetchListing(id);
        const existing = listing.media || [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploaded = await uploadCatalogueImage(file, "listings");
          const target = existing[i];
          if (target) {
            await replaceListingMedia(id, target.id, {
              publicId: uploaded.public_id,
              url: uploaded.secure_url,
              mimeType: file.type || "image/jpeg",
              sortOrder: i,
            });
          } else {
            await attachListingMedia(id, {
              publicId: uploaded.public_id,
              url: uploaded.secure_url,
              mimeType: file.type || "image/jpeg",
              sortOrder: existing.length + i,
            });
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteListing(id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
    },
  });
}
