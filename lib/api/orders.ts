"use client";

import { api } from "./client";

export type OrderStatus =
  | "ORDERED"
  | "PAID"
  | "SELLER_NOTIFIED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "COURIER_ASSIGNED"
  | "COLLECTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FUNDS_RELEASED"
  | "FEEDBACK_PENDING"
  | "DISPUTED"
  | "REFUNDED";

export type OrderListAs = "buyer" | "seller";

/** Prefer `GET /orders?as=` (from-be). Falls back to legacy purchases/sales. */
export async function fetchOrders(params?: {
  as?: OrderListAs;
  filter?: string;
  q?: string;
}) {
  try {
    const { data } = await api.get("/orders", {
      params: {
        as: params?.as,
        filter: params?.filter,
        q: params?.q,
      },
    });
    return data;
  } catch {
    if (params?.as === "seller") return fetchSales();
    return fetchPurchases();
  }
}

export async function fetchPurchases() {
  const { data } = await api.get("/orders/purchases");
  return data;
}

export async function fetchSales() {
  const { data } = await api.get("/orders/sales");
  return data;
}

export async function fetchOrder(id: string) {
  const { data } = await api.get(`/orders/${id}`);
  return data;
}

export async function fetchOrderTimeline(id: string) {
  const { data } = await api.get(`/orders/${id}/timeline`);
  return data;
}

/** @deprecated Prefer action routes (`prepareOrder`, `confirmReceipt`, …). */
export async function transitionOrderStatus(
  id: string,
  body: { status: OrderStatus; note?: string }
) {
  const { data } = await api.patch(`/orders/${id}/status`, body);
  return data;
}

export async function prepareOrder(id: string) {
  const { data } = await api.post(`/orders/${id}/prepare`);
  return data;
}

export async function readyOrder(id: string) {
  const { data } = await api.post(`/orders/${id}/ready`);
  return data;
}

export async function confirmHandoff(id: string, code?: string) {
  const { data } = await api.post(`/orders/${id}/confirm-handoff`, {
    ...(code ? { code } : {}),
  });
  return data;
}

export async function confirmReceipt(id: string) {
  const { data } = await api.post(`/orders/${id}/confirm-receipt`);
  return data;
}

export async function rateOrder(
  id: string,
  body: { rating: number; comment?: string }
) {
  const { data } = await api.post(`/orders/${id}/ratings`, body);
  return data;
}

export async function sellerRefundOrder(id: string) {
  const { data } = await api.post(`/orders/${id}/seller-refund`);
  return data;
}

export async function markOrderCollected(id: string) {
  const { data } = await api.post(`/orders/${id}/collected`);
  return data;
}

export async function markOrderInTransit(id: string) {
  const { data } = await api.post(`/orders/${id}/in-transit`);
  return data;
}

export async function markOrderDelivered(id: string) {
  const { data } = await api.post(`/orders/${id}/delivered`);
  return data;
}

export async function openDispute(orderId: string, reason: string) {
  const { data } = await api.post(`/orders/${orderId}/disputes`, { reason });
  return data;
}

export async function fetchInvoiceReceipt(id: string) {
  const { data } = await api.get<{ url?: string; receiptUrl?: string }>(
    `/invoices/${id}/receipt`
  );
  return data;
}
