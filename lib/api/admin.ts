"use client";

import { api } from "./client";

export async function fetchAdminMe() {
  const { data } = await api.get("/admin/me");
  return data;
}

export type PlatformSettings = {
  id: string;
  /** Decimal 0..1 (e.g. 0.08 = 8%) */
  commissionRateStandard: number;
  commissionRateProximite: number;
  disputeWindowHours?: number;
  minWithdrawalGnf?: number;
  maxListingPhotos?: number;
  maintenanceMode?: boolean;
  updatedAt?: string;
  /** Legacy — prefer commissionRateStandard */
  defaultCommissionBps?: number;
};

export async function fetchPlatformSettings() {
  const { data } = await api.get<PlatformSettings>("/admin/platform-settings");
  return data;
}

export async function updatePlatformSettings(
  body: Partial<{
    commissionRateStandard: number;
    commissionRateProximite: number;
    disputeWindowHours: number;
    minWithdrawalGnf: number;
    maxListingPhotos: number;
    maintenanceMode: boolean;
  }>
) {
  const { data } = await api.patch<PlatformSettings>(
    "/admin/platform-settings",
    body
  );
  return data;
}

export async function fetchAuditLogs() {
  const { data } = await api.get("/admin/audit-logs");
  return data;
}

export async function provisionAudience(
  userId: string,
  audience: "CONSUMER" | "ADMIN" | "COURIER"
) {
  const { data } = await api.post(
    `/admin/users/${userId}/provision-audience`,
    { audience }
  );
  return data;
}

/** Better Auth admin plugin — GET /auth/admin/list-users */
export type AuthAdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt?: string;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  role?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | null;
  preferredLocale?: string;
  userKind?: string;
  authAudience?: string;
};

export async function fetchAuthAdminUsers(params?: {
  limit?: number;
  offset?: number;
  searchValue?: string;
  searchField?: "email" | "name";
  searchOperator?: "contains" | "starts_with" | "ends_with";
}) {
  const { data } = await api.get<{
    users: AuthAdminUser[];
    total: number;
    limit?: number;
    offset?: number;
  }>("/auth/admin/list-users", {
    params: {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
      ...(params?.searchValue
        ? {
            searchValue: params.searchValue,
            searchField: params.searchField || "email",
            searchOperator: params.searchOperator || "contains",
          }
        : {}),
    },
  });
  return data;
}

export async function banAuthUser(userId: string, banReason?: string) {
  const { data } = await api.post("/auth/admin/ban-user", {
    userId,
    banReason: banReason || "Banned by admin",
  });
  return data;
}

export async function unbanAuthUser(userId: string) {
  const { data } = await api.post("/auth/admin/unban-user", { userId });
  return data;
}

export async function fetchAuthAdminUser(id: string) {
  const { data } = await api.get<AuthAdminUser>("/auth/admin/get-user", {
    params: { id },
  });
  return data;
}

export async function createAuthAdminUser(body: {
  email: string;
  password: string;
  name: string;
  role?: string | string[];
  data?: Record<string, unknown>;
}) {
  const { data } = await api.post<{ user?: AuthAdminUser } | AuthAdminUser>(
    "/auth/admin/create-user",
    body
  );
  return data;
}

export async function updateAuthAdminUser(
  userId: string,
  data: Record<string, unknown>
) {
  const { data: res } = await api.post<AuthAdminUser | { user: AuthAdminUser }>(
    "/auth/admin/update-user",
    { userId, data }
  );
  return res;
}

export async function setAuthAdminRole(
  userId: string,
  role: string | string[]
) {
  const { data } = await api.post<{ user: AuthAdminUser }>(
    "/auth/admin/set-role",
    { userId, role }
  );
  return data;
}

export async function setAuthAdminPassword(
  userId: string,
  newPassword: string
) {
  const { data } = await api.post("/auth/admin/set-user-password", {
    userId,
    newPassword,
  });
  return data;
}

export async function removeAuthAdminUser(userId: string) {
  const { data } = await api.post("/auth/admin/remove-user", { userId });
  return data;
}

export type AuthAdminSession = {
  id?: string;
  token?: string;
  userId?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function listAuthAdminUserSessions(userId: string) {
  const { data } = await api.post<{ sessions: AuthAdminSession[] }>(
    "/auth/admin/list-user-sessions",
    { userId }
  );
  return data;
}

export async function revokeAuthAdminUserSession(sessionToken: string) {
  const { data } = await api.post("/auth/admin/revoke-user-session", {
    sessionToken,
  });
  return data;
}

export async function revokeAuthAdminUserSessions(userId: string) {
  const { data } = await api.post("/auth/admin/revoke-user-sessions", {
    userId,
  });
  return data;
}

export async function impersonateAuthAdminUser(userId: string) {
  const { data } = await api.post("/auth/admin/impersonate-user", { userId });
  return data;
}

export async function stopAuthAdminImpersonating() {
  const { data } = await api.post("/auth/admin/stop-impersonating", {});
  return data;
}

export async function authAdminHasPermission(permissions: Record<string, string[]>) {
  const { data } = await api.post<{ success?: boolean; error?: unknown }>(
    "/auth/admin/has-permission",
    { permissions }
  );
  return data;
}

export async function hideReview(id: string) {
  const { data } = await api.post(`/admin/reviews/${id}/hide`);
  return data;
}

export async function hideComment(id: string) {
  const { data } = await api.post(`/admin/comments/${id}/hide`);
  return data;
}

export async function fetchSellerVerifications() {
  const { data } = await api.get("/admin/seller-verifications");
  return data;
}

export async function approveSellerVerification(
  id: string,
  reviewerNote?: string
) {
  const { data } = await api.post(
    `/admin/seller-verifications/${id}/approve`,
    { reviewerNote }
  );
  return data;
}

export async function rejectSellerVerification(
  id: string,
  reviewerNote?: string
) {
  const { data } = await api.post(
    `/admin/seller-verifications/${id}/reject`,
    { reviewerNote }
  );
  return data;
}

export async function fetchAdminOrgKyc() {
  const { data } = await api.get("/admin/kyc/organizations");
  return data;
}

export async function fetchAdminIndividualKyc() {
  const { data } = await api.get("/admin/kyc/individuals");
  return data;
}

export async function approveOrgKyc(id: string, reviewerNote?: string) {
  const { data } = await api.post(`/admin/kyc/organizations/${id}/approve`, {
    reviewerNote,
  });
  return data;
}

export async function rejectOrgKyc(id: string, reviewerNote?: string) {
  const { data } = await api.post(`/admin/kyc/organizations/${id}/reject`, {
    reviewerNote,
  });
  return data;
}

export async function requestOrgKycResubmission(
  id: string,
  reviewerNote?: string
) {
  const { data } = await api.post(
    `/admin/kyc/organizations/${id}/request-resubmission`,
    { reviewerNote }
  );
  return data;
}

export async function approveIndividualKyc(id: string, reviewerNote?: string) {
  const { data } = await api.post(`/admin/kyc/individuals/${id}/approve`, {
    reviewerNote,
  });
  return data;
}

export async function rejectIndividualKyc(id: string, reviewerNote?: string) {
  const { data } = await api.post(`/admin/kyc/individuals/${id}/reject`, {
    reviewerNote,
  });
  return data;
}

export async function resolveDispute(
  id: string,
  body:
    | {
        outcome: "refund_buyer" | "partial_refund" | "release_seller";
        amountGnf?: number;
        notes?: string;
      }
    | {
        /** @deprecated Prefer `outcome` (from-be). */
        resolution: "resolved_buyer" | "resolved_seller";
        note: string;
      }
) {
  const payload =
    "outcome" in body
      ? body
      : {
          outcome:
            body.resolution === "resolved_buyer"
              ? ("refund_buyer" as const)
              : ("release_seller" as const),
          notes: body.note,
        };
  const { data } = await api.post(`/admin/disputes/${id}/resolve`, payload);
  return data;
}

export async function fetchAdminOrders(params?: {
  status?: string;
  q?: string;
}) {
  const { data } = await api.get("/admin/orders", { params });
  return data;
}

export async function fetchAdminShippingRates() {
  const { data } = await api.get("/admin/shipping-rates");
  return data;
}

export async function upsertAdminShippingRate(body: {
  fromZoneCode: string;
  toZoneCode: string;
  feeGnf: number;
  isActive?: boolean;
}) {
  const { data } = await api.post("/admin/shipping-rates", body);
  return data;
}

/** Admin catalogue — all statuses (unlike public GET /listings = ACTIVE only). */
export type AdminListing = {
  id: string;
  sellerProfileId: string;
  categoryId: string | null;
  zoneId: string | null;
  title: string;
  description: string | null;
  netPriceGnf?: number;
  priceGnf: number;
  commissionRate?: number;
  commissionAmountGnf?: number;
  quantity: number;
  negotiable?: boolean;
  discountEnabled?: boolean;
  compareAtPriceGnf?: number | null;
  status: string;
  destination: string;
  conditionNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  media?: Array<{
    id?: string;
    storageKey?: string;
    url?: string | null;
    mimeType?: string;
    sortOrder?: number;
  }>;
  sellerProfile?: {
    id: string;
    userId?: string;
    sellerKind?: string;
    verificationStatus?: string;
  };
  category?: {
    id: string;
    nameFr?: string;
    nameEn?: string;
    parentId?: string | null;
  };
};

export async function fetchAdminListings(params?: {
  status?: string;
}) {
  const { data } = await api.get<
    AdminListing[] | { items?: AdminListing[]; data?: AdminListing[] }
  >("/admin/listings", {
    params: params?.status ? { status: params.status } : { status: "ALL" },
  });
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
  }
  return [];
}

/** Admin moderation — staff audience only (not owner PATCH /listings/:id). */
export async function updateAdminListing(
  id: string,
  body: Partial<{
    title: string;
    description: string;
    priceGnf: number;
    quantity: number;
    destination: string;
    categoryId: string;
    zoneId: string;
    conditionNote: string;
    status: string;
  }>
) {
  const { data } = await api.patch<AdminListing>(`/admin/listings/${id}`, body);
  return data;
}
