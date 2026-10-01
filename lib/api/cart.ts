"use client";

import { api } from "./client";

export type Cart = {
  id: string;
  userId: string;
  revision?: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    cartId: string;
    listingId: string;
    quantity: number;
    listing: {
      id: string;
      title: string;
      priceGnf: number;
      displayPriceGnf?: number;
      quantity: number;
      status: string;
      media?: Array<{ storageKey: string; url?: string | null }>;
    };
  }>;
};

export type FulfillmentMode = "pickup" | "courier" | "shopLocalDelivery";

export type CheckoutAddress = {
  name: string;
  phone: string;
  zoneId?: string;
  quartier?: string;
  manualAddress?: string;
  landmark?: string;
};

export type CheckoutQuote = {
  cartRevision: string;
  subtotalGnf: number;
  deliveryFeeGnf: number;
  grandTotalGnf: number;
  sellerGroups?: unknown[];
  fulfillmentMode: FulfillmentMode;
  address?: CheckoutAddress;
};

export type PaymentIntent = {
  id: string;
  status: "pending" | "succeeded" | "failed" | string;
  orderIds?: string[];
  grandTotalGnf?: number;
};

export async function getCart() {
  const { data } = await api.get<Cart>("/cart");
  return data;
}

export async function clearCart() {
  const { data } = await api.delete<Cart>("/cart");
  return data;
}

export async function addCartItem(listingId: string, quantity: number) {
  const { data } = await api.post<Cart>("/cart/items", {
    listingId,
    quantity,
  });
  return data;
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, {
    quantity,
  });
  return data;
}

export async function removeCartItem(itemId: string) {
  const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
  return data;
}

export async function validateCart() {
  const { data } = await api.post<{
    ok: boolean;
    errors?: Array<{ code?: string; message?: string; listingId?: string }>;
    cart?: Cart;
  }>("/cart/validate");
  return data;
}

export async function quoteCheckout(body: {
  cartRevision?: string;
  fulfillmentMode: FulfillmentMode;
  address: CheckoutAddress;
}) {
  const { data } = await api.post<CheckoutQuote>("/checkout/quote", body);
  return data;
}

export async function createPayment(
  body: {
    cartRevision: string;
    fulfillmentMode: FulfillmentMode;
    address: CheckoutAddress;
    orangeMoneyPhone: string;
    quoteGrandTotalGnf: number;
  },
  idempotencyKey: string
) {
  const { data } = await api.post<PaymentIntent>("/checkout/payments", body, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function getPayment(paymentIntentId: string) {
  const { data } = await api.get<PaymentIntent>(
    `/checkout/payments/${paymentIntentId}`
  );
  return data;
}

/** @deprecated Removed on Nest — use quoteCheckout + createPayment + getPayment. */
export async function checkout() {
  const { data } = await api.post<{
    paymentIntent?: unknown;
    orders?: unknown[];
  }>("/checkout");
  return data;
}
