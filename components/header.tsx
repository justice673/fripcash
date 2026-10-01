"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { useMe } from "@/hooks/use-auth";
import { CartSheet } from "@/components/cart-sheet";
import {
  FiSearch,
  FiMenu,
  FiChevronRight,
  // FiGlobe, // translate button commented
  FiBell,
  FiHeart,
  FiShoppingBag,
  FiUser,
} from "react-icons/fi";
import {
  GiDress,
  GiPoloShirt,
  GiBabyFace,
  GiSofa,
  GiCircuitry,
  GiBookshelf,
  GiTennisBall,
  GiGamepad,
} from "react-icons/gi";
import { useCategories } from "@/hooks/use-categories";
import { useFavoritesCount } from "@/hooks/use-favorites";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/hooks/use-notifications";
import { useArticleSearch } from "@/hooks/use-articles";

/* ─── Category types ─── */

type SubGroup = {
  label: string;
  href: string;
  image?: string;
  items: { label: string; href: string }[];
};
type Category = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  image?: string;
  subGroups: SubGroup[];
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Mode: GiDress,
  Femme: GiDress,
  Femmes: GiDress,
  Homme: GiPoloShirt,
  Hommes: GiPoloShirt,
  Enfant: GiBabyFace,
  Enfants: GiBabyFace,
  Maison: GiSofa,
  Électronique: GiCircuitry,
  Electronique: GiCircuitry,
  Loisirs: GiBookshelf,
  Sport: GiTennisBall,
  "Sports et Divertissement": GiTennisBall,
  Divertissement: GiGamepad,
};

function buildFilterHref(category: string, subCategory?: string, itemType?: string): string {
  const params = new URLSearchParams();
  params.set("category", category);
  if (subCategory) params.set("subCategory", subCategory);
  if (itemType) params.set("itemType", itemType);
  return `/produits?${params.toString()}`;
}

function mapDbCategories(raw: any[]): Category[] {
  return raw.map((cat: any) => ({
    label: cat.name,
    href: buildFilterHref(cat.name),
    icon: ICON_MAP[cat.name] || GiBookshelf,
    image: cat.image || cat.imageUrl || undefined,
    subGroups: (cat.subGroups || []).map((sg: any) => ({
      label: sg.name,
      href: buildFilterHref(cat.name, sg.name),
      image: sg.image || sg.imageUrl || undefined,
      items: (sg.items || []).map((it: any) => ({
        label: it.name,
        href: buildFilterHref(cat.name, sg.name, it.name),
      })),
    })),
  }));
}

function NavbarSearch({ className }: { className?: string }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const { data, isFetching } = useArticleSearch(debounced, 8);
  const results = data?.data || [];
  const total = data?.total || 0;
  const showPanel = open && query.trim().length >= 2;

  const goToResults = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/produits?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToResults();
  };

  return (
    <div ref={wrapRef} className={`relative ${className || ""}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher des articles"
          className="h-9 bg-muted/50 pl-9"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showPanel}
        />
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          {isFetching && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Recherche…
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun article pour « {query.trim()} »
            </p>
          ) : (
            <ul className="max-h-[min(70vh,22rem)] overflow-y-auto py-1">
              {results.map((item) => (
                <li key={item._id}>
                  <Link
                    href={`/article/${item._id}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <FiSearch className="h-4 w-4 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.category}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                      {(item.price ?? 0).toLocaleString("fr-FR")} GNF
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={goToResults}
            className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            Voir tous les résultats
            {total > results.length ? ` (${total})` : ""}
            <FiChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const openSheet = useUIStore((state) => state.openSheet);
  const { openCart, itemCount } = useCartStore();
  const { data: user } = useMe();
  const { data: rawCategories = [] } = useCategories();
  const categories = mapDbCategories(rawCategories);
  const navCategories = categories.map((c) => ({ label: c.label, href: c.href }));
  const isLoggedIn = !!user;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cartCount = mounted ? itemCount() : 0;
  const favoritesCount = useFavoritesCount();
  const { data: notificationsData } = useNotifications(1, 10);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  // Live DB badges once mounted; prefer session user, else show when API already returned counts
  const showBadges =
    mounted && (isLoggedIn || favoritesCount > 0 || unreadCount > 0);
  const notifBadge = showBadges ? unreadCount : 0;
  const likeBadge = showBadges ? favoritesCount : 0;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifRefMobile = useRef<HTMLDivElement>(null);

  const handleNotifMouseEnter = () => {
    if (notifHoverTimeout.current) {
      clearTimeout(notifHoverTimeout.current);
      notifHoverTimeout.current = null;
    }
    setNotifOpen(true);
  };
  const handleNotifMouseLeave = () => {
    notifHoverTimeout.current = setTimeout(() => setNotifOpen(false), 150);
  };
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  /** null = parent "Voir tout" preview; string = subgroup label */
  const [megaFocus, setMegaFocus] = useState<"voir-tout" | string>("voir-tout");
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside = (notifRef.current?.contains(target) || notifRefMobile.current?.contains(target));
      if (!inside) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openMega = (catLabel: string) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setActiveCat(catLabel);
    setActiveSubGroup(null);
    setMegaFocus("voir-tout");
  };

  const closeMega = () => {
    closeTimeout.current = setTimeout(() => {
      setActiveCat(null);
      setActiveSubGroup(null);
      setMegaFocus("voir-tout");
    }, 150);
  };

  const keepOpen = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  };

  const currentCat = categories.find((c) => c.label === activeCat);
  const currentSubGroup = currentCat?.subGroups.find(
    (sg) => sg.label === activeSubGroup
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      {/* ═══════════════════════════════════════════
          DESKTOP top bar (lg+)
          ═══════════════════════════════════════════ */}
      <div className="hidden lg:block border-b">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          {/* Logo */}
          <Link href="/" className="shrink-0 -my-12">
            <Image
              src="/images/fripcash-logo.png"
              alt="FripCash"
              width={500}
              height={500}
              className="h-36 w-auto"
              priority
            />
          </Link>

          {/* Search bar with live product suggestions */}
          <NavbarSearch className="flex-1 max-w-2xl" />

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {isLoggedIn ? (
              <>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm"
                  asChild
                >
                  <Link href="/dashboard/articles">Vends tes articles</Link>
                </Button>

                <div
                  className="relative"
                  ref={notifRef}
                  onMouseEnter={handleNotifMouseEnter}
                  onMouseLeave={handleNotifMouseLeave}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="relative"
                    onClick={() => setNotifOpen((o) => !o)}
                  >
                    <FiBell className="h-5 w-5" />
                    {notifBadge > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {notifBadge > 99 ? "99+" : notifBadge}
                      </span>
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-1 w-80 max-h-[360px] overflow-hidden rounded-lg border border-border bg-background shadow-lg z-50 flex flex-col">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                        <span className="font-semibold text-sm">Notifications</span>
                        {notifBadge > 0 && (
                          <button
                            type="button"
                            onClick={() => markAllAsRead.mutate()}
                            className="text-xs text-primary hover:underline"
                          >
                            Tout marquer comme lu
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto max-h-[300px]">
                        {notificationsData?.data?.length ? (
                          notificationsData.data.map((n: any) => (
                            <Link
                              key={n._id}
                              href={n.link || "/dashboard/notifications"}
                              onClick={() => {
                                if (!n.read) markAsRead.mutate(n._id);
                                setNotifOpen(false);
                              }}
                              className={`block px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {n.title}
                                </p>
                                {n.createdAt && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {new Date(n.createdAt).toLocaleTimeString("fr-FR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-xs mt-0.5 line-clamp-2 ${
                                  n.previewKind === "chat"
                                    ? "text-foreground/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {n.message || n.body}
                              </p>
                            </Link>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Aucune notification
                          </div>
                        )}
                      </div>
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="px-4 py-2 text-center text-sm text-primary border-t border-border hover:bg-muted/50"
                      >
                        Voir toutes les notifications
                      </Link>
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="icon-sm" className="relative" asChild>
                  <Link href="/dashboard/favoris">
                    <FiHeart className="h-5 w-5" />
                    {likeBadge > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {likeBadge > 99 ? "99+" : likeBadge}
                      </span>
                    )}
                    <span className="sr-only">Favoris</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                  onClick={openCart}
                >
                  <FiShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                  <span className="sr-only">Panier</span>
                </Button>

                <Link
                  href="/dashboard"
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground overflow-hidden"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.pseudo || user.firstName || ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FiUser className="h-4 w-4" />
                  )}
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm font-medium"
                  asChild
                >
                  <Link href="/connexion">S&apos;inscrire | Se connecter</Link>
                </Button>

                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm"
                  asChild
                >
                  <Link href="/inscription">Vends tes articles</Link>
                </Button>

                <Button variant="ghost" size="icon-sm" className="relative" asChild>
                  <Link href="/dashboard/favoris">
                    <FiHeart className="h-5 w-5" />
                    <span className="sr-only">Favoris</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                  onClick={openCart}
                >
                  <FiShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                  <span className="sr-only">Panier</span>
                </Button>
              </>
            )}

            {/* Translate button - commented for now
            <Button
              variant="ghost"
              size="sm"
              className="items-center gap-1 text-sm"
            >
              <FiGlobe className="h-4 w-4" />
              FR
              <FiChevronDown className="h-3 w-3" />
            </Button>
            */}
          </div>
        </div>
      </div>

      {/* Desktop category bar with hover mega menu */}
      <div className="hidden lg:block border-b relative">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
            {categories.map((cat) => (
              <button
                key={cat.href}
                onMouseEnter={() => openMega(cat.label)}
                onMouseLeave={closeMega}
                className={`whitespace-nowrap px-3 py-1.5 text-sm transition-colors rounded-md ${
                  activeCat === cat.label
                    ? "text-foreground font-medium underline underline-offset-[6px] decoration-primary decoration-2"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mega dropdown */}
        {activeCat && currentCat && (
          <div
            className="absolute left-0 right-0 top-full bg-background border-b shadow-lg z-50"
            onMouseEnter={keepOpen}
            onMouseLeave={closeMega}
          >
            <div className="container mx-auto px-4 py-6 flex gap-0 min-h-[260px]">
              {/* Left: sub-group sidebar */}
              <div className="w-56 border-r pr-4 shrink-0 space-y-0.5">
                <Link
                  href={currentCat.href}
                  onMouseEnter={() => {
                    setMegaFocus("voir-tout");
                    setActiveSubGroup(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors mb-1 ${
                    megaFocus === "voir-tout"
                      ? "text-primary bg-primary/5"
                      : "text-primary hover:bg-primary/5"
                  }`}
                >
                  Voir tout
                </Link>
                {currentCat.subGroups.map((sg) => {
                  const isActive = megaFocus === sg.label;
                  const isLeaf = sg.items.length === 0;
                  const className = `w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`;
                  if (isLeaf) {
                    return (
                      <Link
                        key={sg.label}
                        href={sg.href}
                        onMouseEnter={() => {
                          setActiveSubGroup(sg.label);
                          setMegaFocus(sg.label);
                        }}
                        className={className}
                      >
                        {sg.label}
                        <FiChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={sg.label}
                      type="button"
                      onMouseEnter={() => {
                        setActiveSubGroup(sg.label);
                        setMegaFocus(sg.label);
                      }}
                      className={className}
                    >
                      {sg.label}
                      <FiChevronRight className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Right: parent Voir tout | deeper items | leaf preview */}
              <div className="flex-1 pl-8">
                {megaFocus === "voir-tout" ? (
                  <Link
                    href={currentCat.href}
                    className="group flex items-stretch gap-6 max-w-xl rounded-lg border border-transparent hover:border-border hover:bg-muted/40 p-2 -m-2 transition-colors"
                  >
                    <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-md bg-muted">
                      {currentCat.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentCat.image}
                          alt={currentCat.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <currentCat.icon className="h-10 w-10 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-2 py-1">
                      <p className="text-base font-medium text-foreground">
                        {currentCat.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tous les articles {currentCat.label.toLowerCase()}
                      </p>
                      <span className="text-sm font-medium text-primary group-hover:underline">
                        Voir tout
                      </span>
                    </div>
                  </Link>
                ) : currentSubGroup && currentSubGroup.items.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-12 gap-y-1">
                    <Link
                      href={currentSubGroup.href}
                      className="text-sm font-medium text-primary hover:underline py-1.5 col-span-2"
                    >
                      Voir tout — {currentSubGroup.label}
                    </Link>
                    {currentSubGroup.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline py-1.5 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : currentSubGroup ? (
                  <Link
                    href={currentSubGroup.href}
                    className="group flex items-stretch gap-6 max-w-xl rounded-lg border border-transparent hover:border-border hover:bg-muted/40 p-2 -m-2 transition-colors"
                  >
                    <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-md bg-muted">
                      {currentSubGroup.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSubGroup.image}
                          alt={currentSubGroup.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <currentCat.icon className="h-10 w-10 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-2 py-1">
                      <p className="text-base font-medium text-foreground">
                        {currentSubGroup.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Parcourir les articles {currentSubGroup.label.toLowerCase()}
                      </p>
                      <span className="text-sm font-medium text-primary group-hover:underline">
                        Voir tout
                      </span>
                    </div>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE / TABLET top bar (<lg)
          ═══════════════════════════════════════════ */}
      <div className="lg:hidden">
        {/* Row 1: Logo left, icons right */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/" className="shrink-0 -my-10">
            <Image
              src="/images/fripcash-logo.png"
              alt="FripCash"
              width={500}
              height={500}
              className="h-32 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-1">
            {isLoggedIn && (
              <div className="relative" ref={notifRefMobile}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setNotifOpen(!notifOpen)}
                >
                  <FiBell className="h-5 w-5" />
                  {notifBadge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {notifBadge > 99 ? "99+" : notifBadge}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
                {notifOpen && (
                  <div className="fixed left-4 right-4 top-20 max-w-md mx-auto max-h-[360px] overflow-hidden rounded-lg border border-border bg-background shadow-lg z-[100] flex flex-col sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 sm:max-w-none sm:mx-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                      <span className="font-semibold text-sm">Notifications</span>
                      {notifBadge > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllAsRead.mutate()}
                          className="text-xs text-primary hover:underline"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-[300px]">
                      {notificationsData?.data?.length ? (
                        notificationsData.data.map((n: any) => (
                          <Link
                            key={n._id}
                            href={n.link || "/dashboard/notifications"}
                            onClick={() => {
                              if (!n.read) markAsRead.mutate(n._id);
                              setNotifOpen(false);
                            }}
                            className={`block px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {n.title}
                              </p>
                              {n.createdAt && (
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {new Date(n.createdAt).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-0.5 line-clamp-2 ${
                                n.previewKind === "chat"
                                  ? "text-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {n.message || n.body}
                            </p>
                          </Link>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          Aucune notification
                        </div>
                      )}
                    </div>
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="px-4 py-2 text-center text-sm text-primary font-medium border-t border-border hover:bg-muted/50"
                    >
                      Voir toutes les notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/dashboard/favoris">
                <FiHeart className="h-5 w-5" />
                {likeBadge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {likeBadge > 99 ? "99+" : likeBadge}
                  </span>
                )}
                <span className="sr-only">Favoris</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={openCart}
            >
              <FiShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
              <span className="sr-only">Panier</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => openSheet("menu")}
            >
              <FiMenu className="h-6 w-6" />
              <span className="sr-only">Menu</span>
            </Button>
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground overflow-hidden"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.pseudo || user.firstName || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiUser className="h-4 w-4" />
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Row 2: Search bar with live product suggestions */}
        <div className="px-4 py-2 border-b">
          <NavbarSearch className="w-full" />
        </div>

        {/* Row 3: Horizontal scrollable category pills */}
        <div className="border-b">
          <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
            <Link
              href="/"
              className="whitespace-nowrap px-3 py-1.5 text-sm rounded-full border border-primary text-primary font-medium transition-colors"
            >
              Voir tout
            </Link>
            {navCategories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="whitespace-nowrap px-3 py-1.5 text-sm rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Cart drawer */}
      <CartSheet />
    </header>
  );
}
