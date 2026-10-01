"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type HomePromoCard = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  ctaLabel: string;
  listingId: string;
  imageUrl: string;
  promoPriceGnf?: number | null;
  compareAtPriceGnf?: number | null;
  endsAt: string;
};

/** Temporary UI seed until Nest `GET /promotions` is live. */
function dummyPromos(): HomePromoCard[] {
  const now = Date.now();
  return [
    {
      id: "dummy_1",
      title: "Numeris Atelier – Cloud",
      subtitle: "Offre flash",
      description: "Baskets premium — fenêtre promo limitée.",
      badge: "-40 %",
      ctaLabel: "Acheter",
      listingId: "dummy-listing-1",
      imageUrl:
        "https://res.cloudinary.com/dof9wv5gr/image/upload/v1790246718/fripcash/listings/60ea903fa2e253a2/m86woerywgbfmrzrwcth.jpg",
      promoPriceGnf: 349920,
      compareAtPriceGnf: 583200,
      endsAt: new Date(now + 18 * 3600_000 + 42 * 60_000).toISOString(),
    },
    {
      id: "dummy_2",
      title: "Montre élégante",
      subtitle: "Promo weekend",
      description: "Montre argentée — prix home featured.",
      badge: "-30 %",
      ctaLabel: "Acheter",
      listingId: "dummy-listing-2",
      imageUrl:
        "https://res.cloudinary.com/dof9wv5gr/image/upload/v1790210831/fripcash/listings/18ef39022ef39940/lqmvolc1chnvdfnvigy5.jpg",
      promoPriceGnf: 438480,
      compareAtPriceGnf: 626400,
      endsAt: new Date(now + 30 * 3600_000 + 15 * 60_000).toISOString(),
    },
    {
      id: "dummy_3",
      title: "Chemise lin bleu ciel",
      subtitle: "Soft launch",
      description: "Chemise lin — la promo se termine bientôt.",
      badge: "-30 %",
      ctaLabel: "Acheter",
      listingId: "dummy-listing-3",
      imageUrl:
        "https://res.cloudinary.com/dof9wv5gr/image/upload/v1790210815/fripcash/listings/18ef39022ef39940/kjrm5esfhrsoxrnmrfbv.jpg",
      promoPriceGnf: 241920,
      compareAtPriceGnf: 345600,
      endsAt: new Date(now + 5 * 3600_000 + 28 * 60_000).toISOString(),
    },
  ];
}

function formatGnf(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} GNF`;
}

function discountPercent(
  promo?: number | null,
  compare?: number | null
): number | null {
  if (promo == null || compare == null || compare <= promo) return null;
  return Math.round(((compare - promo) / compare) * 100);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return { expired: true, label: "Terminé" };
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      expired: false,
      label: `${pad(h)}:${pad(m)}:${pad(s)}`,
    };
  }, [endsAt]);

  const [state, setState] = useState(calc);

  useEffect(() => {
    setState(calc());
    const id = window.setInterval(() => setState(calc()), 1000);
    return () => window.clearInterval(id);
  }, [calc]);

  return state;
}

function PromoCountdown({ endsAt }: { endsAt: string }) {
  const { label } = useCountdown(endsAt);
  return (
    <span className="inline-flex items-center rounded-md border border-white/25 bg-white/15 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
      {label}
    </span>
  );
}

function PromoSlide({ promo }: { promo: HomePromoCard }) {
  const pct = discountPercent(promo.promoPriceGnf, promo.compareAtPriceGnf);
  const href = `/article/${promo.listingId}`;
  const blurb = promo.description || promo.subtitle;

  return (
    <Link
      href={href}
      className="relative block h-[220px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-[260px] snap-center"
    >
      {promo.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={promo.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.2) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col p-4 sm:p-6">
        <div className="flex items-start gap-2">
          <span className="rounded-md border border-white/25 bg-white/15 px-2 py-1 text-[11px] font-bold text-white">
            Promo
          </span>
          {pct != null ? (
            <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-extrabold text-primary-foreground">
              -{pct}%
            </span>
          ) : promo.badge ? (
            <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-extrabold text-primary-foreground">
              {promo.badge}
            </span>
          ) : null}
          <span className="ml-auto">
            <PromoCountdown endsAt={promo.endsAt} />
          </span>
        </div>

        <div className="mt-auto space-y-2">
          <h3 className="max-w-[90%] text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
            {promo.title}
          </h3>
          {blurb ? (
            <p className="max-w-[85%] text-xs text-white/85 sm:text-sm line-clamp-2">
              {blurb}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-3 pt-1">
            {promo.promoPriceGnf != null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-white sm:text-xl">
                  {formatGnf(promo.promoPriceGnf)}
                </span>
                {promo.compareAtPriceGnf != null &&
                promo.compareAtPriceGnf > promo.promoPriceGnf ? (
                  <span className="text-xs text-white/60 line-through">
                    {formatGnf(promo.compareAtPriceGnf)}
                  </span>
                ) : null}
              </div>
            ) : null}
            <span className="ml-auto inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-foreground shadow-sm">
              {promo.ctaLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HomePromotionsSection() {
  const [items] = useState<HomePromoCard[]>(() => dummyPromos());
  const [index, setIndex] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [items.length]);

  const visible = useMemo(() => items, [items]);

  if (visible.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pb-4 pt-2">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">
          Promotions en avant
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          Offres limitées
        </span>
      </div>

      {/* Desktop / tablet: peek carousel */}
      <div className="relative hidden sm:block">
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {visible.map((p) => (
              <div key={p.id} className="w-full shrink-0 px-0.5">
                <PromoSlide promo={p} />
              </div>
            ))}
          </div>
        </div>
        {visible.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {visible.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-primary/30 hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Mobile: snap scroll */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 sm:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((p) => (
          <div key={p.id} className="w-[92%] shrink-0 snap-center">
            <PromoSlide promo={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
