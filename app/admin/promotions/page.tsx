"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useAdminArticles } from "@/hooks/use-admin";
import {
  ApiError,
  fetchAdminPromotions,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  type Promotion,
  type PromotionSurface,
  type CreatePromotionBody,
} from "@/lib/api";
import {
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiTrash2,
  FiZap,
  FiTag,
} from "react-icons/fi";

const LOCAL_KEY = "fripcash.admin.promotions.preview.v1";

type ArticleRow = {
  id: string;
  title: string;
  price: number;
  images: string[];
  status: string;
  apiStatus?: string;
  seller: { pseudo: string };
  category: string | null;
  description?: string;
  raw?: {
    compareAtPriceGnf?: number | null;
    priceGnf?: number;
  };
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) throw new Error("Date/heure invalide");
  return d.toISOString();
}

function formatGnf(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} GNF`;
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function discountPct(promo: number, compare: number | null | undefined) {
  if (compare == null || compare <= promo) return null;
  return Math.round(((compare - promo) / compare) * 100);
}

function readLocal(): Promotion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Promotion[];
  } catch {
    return [];
  }
}

function writeLocal(items: Promotion[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

type PromoteForm = {
  subtitleFr: string;
  subtitleEn: string;
  badgeFr: string;
  badgeEn: string;
  ctaLabelFr: string;
  ctaLabelEn: string;
  promoPriceGnf: string;
  compareAtPriceGnf: string;
  startsAtLocal: string;
  endsAtLocal: string;
  surface: PromotionSurface;
  sortOrder: string;
  isActive: boolean;
  internalNotes: string;
};

function defaultPromoteForm(article: ArticleRow): PromoteForm {
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const compare = article.raw?.compareAtPriceGnf;
  const pct =
    compare != null && compare > article.price
      ? discountPct(article.price, compare)
      : null;
  return {
    subtitleFr: "Offre flash",
    subtitleEn: "Flash deal",
    badgeFr: pct != null ? `-${pct} %` : "",
    badgeEn: pct != null ? `-${pct}%` : "",
    ctaLabelFr: "Acheter",
    ctaLabelEn: "Shop now",
    promoPriceGnf: String(article.price ?? ""),
    compareAtPriceGnf: compare != null ? String(compare) : "",
    startsAtLocal: isoToLocalInput(now.toISOString()),
    endsAtLocal: isoToLocalInput(end.toISOString()),
    surface: "BOTH",
    sortOrder: "0",
    isActive: true,
    internalNotes: "",
  };
}

/** Mini preview of the home promo card. */
function PromoCardPreview({
  imageUrl,
  title,
  subtitle,
  badge,
  promoPrice,
  compareAt,
  endsAtLocal,
  ctaLabel,
}: {
  imageUrl?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  promoPrice?: number | null;
  compareAt?: number | null;
  endsAtLocal?: string;
  ctaLabel?: string;
}) {
  let countdown = "—";
  try {
    if (endsAtLocal) {
      const ms = new Date(endsAtLocal).getTime() - Date.now();
      if (ms > 0) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        countdown = `${h}h ${pad(m)}m`;
      } else {
        countdown = "Expiré";
      }
    }
  } catch {
    /* ignore */
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
          Pas d’image
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 space-y-1 p-3 text-white">
        {badge ? (
          <span className="inline-block rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold">
            {badge}
          </span>
        ) : null}
        {subtitle ? (
          <p className="text-[10px] uppercase tracking-wide opacity-80">
            {subtitle}
          </p>
        ) : null}
        <p className="truncate text-sm font-semibold">{title}</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{formatGnf(promoPrice)}</span>
          {compareAt != null && compareAt > (promoPrice ?? 0) ? (
            <span className="line-through opacity-60">{formatGnf(compareAt)}</span>
          ) : null}
          <span className="ml-auto flex items-center gap-1 opacity-90">
            <FiClock className="h-3 w-3" />
            {countdown}
          </span>
        </div>
        <span className="mt-1 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-foreground">
          {ctaLabel || "Acheter"}
        </span>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data, isLoading: articlesLoading, isError: articlesError } =
    useAdminArticles({
      status: "active",
      q: search || undefined,
    });
  const articles = (data?.data ?? []) as ArticleRow[];

  const [promos, setPromos] = useState<Promotion[]>([]);
  const [apiMode, setApiMode] = useState<"live" | "local">("local");
  const [promosLoading, setPromosLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState<ArticleRow | null>(null);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoteForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPromos = useCallback(async () => {
    setPromosLoading(true);
    try {
      const res = await fetchAdminPromotions({ limit: 100 });
      setPromos(res.items ?? []);
      setApiMode("live");
    } catch {
      setPromos(readLocal());
      setApiMode("local");
    } finally {
      setPromosLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPromos();
  }, [loadPromos]);

  const promoByListingId = useMemo(() => {
    const map = new Map<string, Promotion>();
    for (const p of promos) {
      if (p.listingId) map.set(p.listingId, p);
    }
    return map;
  }, [promos]);

  const liveCount = useMemo(() => {
    const now = Date.now();
    return promos.filter(
      (p) =>
        p.isActive &&
        new Date(p.startsAt).getTime() <= now &&
        now < new Date(p.endsAt).getTime()
    ).length;
  }, [promos]);

  const openPromote = (article: ArticleRow, existing?: Promotion) => {
    setTarget(article);
    setEditingPromoId(existing?.id ?? null);
    if (existing) {
      setForm({
        subtitleFr: existing.subtitleFr ?? "",
        subtitleEn: existing.subtitleEn ?? "",
        badgeFr: existing.badgeFr ?? "",
        badgeEn: existing.badgeEn ?? "",
        ctaLabelFr: existing.ctaLabelFr ?? "Acheter",
        ctaLabelEn: existing.ctaLabelEn ?? "Shop now",
        promoPriceGnf:
          existing.promoPriceGnf != null
            ? String(existing.promoPriceGnf)
            : String(article.price),
        compareAtPriceGnf:
          existing.compareAtPriceGnf != null
            ? String(existing.compareAtPriceGnf)
            : "",
        startsAtLocal: isoToLocalInput(existing.startsAt),
        endsAtLocal: isoToLocalInput(existing.endsAt),
        surface: existing.surface,
        sortOrder: String(existing.sortOrder ?? 0),
        isActive: existing.isActive,
        internalNotes: existing.internalNotes ?? "",
      });
    } else {
      setForm(defaultPromoteForm(article));
    }
    setSheetOpen(true);
  };

  const setField = <K extends keyof PromoteForm>(key: K, value: PromoteForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!target || !form) return;
    setSaving(true);
    try {
      if (!form.startsAtLocal || !form.endsAtLocal) {
        throw new Error("Date de début et de fin requises");
      }
      const startsAt = localInputToIso(form.startsAtLocal);
      const endsAt = localInputToIso(form.endsAtLocal);
      if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        throw new Error("La fin doit être après le début");
      }

      const promoPrice =
        form.promoPriceGnf.trim() === ""
          ? target.price
          : Number(form.promoPriceGnf.replace(/\s/g, ""));
      const compareAt =
        form.compareAtPriceGnf.trim() === ""
          ? null
          : Number(form.compareAtPriceGnf.replace(/\s/g, ""));
      if (Number.isNaN(promoPrice)) throw new Error("Prix promo invalide");
      if (compareAt != null && Number.isNaN(compareAt)) {
        throw new Error("Prix barré invalide");
      }

      const imageUrl = target.images?.[0] ?? null;
      const body: CreatePromotionBody = {
        kind: "PRODUCT",
        status: form.isActive ? "LIVE" : "PAUSED",
        titleFr: target.title,
        titleEn: target.title,
        subtitleFr: form.subtitleFr.trim() || undefined,
        subtitleEn: form.subtitleEn.trim() || undefined,
        descriptionFr: target.description?.trim() || undefined,
        badgeFr: form.badgeFr.trim() || undefined,
        badgeEn: form.badgeEn.trim() || undefined,
        ctaLabelFr: form.ctaLabelFr.trim() || "Acheter",
        ctaLabelEn: form.ctaLabelEn.trim() || "Shop now",
        listingId: target.id,
        imageUrl,
        promoPriceGnf: promoPrice,
        compareAtPriceGnf: compareAt,
        startsAt,
        endsAt,
        surface: form.surface,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        internalNotes: form.internalNotes.trim() || undefined,
      };

      if (apiMode === "live") {
        if (editingPromoId) {
          await updateAdminPromotion(editingPromoId, body);
          toast("Promotion mise à jour — CTA → fiche produit", "success");
        } else {
          await createAdminPromotion(body);
          toast("Article promu — « Acheter / Shop now » ouvre sa fiche", "success");
        }
        await loadPromos();
      } else {
        const nowIso = new Date().toISOString();
        const next: Promotion = {
          id: editingPromoId ?? `local_${Date.now()}`,
          kind: "PRODUCT",
          status: body.status ?? "LIVE",
          titleFr: body.titleFr,
          titleEn: body.titleEn,
          subtitleFr: body.subtitleFr ?? null,
          subtitleEn: body.subtitleEn ?? null,
          descriptionFr: body.descriptionFr ?? null,
          descriptionEn: null,
          badgeFr: body.badgeFr ?? null,
          badgeEn: body.badgeEn ?? null,
          ctaLabelFr: body.ctaLabelFr ?? null,
          ctaLabelEn: body.ctaLabelEn ?? null,
          listingId: target.id,
          sellerProfileId: null,
          imageUrl,
          imagePublicId: null,
          promoPriceGnf: promoPrice,
          compareAtPriceGnf: compareAt,
          startsAt,
          endsAt,
          surface: body.surface ?? "BOTH",
          sortOrder: body.sortOrder ?? 0,
          isActive: body.isActive ?? true,
          internalNotes: body.internalNotes ?? null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        const updated = editingPromoId
          ? promos.map((p) => (p.id === editingPromoId ? next : p))
          : [next, ...promos.filter((p) => p.listingId !== target.id)];
        writeLocal(updated);
        setPromos(updated);
        toast(
          editingPromoId
            ? "Promotion enregistrée (aperçu local)"
            : "Article ajouté au carrousel Featured (aperçu local)",
          "success"
        );
      }

      setSheetOpen(false);
      setTarget(null);
      setForm(null);
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : "Erreur enregistrement",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnpromote = async (promo: Promotion) => {
    try {
      if (apiMode === "live") {
        await deleteAdminPromotion(promo.id);
        await loadPromos();
      } else {
        const updated = promos.filter((p) => p.id !== promo.id);
        writeLocal(updated);
        setPromos(updated);
      }
      toast(`Retiré du carrousel : « ${promo.titleFr} »`, "success");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.body.message : "Suppression impossible",
        "error"
      );
    }
  };

  const previewPromo = form
    ? Number(form.promoPriceGnf.replace(/\s/g, "")) || target?.price
    : null;
  const previewCompare =
    form && form.compareAtPriceGnf.trim()
      ? Number(form.compareAtPriceGnf.replace(/\s/g, ""))
      : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promotions"
        description="Choisissez un article publié → Promouvoir → dates / prix. « Acheter / Shop now » ouvre toujours la fiche produit de cet article. L’article reste aussi dans le catalogue normal."
      />

      {apiMode === "local" && !promosLoading && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Impossible de joindre{" "}
          <code className="text-xs">/admin/promotions</code> — aperçu
          localStorage. Reconnectez-vous en admin et rechargez. Le site public
          utilise déjà <code className="text-xs">GET /promotions?surface=HOME_WEB</code>.
        </div>
      )}
      {apiMode === "live" && !promosLoading && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          API live — les promos actives apparaissent sur l’app (
          <code className="text-xs">HOME_APP</code>) et le site (
          <code className="text-xs">HOME_WEB</code>) selon la surface choisie.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Articles actifs"
          value={articlesLoading ? "…" : String(articles.length)}
          description="Publiés — éligibles à la promo"
          icon={FiZap}
        />
        <StatCard
          label="Dans le carrousel"
          value={promosLoading ? "…" : String(promos.length)}
          description="Promotions enregistrées"
          icon={FiTag}
        />
        <StatCard
          label="En ligne maintenant"
          value={promosLoading ? "…" : String(liveCount)}
          description="Dans la fenêtre startsAt → endsAt"
          icon={FiCheckCircle}
        />
      </div>

      {/* Active featured strip */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Carrousel Featured (home App + Site)
        </h2>
        {promosLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : promos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune promo — utilisez <strong>Promouvoir</strong> sur un article
            ci-dessous. Shop now → fiche de cet article.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {promos
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((p) => {
                const article = articles.find((a) => a.id === p.listingId);
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <PromoCardPreview
                      imageUrl={p.imageUrl ?? undefined}
                      title={p.titleFr}
                      subtitle={p.subtitleFr ?? undefined}
                      badge={p.badgeFr ?? undefined}
                      promoPrice={p.promoPriceGnf}
                      compareAt={p.compareAtPriceGnf}
                      endsAtLocal={isoToLocalInput(p.endsAt)}
                      ctaLabel={p.ctaLabelFr ?? "Acheter"}
                    />
                    <div className="flex items-center justify-between gap-2 p-2">
                      <p className="truncate text-[11px] text-muted-foreground">
                        → PDP · {formatWhen(p.startsAt)} → {formatWhen(p.endsAt)}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (article) openPromote(article, p);
                            else
                              openPromote(
                                {
                                  id: p.listingId!,
                                  title: p.titleFr,
                                  price: p.promoPriceGnf ?? 0,
                                  images: p.imageUrl ? [p.imageUrl] : [],
                                  status: "active",
                                  seller: { pseudo: "—" },
                                  category: null,
                                },
                                p
                              );
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => void handleUnpromote(p)}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* All articles */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Articles de l’app
          </h2>
          <div className="relative max-w-sm w-full">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article…"
              className="pl-9"
            />
          </div>
        </div>

        {articlesLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : articlesError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
            Impossible de charger les articles admin. Vérifiez la session admin,
            puis ouvrez{" "}
            <a href="/admin/articles" className="underline font-medium">
              Articles
            </a>{" "}
            — s’ils y apparaissent, rechargez cette page.
          </p>
        ) : articles.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun article <strong>actif</strong> trouvé. Publiez d’abord une
            annonce (vendeur) ou passez-la en{" "}
            <a href="/admin/articles" className="underline font-medium text-foreground">
              Actif
            </a>{" "}
            dans Articles, puis revenez ici pour <strong>Promouvoir</strong>.
          </p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => {
              const existing = promoByListingId.get(a.id);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  {a.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.images[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-md object-cover border border-border"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-md bg-muted border border-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{a.title}</span>
                      {existing ? (
                        <Badge variant="default">En promo</Badge>
                      ) : null}
                      <Badge variant="secondary">{a.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatGnf(a.price)}
                      {a.seller?.pseudo ? ` · ${a.seller.pseudo}` : ""}
                      {a.category ? ` · ${a.category}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={existing ? "outline" : "default"}
                    onClick={() => openPromote(a, existing)}
                  >
                    <FiTag className="mr-1 h-4 w-4" />
                    {existing ? "Modifier promo" : "Promouvoir"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) {
            setTarget(null);
            setForm(null);
            setEditingPromoId(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-y-auto sm:max-w-md p-0"
        >
          <SheetHeader className="border-b border-border">
            <SheetTitle>
              {editingPromoId ? "Modifier la promotion" : "Promouvoir cet article"}
            </SheetTitle>
            <SheetDescription>
              « Acheter / Shop now » ouvre la fiche produit de « {target?.title} ».
              L’article reste visible partout ailleurs dans l’app.
            </SheetDescription>
          </SheetHeader>

          {target && form ? (
            <div className="flex flex-1 flex-col gap-4 px-4 py-2">
              <PromoCardPreview
                imageUrl={target.images?.[0]}
                title={target.title}
                subtitle={form.subtitleFr}
                badge={form.badgeFr}
                promoPrice={previewPromo}
                compareAt={
                  previewCompare != null && !Number.isNaN(previewCompare)
                    ? previewCompare
                    : null
                }
                endsAtLocal={form.endsAtLocal}
                ctaLabel={form.ctaLabelFr}
              />

              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                CTA → <code className="text-[10px]">/listings/{target.id}</code>{" "}
                (PDP App + Site). Pas de destination hors plateforme.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Début *</Label>
                  <Input
                    type="datetime-local"
                    value={form.startsAtLocal}
                    onChange={(e) => setField("startsAtLocal", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fin (compte à rebours) *</Label>
                  <Input
                    type="datetime-local"
                    value={form.endsAtLocal}
                    onChange={(e) => setField("endsAtLocal", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Envoyé en ISO UTC :{" "}
                {(() => {
                  try {
                    return `${localInputToIso(form.startsAtLocal)} → ${localInputToIso(form.endsAtLocal)}`;
                  } catch {
                    return "—";
                  }
                })()}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Prix promo (GNF)</Label>
                  <Input
                    inputMode="numeric"
                    value={form.promoPriceGnf}
                    onChange={(e) => setField("promoPriceGnf", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix barré (GNF)</Label>
                  <Input
                    inputMode="numeric"
                    value={form.compareAtPriceGnf}
                    onChange={(e) =>
                      setField("compareAtPriceGnf", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Sous-titre FR</Label>
                  <Input
                    value={form.subtitleFr}
                    onChange={(e) => setField("subtitleFr", e.target.value)}
                    placeholder="Offre flash"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge FR</Label>
                  <Input
                    value={form.badgeFr}
                    onChange={(e) => setField("badgeFr", e.target.value)}
                    placeholder="-40 %"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>CTA FR</Label>
                  <Input
                    value={form.ctaLabelFr}
                    onChange={(e) => setField("ctaLabelFr", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA EN</Label>
                  <Input
                    value={form.ctaLabelEn}
                    onChange={(e) => setField("ctaLabelEn", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Surface</Label>
                  <Select
                    value={form.surface}
                    onValueChange={(v) =>
                      setField("surface", v as PromotionSurface)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOTH">App + Site</SelectItem>
                      <SelectItem value="HOME_APP">App seulement</SelectItem>
                      <SelectItem value="HOME_WEB">Site seulement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ordre carrousel</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setField("sortOrder", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Sinon absente du carrousel public
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setField("isActive", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes internes</Label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  value={form.internalNotes}
                  onChange={(e) => setField("internalNotes", e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <SheetFooter className="border-t border-border">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form}>
              {saving
                ? "Enregistrement…"
                : editingPromoId
                  ? "Mettre à jour"
                  : "Mettre en avant"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
