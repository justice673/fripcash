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

export type Promotion = {
  id: string;
  kind: PromotionKind;
  status: PromotionStatus;
  /** Display title (FR primary marketplace). */
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
  /** Linked listing when kind=PRODUCT. */
  listingId?: string | null;
  /** Linked seller when kind=SHOP. */
  sellerProfileId?: string | null;
  /** Creative override (Cloudinary). Falls back to listing cover if null. */
  imageUrl?: string | null;
  imagePublicId?: string | null;
  /** Buyer-facing promo price (GNF). Optional — may snapshot from listing. */
  promoPriceGnf?: number | null;
  /** Strikethrough / was price (GNF). */
  compareAtPriceGnf?: number | null;
  /** Inclusive window — ISO-8601 with timezone (prefer UTC Z). */
  startsAt: string;
  endsAt: string;
  /** Where to show the carousel card. */
  surface: PromotionSurface;
  sortOrder: number;
  isActive: boolean;
  /** Internal admin-only notes. */
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

/** Public home carousel — app + web. */
export async function fetchHomePromotions(params?: {
  surface?: "HOME_APP" | "HOME_WEB";
  limit?: number;
}) {
  const { data } = await api.get<{ items: Promotion[] } | Promotion[]>(
    "/promotions",
    {
      params: {
        surface: params?.surface ?? "HOME_WEB",
        limit: params?.limit ?? 12,
      },
    }
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}
