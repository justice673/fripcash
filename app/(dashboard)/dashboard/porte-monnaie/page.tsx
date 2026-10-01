"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiArrowDownLeft, FiArrowUpRight, FiRefreshCw, FiGift, FiTrendingUp, FiTrendingDown, FiClock } from "react-icons/fi";
import { TbSend } from "react-icons/tb";
import { LiaWalletSolid } from "react-icons/lia";
import { useWalletBalance, useTransactions, useWithdraw } from "@/hooks/use-wallet";
import { useToast } from "@/components/ui/toast";

const typeConfig: Record<string, { label: string; icon: React.ElementType; iconColor: string; bgColor: string }> = {
  sale: { label: "Vente", icon: FiArrowDownLeft, iconColor: "text-emerald-600", bgColor: "bg-emerald-50" },
  withdrawal: { label: "Retrait", icon: FiArrowUpRight, iconColor: "text-orange-600", bgColor: "bg-orange-50" },
  refund: { label: "Remboursement", icon: FiRefreshCw, iconColor: "text-blue-600", bgColor: "bg-blue-50" },
  bonus: { label: "Bonus", icon: FiGift, iconColor: "text-violet-600", bgColor: "bg-violet-50" },
  commission: { label: "Commission", icon: FiArrowUpRight, iconColor: "text-red-600", bgColor: "bg-red-50" },
  escrow_block: { label: "Séquestre", icon: FiArrowUpRight, iconColor: "text-amber-600", bgColor: "bg-amber-50" },
  escrow_release: { label: "Libération", icon: FiArrowDownLeft, iconColor: "text-emerald-600", bgColor: "bg-emerald-50" },
};

const filterOptions = [
  { id: "all", label: "Toutes" },
  { id: "sale", label: "Ventes" },
  { id: "withdrawal", label: "Retraits" },
  { id: "refund", label: "Remboursements" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "Terminé", className: "text-foreground/60 bg-muted" },
  pending: { label: "En cours", className: "text-amber-700 bg-amber-50 border border-amber-200" },
  failed: { label: "Échoué", className: "text-red-700 bg-red-50 border border-red-200" },
};

export default function WalletPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");

  const { data: balanceData, isLoading: balanceLoading } = useWalletBalance();
  const { data: transactions = [], isLoading: txLoading } = useTransactions(filter === "all" ? undefined : filter);
  const withdrawMut = useWithdraw();

  const walletBalance = balanceData?.balance ?? 0;
  const availableBalance = balanceData?.availableBalance ?? balanceData?.balance ?? 0;
  const reservedBalance = balanceData?.reservedBalance ?? 0;

  const [activeCard, setActiveCard] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const totalIn = transactions
    .filter((t: any) => t.amount > 0 && t.status === "completed")
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalOut = transactions
    .filter((t: any) => t.amount < 0 && t.status === "completed")
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  const pendingCount = transactions.filter((t: any) => t.status === "pending").length;

  const walletCards = [
    { label: "Solde disponible", icon: LiaWalletSolid, iconBg: "bg-foreground/5", iconColor: "text-foreground/70", value: walletBalance, prefix: "", suffix: "GNF", desc: "Disponible pour retrait" },
    { label: "Revenus", icon: FiTrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", value: totalIn, prefix: "+", suffix: "F", desc: "Ventes, bonus & remboursements" },
    { label: "Retraits", icon: FiTrendingDown, iconBg: "bg-orange-50", iconColor: "text-orange-600", value: totalOut, prefix: "-", suffix: "F", desc: "Vers Mobile Money" },
    { label: "En attente", icon: FiClock, iconBg: "bg-amber-50", iconColor: "text-amber-600", value: pendingCount, prefix: "", suffix: `transaction${pendingCount !== 1 ? "s" : ""}`, desc: "En cours de traitement" },
  ];

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const cardWidth = el.scrollWidth / walletCards.length;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveCard(Math.min(index, walletCards.length - 1));
  }, [walletCards.length]);

  const scrollToCard = (index: number) => {
    if (!carouselRef.current) return;
    const cardWidth = carouselRef.current.scrollWidth / walletCards.length;
    carouselRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" });
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0) {
      showToast("Veuillez entrer un montant valide", "error");
      return;
    }
    if (amount > availableBalance) {
      showToast(reservedBalance > 0 ? "Solde disponible insuffisant (une partie est réservée pour tes commandes)" : "Solde insuffisant", "error");
      return;
    }
    if (!withdrawPhone?.trim()) {
      showToast("Numéro Orange Money requis", "error");
      return;
    }
    withdrawMut.mutate(
      { amount, phone: withdrawPhone.trim() },
      {
        onSuccess: () => {
          showToast(`Retrait de ${amount.toLocaleString("fr-FR")} GNF initié`, "success");
          setShowWithdraw(false);
          setWithdrawAmount("");
        },
        onError: (err: any) => {
          showToast(err.message || "Erreur lors du retrait", "error");
        },
      }
    );
  };

  if (balanceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Porte-monnaie</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre solde et vos transactions</p>
      </div>

      {/* Mobile: full-width snap carousel */}
      <div className="sm:hidden">
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none -mx-4 px-4 gap-3"
        >
          {walletCards.map((card, i) => (
            <div
              key={i}
              className="snap-center shrink-0 w-[calc(100vw-5.5rem)] rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground tracking-tight">
                {card.prefix}{card.value.toLocaleString("fr-FR")}
                <span className="text-sm font-medium text-muted-foreground ml-1">{card.suffix}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {walletCards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToCard(i)}
              className={`rounded-full transition-all duration-300 ${
                activeCard === i
                  ? "w-5 h-2 bg-foreground"
                  : "w-2 h-2 bg-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: grid layout */}
      <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {walletCards.map((card, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {card.prefix}{card.value.toLocaleString("fr-FR")}
              <span className="text-sm font-medium text-muted-foreground ml-1">{card.suffix}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Withdraw button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setShowWithdraw(true)}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-md group-hover:scale-105 group-active:scale-95 transition-transform">
            <TbSend className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Retirer des fonds
          </span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1 border-b border-border pb-px w-max sm:w-full">
          {filterOptions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap shrink-0 ${
                filter === f.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {filter === f.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Historique des transactions</h3>
          <span className="text-xs text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
        </div>
        {txLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx: any, i: number) => {
              const config = typeConfig[tx.type];
              const TxIcon = config?.icon || FiRefreshCw;
              const status = statusConfig[tx.status] || statusConfig.completed;
              return (
                <div
                  key={tx._id || i}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors ${
                    i < transactions.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config?.bgColor || "bg-muted"}`}>
                    <TxIcon className={`h-4.5 w-4.5 ${config?.iconColor || "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description || config?.label || tx.type}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt || tx.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 tabular-nums ${
                    tx.amount >= 0 ? "text-emerald-600" : "text-foreground"
                  }`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("fr-FR")} F
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw Dialog */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWithdraw(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-xl border border-border shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Retirer des fonds</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Solde : <span className="font-semibold text-foreground">{walletBalance.toLocaleString("fr-FR")} GNF</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Montant (GNF)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    placeholder="10 000"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Numéro Mobile Money</label>
                  <input
                    type="tel"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button type="button" onClick={() => setShowWithdraw(false)} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">Annuler</button>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawMut.isPending}
                  className="flex-1 h-11 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {withdrawMut.isPending ? "Envoi..." : "Retirer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
