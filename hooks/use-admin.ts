import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminMe,
  fetchPlatformSettings,
  updatePlatformSettings,
  fetchAuditLogs,
  fetchSellerVerifications,
  approveSellerVerification,
  rejectSellerVerification,
  fetchAdminOrgKyc,
  fetchAdminIndividualKyc,
  approveOrgKyc,
  rejectOrgKyc,
  requestOrgKycResubmission,
  approveIndividualKyc,
  rejectIndividualKyc,
  resolveDispute,
  provisionAudience,
  hideReview,
  hideComment,
  createCategory,
  updateCategory,
  deleteCategory,
  createZone,
  updateZone,
  deleteZone,
  fetchCategories,
  fetchZones,
  listingImageUrl,
  fetchAdminListings,
  updateAdminListing,
  fetchAuthAdminUser,
  fetchAuthAdminUsers,
  createAuthAdminUser,
  updateAuthAdminUser,
  setAuthAdminRole,
  setAuthAdminPassword,
  removeAuthAdminUser,
  listAuthAdminUserSessions,
  revokeAuthAdminUserSession,
  revokeAuthAdminUserSessions,
  banAuthUser,
  unbanAuthUser,
} from "@/lib/api";

function asArray(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as any).items)) {
    return (data as any).items;
  }
  return [];
}

export function useAdminMe() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: fetchAdminMe,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: fetchPlatformSettings,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => asArray(await fetchAuditLogs()),
  });
}

export function useSellerVerifications() {
  return useQuery({
    queryKey: ["admin", "seller-verifications"],
    queryFn: async () => asArray(await fetchSellerVerifications()),
  });
}

export function useApproveSellerVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerNote }: { id: string; reviewerNote?: string }) =>
      approveSellerVerification(id, reviewerNote),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "seller-verifications"],
      });
    },
  });
}

export function useRejectSellerVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerNote }: { id: string; reviewerNote?: string }) =>
      rejectSellerVerification(id, reviewerNote),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "seller-verifications"],
      });
    },
  });
}

export function useAdminOrgKyc() {
  return useQuery({
    queryKey: ["admin", "kyc", "organizations"],
    queryFn: async () => asArray(await fetchAdminOrgKyc()),
  });
}

export function useAdminIndividualKyc() {
  return useQuery({
    queryKey: ["admin", "kyc", "individuals"],
    queryFn: async () => asArray(await fetchAdminIndividualKyc()),
  });
}

export function useReviewOrgKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reviewerNote,
    }: {
      id: string;
      action: "approve" | "reject" | "resubmit";
      reviewerNote?: string;
    }) => {
      if (action === "approve") return approveOrgKyc(id, reviewerNote);
      if (action === "reject") return rejectOrgKyc(id, reviewerNote);
      return requestOrgKycResubmission(id, reviewerNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "kyc"] });
    },
  });
}

export function useReviewIndividualKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reviewerNote,
    }: {
      id: string;
      action: "approve" | "reject";
      reviewerNote?: string;
    }) => {
      if (action === "approve") return approveIndividualKyc(id, reviewerNote);
      return rejectIndividualKyc(id, reviewerNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "kyc"] });
    },
  });
}

export function useResolveAdminDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      resolution,
      note,
    }: {
      id: string;
      resolution: "resolved_buyer" | "resolved_seller";
      note: string;
    }) => resolveDispute(id, { resolution, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "disputes"] });
    },
  });
}

export function useProvisionAudience() {
  return useMutation({
    mutationFn: ({
      userId,
      audience,
    }: {
      userId: string;
      audience: "CONSUMER" | "ADMIN" | "COURIER";
    }) => provisionAudience(userId, audience),
  });
}

export function useHideReview() {
  return useMutation({ mutationFn: (id: string) => hideReview(id) });
}

export function useHideComment() {
  return useMutation({ mutationFn: (id: string) => hideComment(id) });
}

export function useAdminCatalogCategories() {
  return useQuery({
    queryKey: ["admin", "catalog", "categories"],
    queryFn: fetchCategories,
  });
}

export function useAdminCatalogZones() {
  return useQuery({
    queryKey: ["admin", "catalog", "zones"],
    queryFn: fetchZones,
  });
}

export function useAdminCategoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };
  return {
    create: useMutation({ mutationFn: createCategory, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
        updateCategory(id, body as any),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteCategory(id),
      onSuccess: invalidate,
    }),
  };
}

export function useAdminZoneMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
  return {
    create: useMutation({ mutationFn: createZone, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
        updateZone(id, body as any),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteZone(id),
      onSuccess: invalidate,
    }),
  };
}

/** Dashboard overview — composed from live admin/catalog endpoints (no mock fallback). */
export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [listings, verifications, settings, auditLogs, categories, authUsers] =
        await Promise.all([
          fetchAdminListings({ status: "ALL" }).catch(
            () => [] as Awaited<ReturnType<typeof fetchAdminListings>>
          ),
          fetchSellerVerifications()
            .then(asArray)
            .catch(() => [] as any[]),
          fetchPlatformSettings().catch(() => null),
          fetchAuditLogs()
            .then(asArray)
            .catch(() => [] as any[]),
          fetchCategories().catch(() => [] as Awaited<ReturnType<typeof fetchCategories>>),
          fetchAuthAdminUsers({ limit: 100 })
            .then((r) => r.total ?? r.users?.length ?? 0)
            .catch(() => null as number | null),
        ]);

      const pendingStatuses = new Set(["DRAFT", "FLAGGED"]);
      const pendingListings = listings.filter((l) =>
        pendingStatuses.has(String(l.status).toUpperCase())
      );
      const activeListings = listings.filter(
        (l) => String(l.status).toUpperCase() === "ACTIVE"
      );
      const soldListings = listings.filter((l) => {
        const s = String(l.status).toUpperCase();
        return s === "SOLD" || s === "SOLD_OUT";
      });

      const pendingVerifications = verifications.filter((v: any) => {
        const status = String(
          v.status ?? v.verificationStatus ?? ""
        ).toUpperCase();
        return (
          !status ||
          status === "PENDING" ||
          status === "SUBMITTED" ||
          status === "IN_REVIEW"
        );
      });

      const categoryNameById = new Map(
        categories.map((c) => [c.id, c.nameFr || c.nameEn || c.slug])
      );

      const listingsByCategory = new Map<string, number>();
      for (const listing of listings) {
        const key = listing.categoryId
          ? categoryNameById.get(listing.categoryId) ||
            listing.category?.nameFr ||
            "Autre"
          : "Sans catégorie";
        listingsByCategory.set(key, (listingsByCategory.get(key) || 0) + 1);
      }

      const DEST_LABELS: Record<string, string> = {
        SECONDE_MAIN: "Seconde main",
        ARTICLES_NEUFS: "Articles neufs",
        QUARTIER_BOUTIQUES: "Quartier boutiques",
        ENSEIGNES: "Enseignes",
      };
      const listingsByDestination = new Map<string, number>();
      for (const listing of listings) {
        const key =
          DEST_LABELS[listing.destination] || listing.destination || "Autre";
        listingsByDestination.set(
          key,
          (listingsByDestination.get(key) || 0) + 1
        );
      }

      const catalogValueGnf = activeListings.reduce(
        (sum, l) => sum + (l.priceGnf || 0) * (l.quantity || 1),
        0
      );

      const commissionBps =
        settings && typeof settings === "object"
          ? Number((settings as any).defaultCommissionBps)
          : NaN;

      const activity = auditLogs.slice(0, 12).map((log: any) => ({
        id: log.id,
        type: mapAuditType(log.action, log.entityType),
        message: formatAuditMessage(log),
        time: formatRelativeFr(log.createdAt),
      }));

      return {
        totalListings: listings.length,
        activeListings: activeListings.length,
        soldListings: soldListings.length,
        draftListings: listings.filter(
          (l) => String(l.status).toUpperCase() === "DRAFT"
        ).length,
        pendingListings,
        pendingListingCount: pendingListings.length,
        pendingShopCount: pendingVerifications.length,
        catalogValueGnf,
        commissionRatePercent: Number.isFinite(commissionBps)
          ? commissionBps / 100
          : null,
        platformSettings: settings,
        categoryChart: [...listingsByCategory.entries()]
          .map(([category, volume]) => ({ category, volume }))
          .sort((a, b) => b.volume - a.volume),
        destinationChart: [...listingsByDestination.entries()]
          .map(([category, volume]) => ({ category, volume }))
          .sort((a, b) => b.volume - a.volume),
        activity,
        // Not exposed by API yet — keep explicit zeros (no mock)
        openDisputes: [] as any[],
        openDisputeCount: 0,
        escrowGmv: 0,
        escrowHoldCount: 0,
        totalUsers: authUsers,
        totalRevenue: null as number | null,
        activeDeliveries: 0,
      };
    },
    staleTime: 60_000,
  });
}

function mapAuditType(
  action?: string,
  entityType?: string
): "signup" | "sale" | "dispute" | "article" | "delivery" {
  const a = `${action || ""} ${entityType || ""}`.toLowerCase();
  if (a.includes("dispute")) return "dispute";
  if (a.includes("order") || a.includes("sale") || a.includes("checkout"))
    return "sale";
  if (a.includes("listing") || a.includes("article") || a.includes("comment"))
    return "article";
  if (a.includes("courier") || a.includes("delivery") || a.includes("mission"))
    return "delivery";
  if (a.includes("user") || a.includes("signup") || a.includes("provision"))
    return "signup";
  return "article";
}

function formatAuditMessage(log: any): string {
  const action = log.action || "action";
  const entity = log.entityType || "ressource";
  const id = log.entityId ? ` #${String(log.entityId).slice(-6)}` : "";
  return `${action} · ${entity}${id}`;
}

function formatRelativeFr(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  return `il y a ${Math.floor(diffSec / 86400)} j`;
}

/** @deprecated Prefer useAdminDashboard */
export function useAdminStats() {
  return useAdminDashboard();
}

export function useAdminChartData(_days?: number) {
  return useQuery({
    queryKey: ["admin", "chart-data", "transactions"],
    queryFn: async () => [] as { date: string; revenus: number; commissions: number }[],
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserChartData(range?: string) {
  return useQuery({
    queryKey: ["user", "chart-data", range],
    queryFn: async () => {
      const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
      return Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return {
          date: d.toISOString().slice(0, 10),
          ventes: 2 + (i % 5),
          revenus: 50000 + i * 12000,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => ({
      totalUsers: 12840,
      totalSold: 8920,
      avgRating: 4.8,
      totalArticles: 35620,
      users: 12840,
      articles: 35620,
      orders: 8920,
      rating: 4.8,
    }),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAdminUsers(params?: {
  status?: string;
  q?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const q = params?.q?.trim();
      const res = await fetchAuthAdminUsers({
        limit: 100,
        ...(q
          ? {
              searchValue: q,
              searchField: q.includes("@") ? "email" : "name",
              searchOperator: "contains" as const,
            }
          : {}),
      });

      const mapKindToRole = (u: {
        userKind?: string;
        authAudience?: string;
        role?: string | null;
      }) => {
        const kind = String(u.userKind || u.authAudience || "").toUpperCase();
        if (kind === "ADMIN" || u.role === "admin") return "admin";
        if (kind === "COURIER") return "livreur";
        return "acheteur";
      };

      let rows = (res.users || []).map((u) => {
        const parts = String(u.name || "").trim().split(/\s+/);
        const firstName = parts[0] || u.name || "—";
        const lastName = parts.slice(1).join(" ");
        const pseudo =
          u.email?.split("@")[0] ||
          u.phoneNumber?.replace(/\D/g, "").slice(-6) ||
          u.id.slice(-6);
        return {
          _id: u.id,
          id: u.id,
          firstName,
          lastName,
          pseudo,
          email: u.email,
          phone: u.phoneNumber || "—",
          avatar: u.image || undefined,
          status: u.banned ? "banned" : "active",
          role: mapKindToRole(u),
          authRole: u.role || "user",
          userKind: u.userKind,
          authAudience: u.authAudience,
          articlesCount: 0,
          createdAt: u.createdAt,
          raw: u,
        };
      });

      if (params?.status === "banned") {
        rows = rows.filter((r) => r.status === "banned");
      } else if (params?.status === "active") {
        rows = rows.filter((r) => r.status === "active");
      } else if (params?.status === "pending") {
        rows = rows.filter((r) => r.status === "pending");
      }

      // Client search also covers phone when Better Auth search is email/name only
      if (q && !q.includes("@")) {
        const qq = q.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.firstName.toLowerCase().includes(qq) ||
            r.lastName.toLowerCase().includes(qq) ||
            r.pseudo.toLowerCase().includes(qq) ||
            r.email.toLowerCase().includes(qq) ||
            String(r.phone).includes(q)
        );
      }

      return { data: rows, total: res.total ?? rows.length };
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (status === "banned") {
        return banAuthUser(id);
      }
      if (status === "active") {
        return unbanAuthUser(id);
      }
      throw new Error(`Statut non supporté: ${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
}

export function useCreateAuthAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAuthAdminUser,
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useUpdateAuthAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: Record<string, unknown>;
    }) => updateAuthAdminUser(userId, data),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useSetAuthAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: string | string[];
    }) => setAuthAdminRole(userId, role),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useSetAuthAdminPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      newPassword,
    }: {
      userId: string;
      newPassword: string;
    }) => setAuthAdminPassword(userId, newPassword),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useRemoveAuthAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeAuthAdminUser(userId),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useAuthAdminUserSessions(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "user-sessions", userId],
    queryFn: () => listAuthAdminUserSessions(userId!),
    enabled: !!userId,
  });
}

export function useRevokeAuthAdminUserSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionToken: string) =>
      revokeAuthAdminUserSession(sessionToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-sessions"] });
    },
  });
}

export function useRevokeAuthAdminUserSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => revokeAuthAdminUserSessions(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-sessions"] });
    },
  });
}

export function useAdminArticles(params?: {
  status?: string;
  q?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["admin", "articles", params],
    queryFn: async () => {
      const UI_TO_API_STATUS: Record<string, string> = {
        pending: "DRAFT",
        active: "ACTIVE",
        approved: "ACTIVE",
        rejected: "REJECTED",
        flagged: "FLAGGED",
        sold: "SOLD",
        draft: "DRAFT",
      };
      const apiStatus = params?.status
        ? UI_TO_API_STATUS[params.status.toLowerCase()] ||
          params.status.toUpperCase()
        : "ALL";

      let listings = await fetchAdminListings({ status: apiStatus });
      // Some BE builds ignore / mishandle ACTIVE filter — fall back to ALL.
      if (
        (!listings || listings.length === 0) &&
        apiStatus !== "ALL"
      ) {
        const all = await fetchAdminListings({ status: "ALL" });
        listings = all.filter(
          (l) => String(l.status || "").toUpperCase() === apiStatus
        );
      }
      if (!Array.isArray(listings)) listings = [];

      const mapUiStatus = (status: string) => {
        const s = status.toUpperCase();
        if (s === "DRAFT") return "pending";
        if (s === "ACTIVE") return "active";
        if (s === "SOLD" || s === "SOLD_OUT") return "sold";
        if (s === "REJECTED") return "rejected";
        if (s === "FLAGGED") return "flagged";
        return status.toLowerCase();
      };

      let rows = listings.map((l) => ({
        _id: l.id,
        id: l.id,
        title: l.title,
        description: l.description || "",
        price: Number(l.priceGnf ?? l.netPriceGnf) || 0,
        quantity: l.quantity,
        status: mapUiStatus(String(l.status || "")),
        apiStatus: String(l.status || "").toUpperCase(),
        destination: l.destination,
        listingDestination: l.destination,
        condition: l.conditionNote || "",
        images: (l.media || [])
          .map((m) => listingImageUrl(m))
          .filter(Boolean) as string[],
        seller: {
          id: l.sellerProfile?.id || l.sellerProfileId,
          userId: l.sellerProfile?.userId,
          kind: l.sellerProfile?.sellerKind || null,
          pseudo:
            l.sellerProfile?.sellerKind ||
            l.sellerProfileId?.slice(-6) ||
            "Vendeur",
          verificationStatus: l.sellerProfile?.verificationStatus || null,
        },
        category: l.category?.nameFr || null,
        createdAt: l.createdAt,
        publishedAt: l.publishedAt,
        raw: l,
      }));

      // Resolve seller display names (list payload only has sellerKind).
      const userIds = [
        ...new Set(
          rows
            .map((r) => r.seller.userId)
            .filter((id): id is string => !!id)
        ),
      ];
      if (userIds.length > 0) {
        const nameByUserId = new Map<string, string>();
        await Promise.all(
          userIds.map(async (userId) => {
            try {
              const user = await fetchAuthAdminUser(userId);
              if (user?.name) nameByUserId.set(userId, user.name);
            } catch {
              /* keep kind fallback */
            }
          })
        );
        rows = rows.map((r) => {
          const name = r.seller.userId
            ? nameByUserId.get(r.seller.userId)
            : undefined;
          if (!name) return r;
          return {
            ...r,
            seller: { ...r.seller, pseudo: name },
          };
        });
      }

      if (params?.q) {
        const q = params.q.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.seller.pseudo.toLowerCase().includes(q)
        );
      }
      return { data: rows, total: rows.length };
    },
  });
}

export function useUpdateArticleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const STATUS_MAP: Record<string, string> = {
        active: "ACTIVE",
        approved: "ACTIVE",
        rejected: "REJECTED",
        flagged: "FLAGGED",
        pending: "DRAFT",
        sold: "SOLD",
      };
      const apiStatus = STATUS_MAP[status.toLowerCase()] || status.toUpperCase();
      return updateAdminListing(id, { status: apiStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useAdminOrders(params?: {
  status?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: async () => ({
      data: [] as any[],
      total: 0,
      unavailableReason:
        "GET /admin/orders n’existe pas encore (seed ~20 commandes).",
    }),
  });
}

export function useAdminDisputes(params?: {
  status?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["admin", "disputes", params],
    queryFn: async () => ({
      data: [] as any[],
      total: 0,
      unavailableReason:
        "GET /admin/disputes n’existe pas encore (seed ~7 litiges). Resolve-only est branché.",
    }),
  });
}

export function useUpdateDisputeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) => {
      if (status === "resolved_buyer" || status === "resolved_seller") {
        return resolveDispute(id, {
          resolution: status,
          note: note || "Résolu",
        });
      }
      return { success: true, id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
