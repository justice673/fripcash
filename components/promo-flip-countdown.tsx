"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";

const FlipClockCountdown = dynamic(
  () => import("@leenguyen/react-flip-clock-countdown"),
  { ssr: false, loading: () => <FlipSkeleton size="xs" /> }
);

type PromoFlipCountdownProps = {
  endsAt: string;
  serverNow?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
};

function digitSize(size: "xs" | "sm" | "md") {
  if (size === "md") return { width: 40, height: 56, fontSize: 32 };
  if (size === "sm") return { width: 26, height: 36, fontSize: 20 };
  return { width: 16, height: 22, fontSize: 13 };
}

function FlipSkeleton({ size }: { size: "xs" | "sm" | "md" }) {
  const digit = digitSize(size);
  const h = size === "xs" ? 34 : 52;
  return (
    <div
      className="flex items-end gap-1 opacity-40"
      style={{ height: h }}
      aria-hidden
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className="flex gap-px">
            <div
              className="rounded-sm bg-black/50"
              style={{ width: digit.width, height: digit.height }}
            />
            <div
              className="rounded-sm bg-black/50"
              style={{ width: digit.width, height: digit.height }}
            />
          </div>
          <div
            className="rounded bg-black/30"
            style={{ height: 4, width: size === "xs" ? 20 : 32 }}
          />
        </div>
      ))}
    </div>
  );
}

function ExpiredBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-white/25 bg-white/15 px-2 py-1 text-[11px] font-semibold text-white ${className || ""}`}
    >
      Terminé
    </span>
  );
}

/** Plain text fallback if the flip library blows up (seen on some iOS Safari builds). */
function TextCountdownFallback({
  endsAt,
  serverNow,
  className,
}: {
  endsAt: string;
  serverNow?: string;
  className?: string;
}) {
  const skewMs = (() => {
    if (!serverNow) return 0;
    const server = new Date(serverNow).getTime();
    return Number.isNaN(server) ? 0 : server - Date.now();
  })();
  const ms = new Date(endsAt).getTime() - (Date.now() + skewMs);
  if (ms <= 0) return <ExpiredBadge className={className} />;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}j`);
  parts.push(`${h}h`, `${m}min`, `${s}s`);
  return (
    <span
      className={`inline-flex items-center rounded-md border border-white/25 bg-white/15 px-2 py-1 text-[11px] font-semibold tabular-nums text-white ${className || ""}`}
    >
      {parts.join(" ")}
    </span>
  );
}

class FlipErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * 3D flip countdown (days / hours / minutes / seconds).
 * Dynamic client import + error boundary — keeps home from white-screening on Safari.
 */
export function PromoFlipCountdown({
  endsAt,
  serverNow,
  className,
  size = "xs",
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

  const digit = digitSize(size);
  const labelFont = size === "md" ? 11 : size === "sm" ? 9 : 7;
  const labels: [string, string, string, string] =
    size === "xs"
      ? ["J", "H", "M", "S"]
      : ["Jours", "Heures", "Min", "Sec"];
  const textFallback = (
    <TextCountdownFallback
      endsAt={endsAt}
      serverNow={serverNow}
      className={className}
    />
  );

  if (!mounted) {
    return (
      <div className={className}>
        <FlipSkeleton size={size} />
      </div>
    );
  }

  if (expired) return <ExpiredBadge className={className} />;

  return (
    <FlipErrorBoundary fallback={textFallback}>
      <div
        className={`promo-flip-countdown ${className || ""}`}
        onClick={(e) => e.preventDefault()}
      >
        <FlipClockCountdown
          to={toMs}
          now={() => Date.now() + skewMs}
          labels={labels}
          labelStyle={{
            color: "#f5a623",
            fontSize: labelFont,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
          digitBlockStyle={{
            width: digit.width,
            height: digit.height,
            fontSize: digit.fontSize,
            background: "#2a2a2a",
            color: "#eeeeee",
            borderRadius: size === "xs" ? 3 : 4,
            fontWeight: 700,
          }}
          dividerStyle={{ color: "rgba(0,0,0,0.45)", height: 1 }}
          separatorStyle={{ color: "rgba(255,255,255,0.35)", size: "0.35em" }}
          showSeparators={false}
          spacing={{
            clock: size === "md" ? 10 : size === "sm" ? 6 : 3,
            digitBlock: size === "xs" ? 1 : 2,
          }}
          duration={0.55}
          stopOnHiddenVisibility
          renderOnServer={false}
          hideOnComplete
          onComplete={() => setExpired(true)}
        >
          <ExpiredBadge />
        </FlipClockCountdown>
      </div>
    </FlipErrorBoundary>
  );
}
