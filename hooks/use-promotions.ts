import { useQuery } from "@tanstack/react-query";
import { fetchHomePromotions, type PublicPromotion } from "@/lib/api";

export type HomePromoCard = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  ctaLabel: string;
  listingId: string;
  href: string;
  imageUrl: string;
  promoPriceGnf?: number | null;
  compareAtPriceGnf?: number | null;
  discountPercent?: number | null;
  endsAt: string;
};

function toCard(p: PublicPromotion): HomePromoCard | null {
  const listingId =
    p.listingId ||
    (p.deepLink?.type === "LISTING" ? p.deepLink.id : null) ||
    "";
  if (!listingId && p.kind === "PRODUCT") return null;

  const shopId =
    p.sellerProfileId ||
    (p.deepLink?.type === "SHOP" ? p.deepLink.id : null) ||
    "";

  const href =
    listingId
      ? `/article/${listingId}`
      : shopId
        ? `/produits?seller=${encodeURIComponent(shopId)}`
        : "#";

  if (href === "#") return null;

  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    badge: p.badge,
    ctaLabel: p.ctaLabel || "Acheter",
    listingId: listingId || shopId,
    href,
    imageUrl: p.imageUrl || "",
    promoPriceGnf: p.promoPriceGnf,
    compareAtPriceGnf: p.compareAtPriceGnf,
    discountPercent: p.discountPercent,
    endsAt: p.endsAt,
  };
}

export function useHomePromotions(limit = 12) {
  return useQuery({
    queryKey: ["promotions", "home", "HOME_WEB", limit],
    queryFn: async () => {
      const res = await fetchHomePromotions({
        surface: "HOME_WEB",
        limit,
      });
      const cards = (res.items ?? [])
        .map(toCard)
        .filter((c): c is HomePromoCard => !!c)
        .filter((c) => new Date(c.endsAt).getTime() > Date.now() - 60_000);
      return {
        items: cards,
        serverNow: res.serverNow ?? new Date().toISOString(),
      };
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
