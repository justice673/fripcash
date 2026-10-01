"use client";

import { api } from "./client";
import type { ListingDestination } from "./catalog";

export type ListingStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SOLD"
  | "SOLD_OUT"
  | "REJECTED"
  | "FLAGGED"
  | "ARCHIVED";

export type ListingMedia = {
  id: string;
  listingId: string;
  /** Cloudinary public_id (or legacy MinIO object key). */
  storageKey: string;
  /** Prefer this for display — Cloudinary secure_url when set. */
  url?: string | null;
  mimeType: string;
  sortOrder: number;
};

export type Listing = {
  id: string;
  sellerProfileId: string;
  categoryId: string | null;
  zoneId: string | null;
  title: string;
  description: string | null;
  /** What the seller receives (net). */
  netPriceGnf: number;
  /** Buyer display / pay price (= net + commission). Prefer displayPriceGnf. */
  priceGnf: number;
  /** Canonical buyer price from Nest (from-be). */
  displayPriceGnf?: number;
  /** Snapshotted rate 0..1 at create / price update. */
  commissionRate: number;
  commissionAmountGnf: number;
  quantity: number;
  negotiable: boolean;
  discountEnabled: boolean;
  compareAtPriceGnf: number | null;
  status: ListingStatus;
  destination: ListingDestination;
  conditionNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  media?: ListingMedia[];
  /** Public DTO seller blob (from-be). */
  seller?: {
    id?: string;
    name?: string | null;
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    rating?: number;
    reviewCount?: number;
    reviewsCount?: number;
  } | null;
  sellerProfile?: {
    id: string;
    userId: string;
    displayName?: string | null;
    bio?: string | null;
  } | null;
};

/**
 * Display URL for a listing photo.
 * Prefer `media.url` (Cloudinary). Fall back to MinIO base + storageKey.
 */
export function listingImageUrl(
  mediaOrKey?:
    | { storageKey?: string | null; url?: string | null }
    | string
    | null
): string | null {
  if (!mediaOrKey) return null;
  if (typeof mediaOrKey === "object") {
    if (mediaOrKey.url) return mediaOrKey.url;
    return listingImageUrl(mediaOrKey.storageKey ?? null);
  }
  const storageKey = mediaOrKey;
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${storageKey.replace(/^\//, "")}`;
}

export async function attachListingMedia(
  listingId: string,
  body: {
    publicId: string;
    url: string;
    mimeType?: string;
    sortOrder?: number;
  }
) {
  const { data } = await api.post<ListingMedia>(
    `/listings/${listingId}/media`,
    {
      publicId: body.publicId,
      url: body.url,
      mimeType: body.mimeType || "image/jpeg",
      sortOrder: body.sortOrder ?? 0,
    }
  );
  return data;
}

export async function replaceListingMedia(
  listingId: string,
  mediaId: string,
  body: {
    publicId: string;
    url: string;
    mimeType?: string;
    sortOrder?: number;
  }
) {
  const { data } = await api.patch<ListingMedia>(
    `/listings/${listingId}/media/${mediaId}`,
    {
      publicId: body.publicId,
      url: body.url,
      mimeType: body.mimeType || "image/jpeg",
      sortOrder: body.sortOrder ?? 0,
    }
  );
  return data;
}

export async function deleteListingMedia(listingId: string, mediaId: string) {
  const { data } = await api.delete(`/listings/${listingId}/media/${mediaId}`);
  return data;
}

export async function fetchListings(params?: {
  destination?: string;
  categoryId?: string;
  sellerId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: string;
  cursor?: string;
  limit?: number;
}) {
  const { data } = await api.get<
    { items?: Listing[]; nextCursor?: string | null } | Listing[]
  >("/listings", {
    params: {
      inStockOnly: true,
      sort: "newest",
      limit: 20,
      ...params,
    },
  });
  if (Array.isArray(data)) return data as Listing[];
  if (data && Array.isArray(data.items)) return data.items;
  return [] as Listing[];
}

export async function fetchMyListings(params?: {
  status?: string;
}): Promise<Listing[]> {
  const { data } = await api.get<{ items?: Listing[] } | Listing[]>(
    "/me/listings",
    { params }
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export async function fetchMyListing(id: string) {
  const { data } = await api.get<Listing>(`/me/listings/${id}`);
  return data;
}

export async function fetchListing(id: string) {
  const { data } = await api.get<Listing>(`/listings/${id}`);
  return data;
}

/** Light create — never send `destination` (server assigns from seller profile). */
export async function createListing(body: {
  title: string;
  description?: string;
  netPriceGnf: number;
  stock?: number;
  /** @deprecated Prefer `stock` (from-be). Mapped to stock if stock omitted. */
  quantity?: number;
  categoryId?: string;
  subcategoryId?: string;
  zoneId?: string;
  conditionCode?: string;
  conditionNote?: string;
  shippingCostGnf?: number;
  colors?: string[];
  brand?: string;
  size?: string;
  negotiable?: boolean;
  publish?: boolean;
  discountEnabled?: boolean;
  compareAtPriceGnf?: number | null;
}) {
  const { quantity, stock, ...rest } = body;
  const { data } = await api.post<Listing>("/listings", {
    ...rest,
    stock: stock ?? quantity ?? 1,
  });
  return data;
}

export async function updateListing(
  id: string,
  body: Partial<{
    title: string;
    description: string;
    categoryId: string;
    subcategoryId: string;
    zoneId: string;
    conditionNote: string;
    conditionCode: string;
    negotiable: boolean;
    discountEnabled: boolean;
    compareAtPriceGnf: number | null;
    brand: string;
    size: string;
    shippingCostGnf: number;
    colors: string[];
  }>
) {
  const { data } = await api.patch<Listing>(`/listings/${id}`, body);
  return data;
}

export async function updateListingPrice(id: string, netPriceGnf: number) {
  const { data } = await api.post<Listing>(`/listings/${id}/price`, {
    netPriceGnf,
  });
  return data;
}

export async function updateListingStock(id: string, stock: number) {
  const { data } = await api.post<Listing>(`/listings/${id}/stock`, { stock });
  return data;
}

export async function publishListing(id: string) {
  const { data } = await api.post<Listing>(`/listings/${id}/publish`);
  return data;
}

export async function hideListing(id: string) {
  const { data } = await api.post<Listing>(`/listings/${id}/hide`);
  return data;
}

export async function deleteListing(id: string) {
  const { data } = await api.delete(`/listings/${id}`);
  return data;
}

export async function fetchListingComments(listingId: string) {
  const { data } = await api.get(`/listings/${listingId}/comments`);
  return data;
}

export async function createListingComment(
  listingId: string,
  body: { body: string; parentId?: string }
) {
  const { data } = await api.post(`/listings/${listingId}/comments`, body);
  return data;
}

export async function fetchListingReviews(listingId: string) {
  const { data } = await api.get(`/listings/${listingId}/reviews`);
  return data;
}

export async function fetchSellerReviews(sellerProfileId: string) {
  const { data } = await api.get(`/sellers/${sellerProfileId}/reviews`);
  return data;
}

/** from-be orders: POST /orders/:id/ratings */
export async function createOrderReview(
  orderId: string,
  body: { rating: number; comment?: string; listingId?: string }
) {
  try {
    const { data } = await api.post(`/orders/${orderId}/ratings`, body);
    return data;
  } catch {
    const { data } = await api.post(`/orders/${orderId}/reviews`, body);
    return data;
  }
}
