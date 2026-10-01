import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearServerCart,
  validateCart,
  quoteCheckout,
  createPayment,
  getPayment,
  listingImageUrl,
  readToken,
  type Cart,
  type CheckoutAddress,
  type FulfillmentMode,
} from "@/lib/api";

function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!readToken();
}

export function useServerCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: hasToken(),
    staleTime: 30_000,
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      quantity = 1,
    }: {
      listingId: string;
      quantity?: number;
    }) => addCartItem(listingId, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => updateCartItem(itemId, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}

export function useClearServerCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearServerCart,
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}

export function useValidateCart() {
  return useMutation({
    mutationFn: validateCart,
  });
}

export function useQuoteCheckout() {
  return useMutation({
    mutationFn: (body: {
      cartRevision?: string;
      fulfillmentMode: FulfillmentMode;
      address: CheckoutAddress;
    }) => quoteCheckout(body),
  });
}

/** Quote → createPayment → poll until terminal (from-be checkout handoff). */
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      fulfillmentMode: FulfillmentMode;
      address: CheckoutAddress;
      orangeMoneyPhone: string;
    }) => {
      const validated = await validateCart();
      if (validated && validated.ok === false) {
        const first = validated.errors?.[0];
        throw new Error(first?.message || "Panier invalide");
      }
      const quote = await quoteCheckout({
        fulfillmentMode: body.fulfillmentMode,
        address: body.address,
      });
      let payment = await createPayment(
        {
          cartRevision: quote.cartRevision,
          fulfillmentMode: body.fulfillmentMode,
          address: body.address,
          orangeMoneyPhone: body.orangeMoneyPhone,
          quoteGrandTotalGnf: quote.grandTotalGnf,
        },
        crypto.randomUUID()
      );
      for (let i = 0; i < 40; i++) {
        if (payment.status === "succeeded" || payment.status === "failed") break;
        await new Promise((r) => setTimeout(r, 2500));
        payment = await getPayment(payment.id);
      }
      if (payment.status === "failed") {
        throw new Error("Paiement échoué — réessaie.");
      }
      return {
        success: payment.status === "succeeded",
        paymentIntent: payment,
        orders: (payment.orderIds || []).map((id) => ({ id })),
        quote,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/** Map API cart to UI cart item shape used by local cart components. */
export function cartToUiItems(cart: Cart | undefined) {
  if (!cart?.items) return [];
  return cart.items.map((item) => ({
    id: item.listingId,
    cartItemId: item.id,
    image:
      listingImageUrl(item.listing.media?.[0]) ||
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop",
    brand: item.listing.title || "",
    title: item.listing.title || "",
    condition: "",
    size: undefined as string | undefined,
    price: item.listing.displayPriceGnf ?? item.listing.priceGnf,
    priceWithShipping: item.listing.displayPriceGnf ?? item.listing.priceGnf,
    href: `/article/${item.listingId}`,
    quantity: item.quantity,
  }));
}
