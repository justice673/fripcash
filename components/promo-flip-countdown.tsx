"use client";

import { useEffect, useMemo, useState } from "react";
import FlipClockCountdown from "@leenguyen/react-flip-clock-countdown";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";

type PromoFlipCountdownProps = {
  endsAt: string;
  /** ISO from public API — corrects client clock skew */
  serverNow?: string;
  className?: string;
  /** denser digits for overlay on promo cards */
  size?: "sm" | "md";
};

/**
 * 3D flip countdown (days / hours / minutes / seconds).
 * Client-mounted only to avoid SSR hydration mismatch.
 */
export function PromoFlipCountdown({
  endsAt,
  serverNow,
  className,
  size = "sm",
}: PromoFlipCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const skewMs = useMemo(() => {
    if (!serverNow) return 0;
    const server = new Date(serverNow).getTime();
    if (Number.isNaN(server)) return 0;
    return server - Date.now();
  }, [serverNow]);

  const toMs = useMemo(() => {
    const t = new Date(endsAt).getTime();
    return Number.isNaN(t) ? Date.now() : t;
  }, [endsAt]);

  const digit =
    size === "md"
      ? { width: 40, height: 56, fontSize: 32 }
      : { width: 26, height: 36, fontSize: 20 };

  if (!mounted) {
    return (
      <div
        className={`flex h-[52px] items-end gap-1.5 opacity-40 ${className || ""}`}
        aria-hidden
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex gap-0.5">
              <div
                className="rounded-sm bg-black/50"
                style={{ width: digit.width, height: digit.height }}
              />
              <div
                className="rounded-sm bg-black/50"
                style={{ width: digit.width, height: digit.height }}
              />
            </div>
            <div className="h-2 w-8 rounded bg-black/30" />
          </div>
        ))}
      </div>
    );
  }

  if (expired) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-white/25 bg-white/15 px-2 py-1 text-[11px] font-semibold text-white ${className || ""}`}
      >
        Terminé
      </span>
    );
  }

  return (
    <div
      className={`promo-flip-countdown ${className || ""}`}
      onClick={(e) => e.preventDefault()}
    >
      <FlipClockCountdown
        to={toMs}
        now={() => Date.now() + skewMs}
        labels={["Jours", "Heures", "Min", "Sec"]}
        labelStyle={{
          color: "#f5a623",
          fontSize: size === "md" ? 11 : 9,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
        digitBlockStyle={{
          width: digit.width,
          height: digit.height,
          fontSize: digit.fontSize,
          background: "#2a2a2a",
          color: "#eeeeee",
          borderRadius: 4,
          fontWeight: 700,
        }}
        dividerStyle={{ color: "rgba(0,0,0,0.45)", height: 1 }}
        separatorStyle={{ color: "rgba(255,255,255,0.35)", size: "0.35em" }}
        showSeparators={false}
        spacing={{ clock: size === "md" ? 10 : 6, digitBlock: 2 }}
        duration={0.55}
        stopOnHiddenVisibility
        renderOnServer={false}
        hideOnComplete
        onComplete={() => setExpired(true)}
      >
        <span className="inline-flex items-center rounded-md border border-white/25 bg-white/15 px-2 py-1 text-[11px] font-semibold text-white">
          Terminé
        </span>
      </FlipClockCountdown>
    </div>
  );
}
