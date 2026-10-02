"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useHomePromotions,
  type HomePromoCard,
} from "@/hooks/use-promotions";
import { PromoFlipCountdown } from "@/components/promo-flip-countdown";

function formatGnf(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} GNF`;
}

function discountPercent(
  promo?: number | null,
  compare?: number | null,
  serverPct?: number | null
): number | null {
  if (typeof serverPct === "number" && serverPct > 0) return serverPct;
  if (promo == null || compare == null || compare <= promo) return null;
  return Math.round(((compare - promo) / compare) * 100);
}

function PromoSlide({
  promo,
  serverNow,
}: {
  promo: HomePromoCard;
  serverNow?: string;
}) {
  const pct = discountPercent(
    promo.promoPriceGnf,
    promo.compareAtPriceGnf,
    promo.discountPercent
  );
  const blurb = promo.description || promo.subtitle;

  return (
    <Link
      href={promo.href}
      className="relative block h-[240px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-[280px] snap-center"
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
            "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%)",
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
        </div>

        <div className="mt-3 self-end sm:mt-2">
          <PromoFlipCountdown
            endsAt={promo.endsAt}
            serverNow={serverNow}
            size="sm"
          />
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
  const { data, isLoading, isError } = useHomePromotions(12);
  const items = data?.items ?? [];
  const serverNow = data?.serverNow;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [items.length]);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 pb-4 pt-2">
        <div className="mb-4 h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-[240px] animate-pulse rounded-2xl bg-muted sm:h-[280px]" />
      </section>
    );
  }

  if (isError || items.length === 0) return null;

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

      <div className="relative hidden sm:block">
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((p) => (
              <div key={p.id} className="w-full shrink-0 px-0.5">
                <PromoSlide promo={p} serverNow={serverNow} />
              </div>
            ))}
          </div>
        </div>
        {items.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {items.map((p, i) => (
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

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 sm:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <div key={p.id} className="w-[92%] shrink-0 snap-center">
            <PromoSlide promo={p} serverNow={serverNow} />
          </div>
        ))}
      </div>
    </section>
  );
}
