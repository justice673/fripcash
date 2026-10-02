"use client";

import { api } from "./client";

/** Surfaces that can render a promotion. */
export type PromotionSurface = "HOME_APP" | "HOME_WEB" | "BOTH";

export type PromotionKind = "PRODUCT" | "SHOP";

export type PromotionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "ENDED";

/** Admin / bilingual promotion shape. */
export type Promotion = {
  id: string;
  kind: PromotionKind;
  status: PromotionStatus;
  titleFr: string;
  titleEn: string;
  subtitleFr?: string | null;
  subtitleEn?: string | null;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  badgeFr?: string | null;
  badgeEn?: string | null;
  ctaLabelFr?: string | null;
  ctaLabelEn?: string | null;
  listingId?: string | null;
  sellerProfileId?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  promoPriceGnf?: number | null;
  compareAtPriceGnf?: number | null;
  startsAt: string;
  endsAt: string;
  surface: PromotionSurface;
  sortOrder: number;
  isActive: boolean;
  internalNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdByAdminId?: string | null;
};

export type PromotionListResponse = {
  items: Promotion[];
  nextCursor?: string | null;
  total?: number;
};

export type CreatePromotionBody = {
  kind: PromotionKind;
  titleFr: string;
  titleEn: string;
  subtitleFr?: string;
  subtitleEn?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  badgeFr?: string;
  badgeEn?: string;
  ctaLabelFr?: string;
  ctaLabelEn?: string;
  listingId?: string;
  sellerProfileId?: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  promoPriceGnf?: number | null;
  compareAtPriceGnf?: number | null;
  startsAt: string;
  endsAt: string;
  surface?: PromotionSurface;
  sortOrder?: number;
  isActive?: boolean;
  status?: PromotionStatus;
  internalNotes?: string;
};

export type UpdatePromotionBody = Partial<CreatePromotionBody>;

/** Locale-collapsed public carousel item (`x-locale`). */
export type PublicPromotion = {
  id: string;
  kind: PromotionKind;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  ctaLabel?: string | null;
  listingId?: string | null;
  sellerProfileId?: string | null;
  imageUrl?: string | null;
  promoPriceGnf?: number | null;
  compareAtPriceGnf?: number | null;
  discountPercent?: number | null;
  startsAt: string;
  endsAt: string;
  surface: PromotionSurface;
  sortOrder?: number;
  deepLink?: {
    type: "LISTING" | "SHOP";
    id: string;
  } | null;
};

export type PublicPromotionsResponse = {
  items: PublicPromotion[];
  serverNow?: string;
};

export async function fetchAdminPromotions(params?: {
  status?: PromotionStatus | "ALL";
  surface?: PromotionSurface | "ALL";
  q?: string;
  cursor?: string;
  limit?: number;
}) {
  const { data } = await api.get<PromotionListResponse | Promotion[]>(
    "/admin/promotions",
    { params }
  );
  if (Array.isArray(data)) return { items: data } as PromotionListResponse;
  return data;
}

export async function fetchAdminPromotion(id: string) {
  const { data } = await api.get<Promotion>(`/admin/promotions/${id}`);
  return data;
}

export async function createAdminPromotion(body: CreatePromotionBody) {
  const { data } = await api.post<Promotion>("/admin/promotions", body);
  return data;
}

export async function updateAdminPromotion(
  id: string,
  body: UpdatePromotionBody
) {
  const { data } = await api.patch<Promotion>(`/admin/promotions/${id}`, body);
  return data;
}

export async function deleteAdminPromotion(id: string) {
  const { data } = await api.delete(`/admin/promotions/${id}`);
  return data;
}

/** Public home carousel — eligible LIVE promos for a surface. */
export async function fetchHomePromotions(params?: {
  surface?: "HOME_APP" | "HOME_WEB";
  limit?: number;
}): Promise<PublicPromotionsResponse> {
  const { data } = await api.get<
    PublicPromotionsResponse | PublicPromotion[] | Promotion[]
  >("/promotions", {
    params: {
      surface: params?.surface ?? "HOME_WEB",
      limit: params?.limit ?? 12,
    },
  });

  if (Array.isArray(data)) {
    return {
      items: data.map(normalizePublicPromo),
      serverNow: new Date().toISOString(),
    };
  }

  return {
    items: (data.items ?? []).map(normalizePublicPromo),
    serverNow: data.serverNow ?? new Date().toISOString(),
  };
}

/** Accept locale-collapsed or bilingual admin-shaped rows. */
function normalizePublicPromo(
  raw: PublicPromotion | Promotion | Record<string, unknown>
): PublicPromotion {
  const r = raw as Record<string, unknown>;
  const title =
    (typeof r.title === "string" && r.title) ||
    (typeof r.titleFr === "string" && r.titleFr) ||
    (typeof r.titleEn === "string" && r.titleEn) ||
    "";
  const deepLink = r.deepLink as PublicPromotion["deepLink"] | undefined;
  const listingId =
    (typeof r.listingId === "string" && r.listingId) ||
    (deepLink?.type === "LISTING" ? deepLink.id : null) ||
    null;
  const sellerProfileId =
    (typeof r.sellerProfileId === "string" && r.sellerProfileId) ||
    (deepLink?.type === "SHOP" ? deepLink.id : null) ||
    null;

  return {
    id: String(r.id ?? ""),
    kind: (r.kind as PromotionKind) || "PRODUCT",
    title,
    subtitle:
      (r.subtitle as string | null | undefined) ??
      (r.subtitleFr as string | null | undefined) ??
      null,
    description:
      (r.description as string | null | undefined) ??
      (r.descriptionFr as string | null | undefined) ??
      null,
    badge:
      (r.badge as string | null | undefined) ??
      (r.badgeFr as string | null | undefined) ??
      null,
    ctaLabel:
      (r.ctaLabel as string | null | undefined) ??
      (r.ctaLabelFr as string | null | undefined) ??
      "Acheter",
    listingId,
    sellerProfileId,
    imageUrl: (r.imageUrl as string | null | undefined) ?? null,
    promoPriceGnf:
      typeof r.promoPriceGnf === "number" ? r.promoPriceGnf : null,
    compareAtPriceGnf:
      typeof r.compareAtPriceGnf === "number" ? r.compareAtPriceGnf : null,
    discountPercent:
      typeof r.discountPercent === "number" ? r.discountPercent : null,
    startsAt: String(r.startsAt ?? ""),
    endsAt: String(r.endsAt ?? ""),
    surface: (r.surface as PromotionSurface) || "BOTH",
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
    deepLink:
      deepLink ??
      (listingId
        ? { type: "LISTING", id: listingId }
        : sellerProfileId
          ? { type: "SHOP", id: sellerProfileId }
          : null),
  };
}
