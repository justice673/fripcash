"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { useCartStore } from "@/stores/cart-store";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AppSheet } from "@/components/app-sheet";
import { ProductCard, ProductCardSkeleton, type Product } from "@/components/product-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FiHome,
  FiHeart,
  FiShare2,
  FiShield,
  FiStar,
  FiCheck,
  FiMessageCircle,
  FiSend,
  FiCamera,
  FiX,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiMaximize2,
} from "react-icons/fi";
import { IoStarSharp, IoStarOutline } from "react-icons/io5";
import { useArticle, useArticles } from "@/hooks/use-articles";
import { useArticleReviews, usePostReview } from "@/hooks/use-reviews";
import { useCreateOffer } from "@/hooks/use-offers";
import { useStartConversation } from "@/hooks/use-messages";
import { useCheckFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { useAddCartItem } from "@/hooks/use-cart";
import { useMe } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  canAddToCart,
  canMakeOffer,
  canMessageSeller,
} from "@/lib/marketplace-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function galleryThumbClass(selected: boolean) {
  return cn(
    "relative aspect-square rounded-lg overflow-hidden bg-muted shrink-0 transition-all duration-200",
    selected
      ? "opacity-100 ring-2 ring-foreground/90 ring-inset shadow-sm"
      : "opacity-55 hover:opacity-90 ring-1 ring-border/40 hover:ring-border"
  );
}

function ArticleDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-6 pb-28 lg:pb-20">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex gap-2 sm:gap-3">
              <Skeleton className="flex-1 aspect-[3/4] rounded-lg" />
              <div className="flex flex-col gap-2 w-16 sm:w-20 shrink-0">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-9 w-40" />
                  <Skeleton className="h-4 w-52" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Skeleton className="h-9 w-16 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4">
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="hidden lg:flex gap-3">
                <Skeleton className="h-12 flex-1 rounded-full" />
                <Skeleton className="h-12 flex-1 rounded-full" />
              </div>
            </div>
          </div>

          <section className="mt-16">
            <Skeleton className="h-7 w-48 mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        </div>
      </div>

      <Footer />
    </div>
  );
}

function mapArticleToProduct(article: any): Product {
  return {
    id: article._id,
    image: article.images?.[0] || "",
    brand: article.brand || article.title || "Article",
    condition: article.condition || "",
    size: article.size,
    price: article.price || 0,
    priceWithShipping: (article.price || 0) + (article.shippingCost || 0),
    compareAtPrice: article.compareAtPrice ?? null,
    discountEnabled: article.discountEnabled === true,
    favorites: article.favoritesCount || 0,
    href: `/article/${article._id}`,
    category: article.category,
  };
}

export default function ArticleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { addItem, openCart } = useCartStore();

  const router = useRouter();
  const { data: user } = useMe();
  const isLoggedIn = !!user;

  const marketplaceActor = {
    isLoggedIn,
    canBuy: user?.canBuy,
    isAdmin: user?.isAdmin,
    sellerProfileId:
      user?.seller?.profileId || user?.seller?.id || null,
  };

  const { data: article, isLoading } = useArticle(id);
  const { data: reviewsData } = useArticleReviews(id);
  const { data: similarData, isLoading: similarLoading } = useArticles({
    category: article?.category,
    limit: 6,
    status: "active",
  });
  const postReview = usePostReview();
  const createOffer = useCreateOffer();
  const startConversation = useStartConversation();
  const { data: isFavorite, isLoading: favLoading } = useCheckFavorite(id);
  const toggleFavorite = useToggleFavorite();
  const addCartItem = useAddCartItem();

  const reviews = reviewsData?.data || [];
  const avgRating = reviewsData?.avgRating || 0;
  const ratingBreakdown = reviewsData?.ratingBreakdown || [];

  const similarProducts: Product[] = (similarData?.data || [])
    .filter((a: any) => a._id !== id)
    .slice(0, 6)
    .map(mapArticleToProduct);

  const images = article?.images || [];
  const seller = typeof article?.seller === "object" ? article.seller : null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    setSelectedImage(0);
    setGalleryOpen(false);
  }, [id, images.length]);

  useEffect(() => {
    if (!galleryOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGalleryOpen(false);
      if (e.key === "ArrowLeft" && images.length > 1) {
        setSelectedImage((i) => (i - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        setSelectedImage((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [galleryOpen, images.length]);

  const activeSrc = images[selectedImage] || images[0] || "";

  const openGallery = (index?: number) => {
    if (!images.length) return;
    if (typeof index === "number") setSelectedImage(index);
    setGalleryOpen(true);
  };

  const handleAddToCart = async () => {
    if (!article) return;
    addItem({
      id: article._id,
      image: images[0] || "",
      brand: article.brand || article.title,
      condition: article.condition,
      size: article.size,
      price: article.price,
      priceWithShipping: article.price + (article.shippingCost || 0),
      href: `/article/${article._id}`,
    });
    if (isLoggedIn) {
      try {
        await addCartItem.mutateAsync({ listingId: article._id, quantity: 1 });
      } catch {
        /* keep local cart; checkout will retry sync */
      }
    }
    toast("Article ajouté au panier !", "success");
    openCart();
  };

  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerSent, setOfferSent] = useState(false);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const reviewImageInputRef = useRef<HTMLInputElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<number>(0);
  const [reviewsToShow, setReviewsToShow] = useState(3);
  const REVIEWS_PER_PAGE = 3;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingBreakdown.find((r: any) => r._id === star)?.count || reviews.filter((r: any) => r.rating === star).length,
  }));
  const photosCount = reviews.filter((r: any) => r.images && r.images.length > 0).length;

  const filteredReviews = reviewFilter === 0
    ? reviews
    : reviewFilter === -1
      ? reviews.filter((r: any) => r.images && r.images.length > 0)
      : reviews.filter((r: any) => r.rating === reviewFilter);
  const paginatedReviews = filteredReviews.slice(0, reviewsToShow);
  const hasMoreReviews = filteredReviews.length > reviewsToShow;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 800;
        const maxH = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW / w, maxH / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 4 - reviewImages.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const results: string[] = [];
    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await compressImage(file);
        results.push(dataUrl);
      } catch {
        toast("Erreur lors du chargement de l'image.", "error");
      }
    }
    if (results.length > 0) {
      setReviewImages((prev) => [...prev, ...results].slice(0, 4));
    }
    e.target.value = "";
  };

  const removeReviewImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostReview = () => {
    if (!isLoggedIn) {
      toast("Connecte-toi pour laisser un avis.", "info");
      router.push("/connexion");
      return;
    }
    if (!reviewText.trim() || reviewRating === 0) return;
    postReview.mutate(
      {
        articleId: id,
        rating: reviewRating,
        comment: reviewText.trim(),
        images: reviewImages.length > 0 ? reviewImages : undefined,
      },
      {
        onSuccess: () => {
          setReviewText("");
          setReviewRating(0);
          setReviewImages([]);
          toast("Ton avis a été publié !");
        },
        onError: () => {
          toast("Erreur lors de la publication de ton avis", "error");
        },
      }
    );
  };

  const handleSendOffer = () => {
    if (!offerPrice || Number(offerPrice) <= 0) return;
    if (!isLoggedIn) {
      toast("Connecte-toi pour faire une offre", "error");
      router.push("/connexion");
      return;
    }
    createOffer.mutate(
      { articleId: id, amount: Number(offerPrice) },
      {
        onSuccess: () => {
          setOfferSent(true);
          toast("Offre envoyée ! Le vendeur a été notifié.");
        },
        onError: (err: any) => {
          const code = err?.code || err?.body?.code;
          if (code === "LISTING_NOT_NEGOTIABLE") {
            toast("Cet article n’accepte pas les offres.", "error");
            return;
          }
          const msg = err?.message || "Erreur lors de l'envoi de l'offre";
          toast(msg, "error");
        },
      }
    );
  };

  const handleCloseOffer = () => {
    setOfferOpen(false);
    setTimeout(() => {
      setOfferSent(false);
      setOfferPrice("");
    }, 300);
  };

  const handleOpenMessage = () => {
    if (!isLoggedIn) {
      toast("Connecte-toi pour envoyer un message", "error");
      router.push("/connexion");
      return;
    }
    setMessageOpen(true);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    startConversation.mutate(
      { articleId: id, message: messageText.trim() },
      {
        onSuccess: (res: any) => {
          setMessageSent(true);
          toast("Message envoyé !");
          // Navigate to conversation after a short delay
          const convId = res?.data?._id;
          if (convId) {
            setTimeout(() => {
              router.push(`/dashboard/messages?conversation=${convId}`);
            }, 1500);
          }
        },
        onError: (err: any) => {
          const msg = err?.message || "Erreur lors de l'envoi du message";
          toast(msg, "error");
        },
      }
    );
  };

  const handleCloseMessage = () => {
    setMessageOpen(false);
    setTimeout(() => {
      setMessageSent(false);
      setMessageText("");
    }, 300);
  };

  const listingMeta = {
    destination: article?.destination || article?.listingDestination,
    sellerProfileId:
      typeof article?.seller === "object" ? article.seller?._id : null,
    negotiable: article?.negotiable === true,
  };
  const showOffer = canMakeOffer(marketplaceActor, listingMeta);
  const showCart = canAddToCart(marketplaceActor);
  const showMessage = canMessageSeller(marketplaceActor, listingMeta);

  if (isLoading) {
    return <ArticleDetailSkeleton />;
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold">Article non trouvé</p>
            <Link href="/produits" className="text-primary hover:underline text-sm mt-2 block">
              Retour aux produits
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <AppSheet />

      <main className="flex-1">
        <div className="container mx-auto px-4 pt-6 pb-28 lg:pb-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 overflow-x-auto">
            <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors shrink-0">
              <FiHome className="h-3.5 w-3.5" />
              Accueil
            </Link>
            <span>/</span>
            {article.category && (
              <>
                <Link href="/produits" className="hover:text-primary transition-colors shrink-0">
                  {article.category}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate">
              {article.brand || article.title}
            </span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery — big preview + clickable thumbs */}
            <div>
              <div className="flex gap-2 sm:gap-3">
                <div className="group relative flex-1 min-w-0 aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                  {activeSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeSrc}
                      alt={article.brand || article.title}
                      className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                      onClick={() => openGallery()}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <FiImage className="h-10 w-10 opacity-40" />
                    </div>
                  )}
                  {activeSrc && (
                    <button
                      type="button"
                      onClick={() => openGallery()}
                      className="absolute top-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-105 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Agrandir l'image"
                    >
                      <FiMaximize2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex flex-col gap-2 w-16 sm:w-20 shrink-0 max-h-[min(100%,32rem)] overflow-y-auto">
                    {images.map((img: string, i: number) => (
                      <button
                        key={`${img}-${i}`}
                        type="button"
                        onClick={() => setSelectedImage(i)}
                        onDoubleClick={() => openGallery(i)}
                        className={galleryThumbClass(selectedImage === i)}
                        aria-label={`Voir l'image ${i + 1}`}
                        aria-pressed={selectedImage === i}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`${article.title} ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {(article.price || 0).toLocaleString("fr-FR")} GNF
                  </p>
                  {article.discountEnabled &&
                    article.compareAtPrice != null &&
                    article.compareAtPrice > (article.price || 0) && (
                      <p className="text-base text-muted-foreground line-through mt-0.5">
                        {article.compareAtPrice.toLocaleString("fr-FR")} GNF
                      </p>
                    )}
                  <p className="text-sm text-primary font-medium mt-0.5">
                    {((article.price || 0) + (article.shippingCost || 0)).toLocaleString("fr-FR")} GNF frais de port inclus
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <button
                    disabled={toggleFavorite.isPending || favLoading}
                    onClick={() => {
                      if (!isLoggedIn) {
                        toast("Connecte-toi pour ajouter aux favoris.", "info");
                        router.push("/connexion");
                        return;
                      }
                      toggleFavorite.mutate(
                        { articleId: id, isFavorite: !!isFavorite },
                        {
                          onSuccess: () => {
                            toast(
                              isFavorite ? "Article retiré des favoris." : "Article ajouté aux favoris.",
                              isFavorite ? "info" : "success"
                            );
                          },
                          onError: () => {
                            toast("Erreur lors de la mise à jour des favoris.", "error");
                          },
                        }
                      );
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                      isFavorite
                        ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                        : "bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-primary/30"
                    }`}
                  >
                    <FiHeart className={`h-4 w-4 transition-all duration-200 ${isFavorite ? "fill-red-500 text-red-500 scale-110" : ""}`} />
                    <span>{Math.max(article.favoritesCount || 0, isFavorite ? 1 : 0)}</span>
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Lien copié !", "info"); }}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-primary/30 transition-all duration-200"
                    title="Partager"
                  >
                    <FiShare2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-4 space-y-3">
                <DetailRow label="Marque" value={article.brand || "—"} />
                <DetailRow label="État" value={article.condition || "—"} />
                {article.size && <DetailRow label="Taille" value={article.size} />}
                {(article.color || article.colors?.[0]) && (
                  <DetailRow
                    label="Couleur"
                    value={(article.color || article.colors?.[0]) as string}
                  />
                )}
                {article.category && <DetailRow label="Catégorie" value={article.category} />}
              </div>

              <div className="border-t border-border pt-4 mb-4">
                <p className="text-xs text-muted-foreground">
                  Ajouté &middot; {new Date(article.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{article.description || "Aucune description."}</p>
              </div>

              {/* Seller card */}
              {seller && (
                <div className="border border-border rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                      {seller.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={seller.avatar} alt={seller.pseudo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                          {(seller.pseudo || "?")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {seller.pseudo || seller.firstName || "Vendeur"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <FiStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium text-foreground">{seller.rating || 0}</span>
                        <span className="text-xs text-muted-foreground">
                          ({seller.reviewsCount ?? seller.reviewCount ?? 0} avis)
                        </span>
                      </div>
                    </div>
                    <Link href="#" className="text-xs font-medium text-primary hover:underline shrink-0">Voir le profil</Link>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-6">
                <FiShield className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Protection acheteur</p>
                  <p className="text-xs text-muted-foreground">Paiement sécurisé et remboursement garanti</p>
                </div>
              </div>

              {(showOffer || showCart) && (
                <div className="hidden lg:flex gap-3">
                  {showOffer && (
                    <button
                      onClick={() => {
                        if (!isLoggedIn) {
                          toast("Connecte-toi pour faire une offre", "error");
                          router.push("/connexion");
                          return;
                        }
                        setOfferOpen(true);
                      }}
                      className="flex-1 h-12 rounded-full border-2 border-primary text-primary font-semibold text-base hover:bg-primary/5 transition-colors"
                    >
                      Faire une offre
                    </button>
                  )}
                  {showCart && (
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
                    >
                      Ajouter au panier
                    </button>
                  )}
                </div>
              )}

              {showMessage && (
                <button
                  onClick={handleOpenMessage}
                  className="hidden lg:flex items-center justify-center gap-2 w-full mt-3 h-10 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <FiMessageCircle className="h-4 w-4" />
                  Envoyer un message
                </button>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <section className="mt-16">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-8">
              <div className="flex flex-col items-center sm:items-start shrink-0">
                <div className="text-5xl font-bold text-foreground tabular-nums">
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <IoStarSharp key={star} className={`h-4 w-4 ${star <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-muted-foreground/20 text-muted-foreground/20"}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{reviews.length} avis</p>
              </div>

              <div className="flex-1 space-y-1.5">
                {ratingCounts.map(({ star, count }) => {
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => { setReviewFilter(reviewFilter === star ? 0 : star); setReviewsToShow(REVIEWS_PER_PAGE); }}
                      className={`flex items-center gap-2 w-full group text-left transition-opacity ${reviewFilter !== 0 && reviewFilter !== star && reviewFilter !== -1 ? "opacity-40" : ""}`}
                    >
                      <span className="text-xs text-muted-foreground w-3 tabular-nums shrink-0">{star}</span>
                      <IoStarSharp className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right tabular-nums shrink-0">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button type="button" onClick={() => { setReviewFilter(0); setReviewsToShow(REVIEWS_PER_PAGE); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${reviewFilter === 0 ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                Tous ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((star) => {
                const cnt = ratingCounts.find((r) => r.star === star)?.count ?? 0;
                if (cnt === 0) return null;
                return (
                  <button key={star} type="button" onClick={() => { setReviewFilter(reviewFilter === star ? 0 : star); setReviewsToShow(REVIEWS_PER_PAGE); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${reviewFilter === star ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {star} <IoStarSharp className="h-3 w-3 fill-yellow-400 text-yellow-400" /> ({cnt})
                  </button>
                );
              })}
              {photosCount > 0 && (
                <button type="button" onClick={() => { setReviewFilter(reviewFilter === -1 ? 0 : -1); setReviewsToShow(REVIEWS_PER_PAGE); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${reviewFilter === -1 ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  <FiImage className="h-3 w-3" /> Avec photos ({photosCount})
                </button>
              )}
            </div>

            {/* Write a review */}
            <div className="border border-border rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Laisser un avis</h3>
              {!isLoggedIn ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Connecte-toi pour laisser un avis</p>
                  <Link href="/connexion" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    Se connecter
                  </Link>
                </div>
              ) : (
              <>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setReviewRating(star)} className="transition-transform hover:scale-110">
                    {star <= (hoverRating || reviewRating) ? <IoStarSharp className="h-6 w-6 fill-yellow-400 text-yellow-400" /> : <IoStarOutline className="h-6 w-6 text-muted-foreground/40" />}
                  </button>
                ))}
                {reviewRating > 0 && <span className="text-xs text-muted-foreground ml-2">{reviewRating}/5</span>}
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Partage ton expérience avec cet article..." rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              <div className="mt-3">
                {reviewImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {reviewImages.map((img, idx) => (
                      <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeReviewImage(idx)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <FiX className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => reviewImageInputRef.current?.click()} disabled={reviewImages.length >= 4}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <FiCamera className="h-4 w-4" />
                    <span>Ajouter une photo ({reviewImages.length}/4)</span>
                  </button>
                  <input ref={reviewImageInputRef} type="file" accept="image/*" multiple onChange={handleReviewImageUpload} className="hidden" />
                  <button onClick={handlePostReview} disabled={!reviewText.trim() || reviewRating === 0 || postReview.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <FiSend className="h-3.5 w-3.5" />
                    <span>{postReview.isPending ? "..." : "Publier"}</span>
                  </button>
                </div>
              </div>
              {reviewRating === 0 && reviewText.trim() && (
                <p className="text-xs text-muted-foreground mt-1.5">Sélectionne une note pour publier ton avis</p>
              )}
              </>
              )}
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {reviews.length === 0 ? "Aucun avis pour le moment. Sois le premier à donner ton avis !" : "Aucun avis pour ce filtre."}
                  </p>
                  {reviewFilter !== 0 && (
                    <button type="button" onClick={() => { setReviewFilter(0); setReviewsToShow(REVIEWS_PER_PAGE); }} className="text-xs text-primary hover:underline mt-2">Voir tous les avis</button>
                  )}
                </div>
              ) : (
                <>
                  {paginatedReviews.map((review: any) => (
                    <div key={review._id || review.id} className="border border-border rounded-xl p-4 transition-colors hover:border-border/80">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                          {review.user?.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={review.user.avatar} alt={review.user.pseudo || "User"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                              {(review.user?.pseudo || "?")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{review.user?.pseudo || "Utilisateur"}</p>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 mt-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <IoStarSharp key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted-foreground/20 text-muted-foreground/20"}`} />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                          {review.images && review.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {review.images.map((img: string, idx: number) => (
                                <button key={idx} type="button" onClick={() => setLightboxImage(img)} className="w-20 h-20 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={img} alt={`Photo avis ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-center gap-3 pt-2">
                    {hasMoreReviews && (
                      <button type="button" onClick={() => setReviewsToShow((prev) => prev + REVIEWS_PER_PAGE)}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        <FiChevronDown className="h-4 w-4" />
                        Voir plus d&apos;avis ({filteredReviews.length - reviewsToShow} restants)
                      </button>
                    )}
                    {reviewsToShow > REVIEWS_PER_PAGE && (
                      <button type="button" onClick={() => setReviewsToShow(REVIEWS_PER_PAGE)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Réduire</button>
                    )}
                  </div>
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    {Math.min(reviewsToShow, filteredReviews.length)} sur {filteredReviews.length} avis
                    {reviewFilter !== 0 && (
                      <> · <button type="button" onClick={() => { setReviewFilter(0); setReviewsToShow(REVIEWS_PER_PAGE); }} className="text-primary hover:underline">Effacer le filtre</button></>
                    )}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Similar Products */}
          <section className="mt-16">
            <h2 className="text-xl font-bold text-foreground mb-6">Articles similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similarLoading
                ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : similarProducts.length > 0
                  ? similarProducts.map((p) => <ProductCard key={p.id} product={p} />)
                  : <p className="col-span-full text-sm text-muted-foreground text-center py-8">Aucun article similaire pour le moment</p>
              }
            </div>
          </section>
        </div>
      </main>

      {/* Mobile sticky bottom bar */}
      {(showOffer || showCart || showMessage || isLoggedIn) && (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border p-3 flex gap-2 lg:hidden">
        {showOffer && (
          <button
            onClick={() => {
              if (!isLoggedIn) {
                toast("Connecte-toi pour faire une offre", "error");
                router.push("/connexion");
                return;
              }
              setOfferOpen(true);
            }}
            className="flex-1 h-12 rounded-full border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors"
          >
            Faire une offre
          </button>
        )}
        {showCart && (
          <button
            onClick={handleAddToCart}
            className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Ajouter au panier
          </button>
        )}
        <button
          disabled={toggleFavorite.isPending || favLoading}
          onClick={() => {
            if (!isLoggedIn) {
              toast("Connecte-toi pour ajouter aux favoris.", "info");
              router.push("/connexion");
              return;
            }
            toggleFavorite.mutate(
              { articleId: id, isFavorite: !!isFavorite },
              {
                onSuccess: () =>
                  toast(
                    isFavorite ? "Retiré des favoris." : "Ajouté aux favoris.",
                    isFavorite ? "info" : "success"
                  ),
                onError: () => toast("Erreur.", "error"),
              }
            );
          }}
          className={`h-12 w-12 rounded-full border flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 ${
            isFavorite
              ? "border-red-200 bg-red-50 text-red-500"
              : "border-border text-foreground hover:bg-muted"
          }`}
        >
          <FiHeart
            className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
          />
        </button>
        {showMessage && (
          <button
            onClick={handleOpenMessage}
            className="h-12 w-12 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <FiMessageCircle className="h-5 w-5" />
          </button>
        )}
      </div>
      )}

      {/* Offer Dialog */}
      <Dialog open={offerOpen} onOpenChange={(open) => !open && handleCloseOffer()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{offerSent ? "Offre envoyée !" : "Faire une offre"}</DialogTitle>
            <DialogDescription>
              {offerSent ? "Le vendeur a été notifié et te répondra bientôt." : `Prix actuel : ${(article.price || 0).toLocaleString("fr-FR")} GNF. Propose ton prix.`}
            </DialogDescription>
          </DialogHeader>
          {offerSent ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10"><FiCheck className="h-7 w-7 text-primary" /></div>
              <p className="text-sm text-muted-foreground text-center">
                Ton offre de <span className="font-semibold text-foreground">{Number(offerPrice).toLocaleString("fr-FR")} GNF</span> a été envoyée
                {seller && <> à <span className="font-semibold text-foreground">{seller.pseudo}</span></>}
              </p>
              <button onClick={handleCloseOffer} className="mt-2 h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Fermer</button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Ton prix (GNF)</label>
                <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder={`ex: ${((article.price || 0) * 0.8).toFixed(0)}`} min="1" step="0.01"
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" autoFocus />
                {offerPrice && Number(offerPrice) >= (article.price || 0) && (
                  <p className="text-xs text-muted-foreground mt-1">Ton offre est égale ou supérieure au prix demandé. Tu peux acheter directement !</p>
                )}
              </div>
              <button onClick={handleSendOffer} disabled={!offerPrice || Number(offerPrice) <= 0 || createOffer.isPending}
                className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {createOffer.isPending ? "Envoi en cours..." : "Envoyer l'offre"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={(open) => !open && handleCloseMessage()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messageSent ? "Message envoyé !" : "Envoyer un message"}</DialogTitle>
            <DialogDescription>
              {messageSent
                ? "Le vendeur recevra ton message. Tu seras redirigé vers la conversation."
                : `Envoie un message à ${seller?.pseudo || "le vendeur"} à propos de cet article.`}
            </DialogDescription>
          </DialogHeader>
          {messageSent ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <FiCheck className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">Ton message a été envoyé</p>
              <button onClick={handleCloseMessage} className="mt-2 h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Fermer
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Ton message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Bonjour, je suis intéressé(e) par votre article "${article?.brand || article?.title || ""}"...`}
                  rows={4}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || startConversation.isPending}
                className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FiSend className="h-4 w-4" />
                {startConversation.isPending ? "Envoi..." : "Envoyer le message"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product gallery lightbox */}
      {galleryOpen && activeSrc && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu de l'image"
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <p className="text-sm text-white/70 truncate max-w-[60%]">
              {article?.brand || article?.title}
              {images.length > 1 ? ` · ${selectedImage + 1}/${images.length}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setGalleryOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Fermer"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center min-h-0 px-4 pb-4">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedImage((i) => (i - 1 + images.length) % images.length)
                }
                className="absolute left-2 sm:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Image précédente"
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSrc}
              alt={article?.brand || article?.title || "Photo agrandie"}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none"
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedImage((i) => (i + 1) % images.length)
                }
                className="absolute right-2 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Image suivante"
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 px-4 pb-5 overflow-x-auto shrink-0">
              {images.map((img: string, i: number) => (
                <button
                  key={`lb-${i}`}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "relative h-14 w-14 rounded-lg overflow-hidden shrink-0 transition-all duration-200",
                    selectedImage === i
                      ? "opacity-100 ring-2 ring-white ring-inset shadow-md"
                      : "opacity-45 hover:opacity-80 ring-1 ring-white/20"
                  )}
                  aria-label={`Aller à l'image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review image lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button type="button" onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <FiX className="h-5 w-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImage} alt="Photo agrandie" className="max-w-full max-h-[85vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <Footer />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
