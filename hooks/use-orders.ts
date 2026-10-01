import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrders,
  fetchOrder,
  prepareOrder,
  readyOrder,
  confirmHandoff,
  confirmReceipt,
  markOrderInTransit,
  markOrderDelivered,
  sellerRefundOrder,
  openDispute,
  fetchInvoiceReceipt,
  quoteCheckout,
  createPayment,
  getPayment,
  validateCart,
  type OrderStatus,
  type FulfillmentMode,
  type CheckoutAddress,
} from "@/lib/api";
import { ORDER_STATUS_TO_UI } from "@/lib/api/mappers";

function normalizeOrder(raw: any, role: "buyer" | "seller" = "buyer") {
  const status =
    ORDER_STATUS_TO_UI[raw.status] ||
    (typeof raw.status === "string" ? raw.status : "ordered");
  const escrowStatus =
    raw.escrowStatus ||
    (status === "fundsReleased" || status === "delivered"
      ? "released"
      : status === "refunded"
        ? "refunded"
        : "blocked");
  return {
    _id: raw.id || raw._id,
    id: raw.id || raw._id,
    article: raw.listing || raw.article || { title: "Article" },
    buyer: raw.buyer || { pseudo: "acheteur" },
    seller: raw.seller || { pseudo: "vendeur" },
    amount: raw.amountGnf ?? raw.amount ?? raw.totalGnf ?? 0,
    shippingCost: raw.shippingCostGnf ?? raw.shippingCost ?? 0,
    commission: raw.commissionGnf ?? raw.commission ?? 0,
    status,
    escrowStatus,
    deliveryMode:
      raw.deliveryMode ||
      (raw.fulfillmentMode === "pickup"
        ? "main-propre"
        : raw.fulfillmentMode === "shopLocalDelivery"
          ? "seller-delivery"
          : "buyer-delivery"),
    fulfillmentMode: raw.fulfillmentMode || "courier",
    paymentMethod: raw.paymentMethod || "mobile-money",
    courierName: raw.courierName ?? null,
    pickupCode: raw.pickupCode,
    disputeReason: raw.disputeReason,
    nextActions: raw.nextActions || [],
    timeline: raw.timeline || [],
    createdAt: raw.createdAt,
    role,
    raw,
  };
}

function asArray(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as any).items)) {
    return (data as any).items;
  }
  return [];
}

export function useMyOrders(params?: {
  type?: string;
  status?: string;
  /** When false, hide seller-side demo orders (buyer-only account). */
  isSeller?: boolean;
}) {
  return useQuery({
    queryKey: ["orders", params, "live", params?.isSeller ? "seller" : "buyer-only"],
    queryFn: async () => {
      const type = params?.type;
      let list: ReturnType<typeof normalizeOrder>[] = [];
      if (type === "sell") {
        list = asArray(await fetchOrders({ as: "seller" })).map((o) =>
          normalizeOrder(o, "seller")
        );
      } else if (type === "buy") {
        list = asArray(await fetchOrders({ as: "buyer" })).map((o) =>
          normalizeOrder(o, "buyer")
        );
      } else {
        const [purchases, sales] = await Promise.all([
          fetchOrders({ as: "buyer" }),
          params?.isSeller === false
            ? Promise.resolve([])
            : fetchOrders({ as: "seller" }),
        ]);
        list = [
          ...asArray(purchases).map((o) => normalizeOrder(o, "buyer")),
          ...asArray(sales).map((o) => normalizeOrder(o, "seller")),
        ];
      }
      if (params?.status) {
        list = list.filter((o) => o.status === params.status);
      }
      return list;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id, "live"],
    queryFn: async () => normalizeOrder(await fetchOrder(id)),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      fulfillmentMode: FulfillmentMode;
      address: CheckoutAddress;
      orangeMoneyPhone: string;
      cartRevision?: string;
    }) => {
      const validated = await validateCart();
      if (validated && validated.ok === false) {
        const first = validated.errors?.[0];
        throw new Error(first?.message || "Panier invalide");
      }
      const quote = await quoteCheckout({
        cartRevision: body.cartRevision,
        fulfillmentMode: body.fulfillmentMode,
        address: body.address,
      });
      const payment = await createPayment(
        {
          cartRevision: quote.cartRevision,
          fulfillmentMode: body.fulfillmentMode,
          address: body.address,
          orangeMoneyPhone: body.orangeMoneyPhone,
          quoteGrandTotalGnf: quote.grandTotalGnf,
        },
        crypto.randomUUID()
      );

      let current = payment;
      for (let i = 0; i < 40; i++) {
        if (
          current.status === "succeeded" ||
          current.status === "failed"
        ) {
          break;
        }
        await new Promise((r) => setTimeout(r, 2500));
        current = await getPayment(current.id);
      }
      if (current.status === "failed") {
        throw new Error("Paiement échoué — réessaie.");
      }
      return {
        success: current.status === "succeeded",
        data: {
          _id: current.orderIds?.[0] || current.id,
        },
        paymentIntent: current,
        orders: (current.orderIds || []).map((id) => ({ id })),
        quote,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; code?: string }) => {
      await confirmReceipt(id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useShipOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; trackingNumber?: string }) => {
      await markOrderInTransit(id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function usePrepareOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await prepareOrder(id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useReadyOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await readyOrder(id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useAssignCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      courierName?: string;
    }) => {
      // Courier assignment is courier-app driven; mark ready for pickup/handoff.
      await readyOrder(id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useTransitionOrder() {
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
      switch (status) {
        case "preparing":
          return prepareOrder(id);
        case "readyForPickup":
        case "courierAssigned":
          return readyOrder(id);
        case "inTransit":
          return markOrderInTransit(id);
        case "delivered":
          return markOrderDelivered(id);
        case "fundsReleased":
          return confirmReceipt(id);
        case "disputed":
          return openDispute(id, note || "Litige");
        case "refunded":
          return sellerRefundOrder(id);
        case "confirmHandoff":
          return confirmHandoff(id, note);
        default:
          throw new Error(`Transition non supportée: ${status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useOpenDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }) => openDispute(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useSellerRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => sellerRefundOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useInvoiceReceipt(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoiceReceipt(id),
    enabled: !!id,
  });
}

// silence unused OrderStatus import warning in some TS configs
export type { OrderStatus };
