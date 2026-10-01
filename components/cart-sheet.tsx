"use client";

import Link from "next/link";
import { EmptyStateLottie } from "@/components/empty-state-lottie";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import {
  useServerCart,
  useRemoveCartItem,
  useUpdateCartItem,
  cartToUiItems,
} from "@/hooks/use-cart";
import { readToken } from "@/lib/api";
import { FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiArrowRight } from "react-icons/fi";

export function CartSheet() {
  const {
    items: localItems,
    cartOpen,
    closeCart,
    removeItem,
    updateQuantity,
    itemCount: localCount,
    subtotal: localSub,
    totalWithShipping: localTotal,
  } = useCartStore();
  const loggedIn = typeof window !== "undefined" && !!readToken();
  const { data: serverCart } = useServerCart();
  const removeServer = useRemoveCartItem();
  const updateServer = useUpdateCartItem();
  const serverItems = cartToUiItems(serverCart);
  const useServer = loggedIn && serverItems.length > 0;
  const items = useServer ? serverItems : localItems;

  const count = useServer
    ? items.reduce((s, i) => s + (i.quantity || 1), 0)
    : localCount();
  const sub = useServer
    ? items.reduce((s, i) => s + i.price * (i.quantity || 1), 0)
    : localSub();
  const total = useServer
    ? items.reduce((s, i) => s + i.priceWithShipping * (i.quantity || 1), 0)
    : localTotal();
  const shippingFees = total - sub;

  const onRemove = (item: (typeof items)[number]) => {
    if (useServer && "cartItemId" in item && item.cartItemId) {
      removeServer.mutate(String(item.cartItemId));
      return;
    }
    removeItem(item.id);
  };

  const onQty = (item: (typeof items)[number], quantity: number) => {
    if (useServer && "cartItemId" in item && item.cartItemId) {
      if (quantity <= 0) {
        removeServer.mutate(String(item.cartItemId));
        return;
      }
      updateServer.mutate({ itemId: String(item.cartItemId), quantity });
      return;
    }
    updateQuantity(item.id, quantity);
  };

  return (
    <Sheet open={cartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <FiShoppingBag className="h-5 w-5" />
            Mon panier ({count})
          </SheetTitle>
          <SheetDescription className="sr-only">
            Votre panier d&apos;achat
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-40 h-40 shrink-0">
              <EmptyStateLottie />
            </div>
            <div className="text-center">
              <p className="font-semibold text-primary">Ton panier est vide</p>
              <p className="text-sm text-primary mt-1">
                Parcours nos articles et trouve ton bonheur !
              </p>
            </div>
            <Button onClick={closeCart} className="rounded-full px-6" asChild>
              <Link href="/">Découvrir les articles</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
              {items.map((raw) => {
                const item = raw as {
                  id: string | number;
                  cartItemId?: string;
                  image: string;
                  brand: string;
                  condition: string;
                  size?: string;
                  price: number;
                  priceWithShipping: number;
                  href: string;
                  quantity: number;
                  title?: string;
                };
                return (
                <div
                  key={String(item.id)}
                  className="flex gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <Link
                    href={item.href}
                    onClick={closeCart}
                    className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.brand || item.title || "Article"}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.brand || item.title || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.condition}
                      {item.size ? ` · ${item.size}` : ""}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {item.price.toLocaleString("fr-FR")} GNF
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full border flex items-center justify-center"
                        onClick={() => onQty(raw, (item.quantity || 1) - 1)}
                      >
                        <FiMinus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-6 text-center">
                        {item.quantity || 1}
                      </span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full border flex items-center justify-center"
                        onClick={() => onQty(raw, (item.quantity || 1) + 1)}
                      >
                        <FiPlus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(raw)}
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="border-t pt-4 space-y-3 px-1 pb-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{sub.toLocaleString("fr-FR")} GNF</span>
              </div>
              {shippingFees > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Livraison (estim.)</span>
                  <span>{shippingFees.toLocaleString("fr-FR")} GNF</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{total.toLocaleString("fr-FR")} GNF</span>
              </div>
              <Button className="w-full rounded-full" asChild onClick={closeCart}>
                <Link href="/checkout">
                  Commander
                  <FiArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
