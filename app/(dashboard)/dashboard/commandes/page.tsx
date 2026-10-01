"use client";

import { useState } from "react";
import {
  useMyOrders,
  useConfirmDelivery,
  useShipOrder,
  usePrepareOrder,
  useAssignCourier,
  useOpenDispute,
  useSellerRefund,
} from "@/hooks/use-orders";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiLock,
  FiUnlock,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { LuHandshake } from "react-icons/lu";
import { GetAppBanner } from "@/components/dashboard/get-app-banner";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-auth";
import Link from "next/link";

type DeliveryMode = "main-propre" | "buyer-delivery" | "seller-delivery";

const orderTabs = [
  { id: "all", label: "Toutes" },
  { id: "purchase", label: "Mes achats" },
  { id: "sale", label: "Mes ventes" },
];

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive";
    icon: React.ElementType;
  }
> = {
  ordered: { label: "Commandé", variant: "secondary", icon: FiClock },
  paid: { label: "Payé (séquestre)", variant: "default", icon: FiLock },
  sellerNotified: { label: "Vendeur notifié", variant: "default", icon: FiPackage },
  preparing: { label: "Préparation", variant: "default", icon: FiPackage },
  readyForPickup: { label: "Prêt à récupérer", variant: "default", icon: FiPackage },
  courierAssigned: { label: "Livreur assigné", variant: "default", icon: FiTruck },
  collected: { label: "Collecté", variant: "default", icon: FiTruck },
  inTransit: { label: "En livraison", variant: "default", icon: FiTruck },
  delivered: { label: "Livré", variant: "default", icon: FiCheckCircle },
  fundsReleased: { label: "Fonds libérés", variant: "default", icon: FiUnlock },
  feedbackPending: { label: "Avis en attente", variant: "default", icon: FiShield },
  disputed: { label: "En litige", variant: "destructive", icon: FiAlertTriangle },
  refunded: { label: "Remboursé", variant: "secondary", icon: FiPackage },
};

const deliveryModeLabels: Record<
  DeliveryMode,
  { label: string; icon: React.ElementType }
> = {
  "main-propre": { label: "Main propre", icon: LuHandshake },
  "buyer-delivery": { label: "Livraison FripCash", icon: FiTruck },
  "seller-delivery": { label: "Livraison vendeur", icon: FiPackage },
};

const statusFilters = [
  "paid",
  "preparing",
  "courierAssigned",
  "inTransit",
  "fundsReleased",
  "disputed",
  "refunded",
];

const paymentLabels: Record<string, string> = {
  "mobile-money": "Mobile Money",
  card: "Carte",
  wallet: "Solde FripCash",
};

function getOtherParty(order: any, type: "purchase" | "sale"): string {
  if (type === "purchase") {
    return typeof order.seller === "object"
      ? order.seller.pseudo || "Vendeur"
      : "Vendeur";
  }
  return typeof order.buyer === "object"
    ? order.buyer.pseudo || "Acheteur"
    : "Acheteur";
}

function getArticleTitle(order: any): string {
  if (typeof order.article === "object" && order.article?.title) {
    return order.article.title;
  }
  return "Article";
}

function getArticleImage(order: any): string {
  if (typeof order.article === "object" && order.article.images?.length > 0) {
    return order.article.images[0];
  }
  return "";
}

function escrowLabel(escrowStatus: string) {
  if (escrowStatus === "blocked") return "Bloqué en séquestre";
  if (escrowStatus === "refunded") return "Remboursé à l'acheteur";
  return "Paiement libéré";
}

export default function MyOrdersPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useMe();
  const isSeller = !!me?.seller;
  const { data: orders, isLoading } = useMyOrders({ isSeller });
  const confirmDelivery = useConfirmDelivery();
  const shipOrder = useShipOrder();
  const prepareOrder = usePrepareOrder();
  const assignCourier = useAssignCourier();
  const openDispute = useOpenDispute();
  const sellerRefund = useSellerRefund();

  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [pickedCourier, setPickedCourier] = useState("Livreur FripCash");

  // Buyer-only: never stay on "Mes ventes"
  const effectiveTab =
    !isSeller && activeTab === "sale" ? "purchase" : activeTab;
  const enrichOne = (o: any) => {
    const type: "purchase" | "sale" =
      o.role === "seller" ? "sale" : "purchase";
    return {
      ...o,
      type,
      otherParty: getOtherParty(o, type),
      articleTitle: getArticleTitle(o),
      articleImage: getArticleImage(o),
    };
  };

  const enrichedOrders = (orders || []).map(enrichOne);

  const filtered = enrichedOrders
    .filter((o: any) => effectiveTab === "all" || o.type === effectiveTab)
    .filter((o: any) => statusFilter === "all" || o.status === statusFilter);

  const afterAction = (msg: string, orderId: string) => {
    showToast(msg, "success");
    setShowDisputeForm(false);
    setDisputeReason("");
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    const fresh = (orders || []).find(
      (o: any) => o._id === orderId || o.id === orderId
    );
    if (fresh) setSelectedOrder(enrichOne(fresh));
    else setSelectedOrder(null);
  };

  const handleConfirmReception = (order: any) => {
    confirmDelivery.mutate(
      { id: order._id },
      {
        onSuccess: () =>
          afterAction(
            "Réception confirmée — paiement libéré vers le vendeur.",
            order._id
          ),
        onError: (err: any) =>
          showToast(err.message || "Impossible de confirmer.", "error"),
      }
    );
  };

  const handlePrepare = (order: any) => {
    prepareOrder.mutate(
      { id: order._id },
      {
        onSuccess: () => afterAction("Commande en préparation.", order._id),
        onError: (err: any) => showToast(err.message || "Erreur", "error"),
      }
    );
  };

  const handleAssignCourier = (order: any) => {
    assignCourier.mutate(
      { id: order._id, courierName: pickedCourier },
      {
        onSuccess: () =>
          afterAction(`Livreur assigné : ${pickedCourier}.`, order._id),
        onError: (err: any) => showToast(err.message || "Erreur", "error"),
      }
    );
  };

  const handleMarkShipped = (order: any) => {
    shipOrder.mutate(
      { id: order._id },
      {
        onSuccess: () =>
          afterAction("Commande marquée en livraison.", order._id),
        onError: (err: any) => showToast(err.message || "Erreur", "error"),
      }
    );
  };

  const handleOpenDispute = (order: any) => {
    const reason = disputeReason.trim() || "Problème à la réception";
    openDispute.mutate(
      { orderId: order._id, reason },
      {
        onSuccess: () =>
          afterAction(
            "Litige ouvert — l'argent reste bloqué en séquestre.",
            order._id
          ),
        onError: (err: any) => showToast(err.message || "Erreur", "error"),
      }
    );
  };

  const handleSellerRefund = (order: any) => {
    sellerRefund.mutate(
      { id: order._id },
      {
        onSuccess: () =>
          afterAction("Remboursement effectué (démo).", order._id),
        onError: (err: any) => showToast(err.message || "Erreur", "error"),
      }
    );
  };

  if (isLoading || meLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const visibleTabs = isSeller
    ? orderTabs
    : orderTabs.filter((t) => t.id !== "sale");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes commandes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSeller
            ? "Démo suivi — achats & ventes (séquestre, livreur, litige)"
            : "Démo suivi acheteur — séquestre, confirmation et litige"}
        </p>
      </div>

      <GetAppBanner
        compact
        title="Tu es livreur ?"
        description="Missions, gains et disponibilité se gèrent uniquement dans l’application mobile."
      />

      {!isSeller && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Compte acheteur — les commandes vendeur (préparation, livreur) apparaissent
            après activation du profil vendeur.
          </p>
          <Link
            href="/dashboard/parametres"
            className="h-9 px-4 inline-flex items-center justify-center rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 shrink-0"
          >
            Devenir vendeur
          </Link>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border">
        {visibleTabs.map((tab) => {
          const count =
            tab.id === "all"
              ? enrichedOrders.length
              : enrichedOrders.filter((o: any) => o.type === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                effectiveTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1">
        <span className="text-sm text-muted-foreground shrink-0">Statut :</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Tous
          </button>
          {statusFilters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Aucune commande trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order: any) => {
            const config = statusConfig[order.status as string];
            const StatusIcon = config?.icon || FiPackage;
            const deliveryInfo =
              deliveryModeLabels[order.deliveryMode as DeliveryMode];
            const DeliveryIcon = deliveryInfo?.icon || FiPackage;
            return (
              <div
                key={order._id}
                className="rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowDisputeForm(false);
                  setDisputeReason("");
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {order.articleImage && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={order.articleImage}
                        alt={order.articleTitle}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {order.articleTitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.type === "purchase" ? "Acheté à" : "Vendu à"}{" "}
                          <span className="font-medium text-foreground">
                            {order.otherParty}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant={config?.variant || "secondary"}
                        className="shrink-0 text-[10px]"
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config?.label || order.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {(order.amount || 0).toLocaleString("fr-FR")} GNF
                        </p>
                        {order.escrowStatus === "blocked" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            <FiLock className="h-2.5 w-2.5 shrink-0" /> Séquestre
                          </span>
                        )}
                        {order.escrowStatus === "released" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            <FiUnlock className="h-2.5 w-2.5 shrink-0" /> Libéré
                          </span>
                        )}
                        {order.escrowStatus === "refunded" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Remboursé
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <DeliveryIcon className="h-3 w-3 shrink-0" />
                          {deliveryInfo?.label}
                        </span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 bg-background rounded-xl border border-border shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Commande #{selectedOrder._id?.replace("ord_demo_", "").slice(0, 12)}
              </h3>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                  {selectedOrder.articleImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedOrder.articleImage}
                      alt={selectedOrder.articleTitle}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.articleTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.type === "purchase"
                      ? "Vendu par"
                      : "Acheté par"}{" "}
                    {selectedOrder.otherParty}
                  </p>
                  <Badge
                    variant={
                      statusConfig[selectedOrder.status as string]?.variant ||
                      "secondary"
                    }
                    className="mt-1 text-[10px]"
                  >
                    {statusConfig[selectedOrder.status as string]?.label ||
                      selectedOrder.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-medium">
                    {(selectedOrder.amount || 0).toLocaleString("fr-FR")} GNF
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-medium">
                    {(selectedOrder.shippingCost || 0).toLocaleString("fr-FR")}{" "}
                    GNF
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                  <span>Total</span>
                  <span className="text-primary">
                    {(
                      (selectedOrder.amount || 0) +
                      (selectedOrder.shippingCost || 0)
                    ).toLocaleString("fr-FR")}{" "}
                    GNF
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paiement</span>
                  <span className="font-medium">
                    {paymentLabels[selectedOrder.paymentMethod] ||
                      selectedOrder.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mode de livraison</span>
                  <span className="font-medium flex items-center gap-1">
                    {(() => {
                      const dInfo =
                        deliveryModeLabels[
                          selectedOrder.deliveryMode as DeliveryMode
                        ];
                      if (!dInfo) return "—";
                      const DIcon = dInfo.icon;
                      return (
                        <>
                          <DIcon className="h-3.5 w-3.5 text-primary" />{" "}
                          {dInfo.label}
                        </>
                      );
                    })()}
                  </span>
                </div>
                {selectedOrder.courierName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Livreur</span>
                    <span className="font-medium flex items-center gap-1">
                      <FiUser className="h-3.5 w-3.5" />
                      {selectedOrder.courierName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Séquestre</span>
                  <span
                    className={`font-medium flex items-center gap-1 ${
                      selectedOrder.escrowStatus === "blocked"
                        ? "text-amber-600"
                        : selectedOrder.escrowStatus === "refunded"
                          ? "text-muted-foreground"
                          : "text-green-600"
                    }`}
                  >
                    {selectedOrder.escrowStatus === "blocked" ? (
                      <FiLock className="h-3 w-3" />
                    ) : (
                      <FiUnlock className="h-3 w-3" />
                    )}
                    {escrowLabel(selectedOrder.escrowStatus)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span>
                    {new Date(selectedOrder.createdAt).toLocaleDateString(
                      "fr-FR",
                      { day: "numeric", month: "long", year: "numeric" }
                    )}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              {Array.isArray(selectedOrder.timeline) &&
                selectedOrder.timeline.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl border border-border bg-muted/30">
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Suivi
                    </p>
                    <ul className="space-y-2">
                      {selectedOrder.timeline.map(
                        (
                          step: { at: string; label: string },
                          i: number
                        ) => (
                          <li key={`${step.at}-${i}`} className="flex gap-2 text-xs">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <div>
                              <p className="text-foreground">{step.label}</p>
                              <p className="text-muted-foreground">
                                {new Date(step.at).toLocaleString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {/* SELLER actions */}
              {isSeller &&
                selectedOrder.type === "sale" &&
                selectedOrder.escrowStatus === "blocked" &&
                selectedOrder.status !== "disputed" && (
                  <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FiShield className="h-4 w-4 text-primary" />
                      Actions vendeur
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Le paiement reste en séquestre jusqu&apos;à confirmation
                      acheteur (ou litige / remboursement).
                    </p>

                    {(selectedOrder.status === "paid" ||
                      selectedOrder.status === "sellerNotified") && (
                      <button
                        type="button"
                        onClick={() => handlePrepare(selectedOrder)}
                        disabled={prepareOrder.isPending}
                        className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        Marquer en préparation
                      </button>
                    )}

                    {(selectedOrder.status === "paid" ||
                      selectedOrder.status === "preparing" ||
                      selectedOrder.status === "sellerNotified") &&
                      selectedOrder.deliveryMode === "buyer-delivery" && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            La prise en charge livreur se fait côté app livreur /
                            Nest — marque la commande prête pour la remise.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAssignCourier(selectedOrder)}
                            disabled={assignCourier.isPending}
                            className="w-full h-10 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <FiTruck className="h-4 w-4" />
                            Marquer prêt (livraison)
                          </button>
                        </div>
                      )}

                    {(selectedOrder.status === "courierAssigned" ||
                      selectedOrder.status === "preparing" ||
                      selectedOrder.status === "collected") && (
                      <button
                        type="button"
                        onClick={() => handleMarkShipped(selectedOrder)}
                        disabled={shipOrder.isPending}
                        className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <FiTruck className="h-4 w-4" />
                        Marquer en livraison
                      </button>
                    )}

                    {selectedOrder.status === "inTransit" && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        En attente de la confirmation de réception par
                        l&apos;acheteur.
                      </p>
                    )}
                  </div>
                )}

              {/* SELLER dispute / refund */}
              {isSeller &&
                selectedOrder.type === "sale" &&
                selectedOrder.status === "disputed" && (
                  <div className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
                    <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <FiAlertTriangle className="h-4 w-4" />
                      Litige en cours
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedOrder.disputeReason ||
                        "L’acheteur a signalé un problème. Fonds toujours bloqués."}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSellerRefund(selectedOrder)}
                      disabled={sellerRefund.isPending}
                      className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Rembourser l&apos;acheteur (démo)
                    </button>
                  </div>
                )}

              {/* BUYER actions */}
              {selectedOrder.type === "purchase" &&
                selectedOrder.escrowStatus === "blocked" &&
                selectedOrder.status !== "disputed" && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FiLock className="h-4 w-4 text-amber-600" />
                      Ton paiement est en séquestre
                    </p>
                    <p className="text-xs text-muted-foreground">
                      L&apos;argent a été débité mais n&apos;est pas encore versé
                      au vendeur. Confirme la réception ou ouvre un litige.
                    </p>

                    {(selectedOrder.status === "inTransit" ||
                      selectedOrder.status === "courierAssigned" ||
                      selectedOrder.status === "collected") && (
                      <button
                        type="button"
                        onClick={() => handleConfirmReception(selectedOrder)}
                        disabled={confirmDelivery.isPending}
                        className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <FiCheckCircle className="h-4 w-4" />
                        Confirmer la réception
                      </button>
                    )}

                    {!showDisputeForm ? (
                      <button
                        type="button"
                        onClick={() => setShowDisputeForm(true)}
                        className="w-full h-10 rounded-lg border border-amber-300 bg-white text-amber-800 text-sm font-medium hover:bg-amber-100 flex items-center justify-center gap-2"
                      >
                        <FiAlertTriangle className="h-4 w-4" />
                        Ouvrir un litige
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="Décris le problème…"
                          className="w-full min-h-20 rounded-lg border border-border bg-background p-3 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenDispute(selectedOrder)}
                          disabled={openDispute.isPending}
                          className="w-full h-10 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
                        >
                          Envoyer le litige
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {selectedOrder.type === "purchase" &&
                selectedOrder.status === "disputed" && (
                  <div className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <FiAlertTriangle className="h-4 w-4" />
                      Litige ouvert
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedOrder.disputeReason}
                      <br />
                      Tes fonds restent bloqués en séquestre jusqu&apos;à
                      résolution.
                    </p>
                  </div>
                )}

              {selectedOrder.escrowStatus === "released" && (
                <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                    <FiCheckCircle className="h-4 w-4" />
                    {selectedOrder.type === "sale"
                      ? "Livraison confirmée — paiement reçu"
                      : "Réception confirmée — paiement libéré"}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full mt-6 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
