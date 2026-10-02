"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { useMe } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";

export interface Product {
  id: number | string;
  image: string;
  brand: string;
  condition: string;
  size?: string;
  price: number;
  priceWithShipping: number;
  /** Strikethrough when discountEnabled */
  compareAtPrice?: number | null;
  discountEnabled?: boolean;
  favorites: number;
  href: string;
  category?: string;
}

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: user } = useMe();
  const isLoggedIn = !!user;
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const isFavorited = favorites.some(
    (f: any) => (f.article?._id || f.article) === String(product.id)
  );

  // Listings API has no favoritesCount yet — bump locally when the viewer liked it.
  const favoritesDisplay = Math.max(
    product.favorites || 0,
    isFavorited ? 1 : 0
  );

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      toast("Connecte-toi pour ajouter aux favoris.", "info");
      router.push("/connexion");
      return;
    }
    toggleFavorite.mutate(
      { articleId: String(product.id), isFavorite: isFavorited },
      {
        onSuccess: () => {
          toast(
            isFavorited
              ? "Article retiré des favoris."
              : "Article ajouté aux favoris.",
            isFavorited ? "info" : "success"
          );
        },
        onError: () => {
          toast("Erreur lors de la mise à jour des favoris.", "error");
        },
      }
    );
  };

  return (
    <Link href={product.href} className="group block">
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.brand}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />

        {/* Favorite toggle button - top right */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={toggleFavorite.isPending}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ${
            isFavorited
              ? "bg-white text-red-500"
              : "bg-white/80 backdrop-blur-sm text-muted-foreground opacity-0 group-hover:opacity-100"
          } hover:scale-110 disabled:opacity-50`}
          aria-pressed={isFavorited}
          aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <FiHeart
            className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
          />
        </button>

        {/* Favorite count badge - bottom right */}
        <div
          className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2 py-1 text-xs shadow-sm ${
            isFavorited ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          <FiHeart
            className={`h-3.5 w-3.5 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
          />
          <span>{favoritesDisplay}</span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-2 space-y-0.5">
        <p className="text-sm text-foreground font-medium truncate">
          {product.brand}
          {product.condition && (
            <span className="text-muted-foreground font-normal">
              {" "}
              &middot; {product.condition}
            </span>
          )}
        </p>
        {product.size && (
          <p className="text-xs text-muted-foreground">{product.size}</p>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {(product.price ?? 0).toLocaleString("fr-FR")} GNF
            {product.discountEnabled &&
              product.compareAtPrice != null &&
              product.compareAtPrice > (product.price ?? 0) && (
                <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                  {product.compareAtPrice.toLocaleString("fr-FR")} GNF
                </span>
              )}
          </p>
          <p className="text-xs text-primary font-medium">
            {(product.priceWithShipping ?? product.price ?? 0).toLocaleString(
              "fr-FR"
            )}{" "}
            GNF incl.
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="block">
      <div className="aspect-square rounded-md bg-muted animate-pulse" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-3.5 w-1/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
