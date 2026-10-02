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
      {/* Soft overlays — keep product image readable in the center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.05) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 42%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
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
          <div className="shrink-0 rounded-lg bg-black/35 p-1 backdrop-blur-[2px]">
            <PromoFlipCountdown
              endsAt={promo.endsAt}
              serverNow={serverNow}
              size="xs"
            />
          </div>
        </div>

        <div className="mt-auto max-w-[72%] space-y-1.5 sm:max-w-[70%]">
          <h3 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
            {promo.title}
          </h3>
          {blurb ? (
            <p className="text-xs text-white/85 sm:text-sm line-clamp-2">
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
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-foreground shadow-sm">
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
        <div className="h-[220px] animate-pulse rounded-2xl bg-muted sm:h-[260px]" />
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
