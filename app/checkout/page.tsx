"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AppSheet } from "@/components/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/components/ui/toast";
import { useCheckout, useAddCartItem, useServerCart, cartToUiItems } from "@/hooks/use-cart";
import { useWalletBalance } from "@/hooks/use-wallet";
import { readToken } from "@/lib/api";
import type { FulfillmentMode } from "@/lib/api";
import { EmptyStateLottie } from "@/components/empty-state-lottie";
import {
  FiHome,
  FiShield,
  FiCreditCard,
  FiSmartphone,
  FiTrash2,
  FiArrowLeft,
  FiCheck,
  FiLock,
  FiTruck,
  FiPackage,
} from "react-icons/fi";
import { LuHandshake } from "react-icons/lu";

type DeliveryMode = "main-propre" | "buyer-delivery" | "seller-delivery";

type PaymentMethod = "mobile-money" | "card" | "wallet";

const MOBILE_OPERATORS = [
  {
    id: "mtn",
    label: "MTN MoMo",
    logo: "/images/payments/mtn.svg",
  },
  {
    id: "orange",
    label: "Orange Money",
    logo: "/images/payments/orange.svg",
  },
  {
    id: "moov",
    label: "Moov Money",
    logo: "/images/payments/moov.svg",
  },
  {
    id: "other",
    label: "Autre",
    logo: "/images/payments/autre.svg",
  },
] as const;
const deliveryModes: { id: DeliveryMode; icon: React.ElementType; label: string; description: string; detail: string }[] = [
  {
    id: "main-propre",
    icon: LuHandshake,
    label: "Main propre",
    description: "Tu te déplaces chez le vendeur pour récupérer l'article.",
    detail: "À la remise, confirme la réception dans ton tableau de bord pour libérer le paiement au vendeur.",
  },
  {
    id: "buyer-delivery",
    icon: FiTruck,
    label: "Livraison à tes frais",
    description: "Un livreur sera envoyé récupérer l'article et te le livrer.",
    detail: "À la livraison, confirme la réception dans ton tableau de bord pour libérer le paiement au vendeur.",
  },
  {
    id: "seller-delivery",
    icon: FiPackage,
    label: "Livraison par le vendeur",
    description: "Le vendeur organise lui-même la livraison. Les frais sont inclus dans le prix.",
    detail: "À la livraison, confirme la réception dans ton tableau de bord pour libérer le paiement au vendeur.",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const localCart = useCartStore();
  const { data: serverCart } = useServerCart();
  const checkoutApi = useCheckout();
  const addCartItem = useAddCartItem();
  const { data: walletData } = useWalletBalance();
  const walletBalance = walletData?.balance ?? 0;
  const availableBalance = (walletData?.availableBalance ?? walletData?.balance ?? 0);
  const loggedIn = typeof window !== "undefined" && !!readToken();
  const serverItems = cartToUiItems(serverCart);
  const useServer = loggedIn && serverItems.length > 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayItems = mounted
    ? useServer
      ? serverItems
      : localCart.items
    : [];
  const count = displayItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const sub = displayItems.reduce(
    (s, i) => s + i.price * (i.quantity || 1),
    0
  );
  const total = displayItems.reduce(
    (s, i) => s + i.priceWithShipping * (i.quantity || 1),
    0
  );
  const shippingFees = total - sub;

  const removeItem = (id: string | number) => localCart.removeItem(id);
  const clearCart = () => localCart.clearCart();
  const itemCount = () => count;
  const subtotal = () => sub;
  const totalWithShipping = () => total;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile-money");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("main-propre");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // Form state
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "Guinée",
    // Card fields
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    // Mobile money
    mobileNumber: "",
    mobileOperator: "mtn",
  });

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectedDelivery = deliveryModes.find((d) => d.id === deliveryMode)!;

  const handlePlaceOrder = async () => {
    // Basic validation
    if (!form.fullName.trim() || !form.phone.trim() || !form.city.trim()) {
      toast("Remplis tous les champs obligatoires.", "error");
      return;
    }

    // Address required for delivery modes
    if (deliveryMode !== "main-propre" && !form.address.trim()) {
      toast("Remplis ton adresse de livraison.", "error");
      return;
    }

    if (paymentMethod === "card" && (!form.cardNumber || !form.cardExpiry || !form.cardCvc)) {
      toast("Remplis les informations de ta carte.", "error");
      return;
    }

    if (paymentMethod === "mobile-money" && !form.mobileNumber) {
      toast("Saisis ton numéro Mobile Money.", "error");
      return;
    }

    // Wallet: check available balance before creating orders
    const orderTotal = mounted ? totalWithShipping() : 0;
    if (paymentMethod === "wallet" && availableBalance < orderTotal) {
      toast("Solde insuffisant dans ton porte-monnaie.", "error");
      return;
    }

    setIsProcessing(true);

    try {
      // Sync local cart lines to server cart when needed
      if (!useServer) {
        for (const item of displayItems) {
          try {
            await addCartItem.mutateAsync({
              listingId: String(item.id),
              quantity: item.quantity || 1,
            });
          } catch {
            /* item may already be on server cart */
          }
        }
      }

      const fulfillmentMode: FulfillmentMode =
        deliveryMode === "main-propre"
          ? "pickup"
          : deliveryMode === "seller-delivery"
            ? "shopLocalDelivery"
            : "courier";

      const phone =
        paymentMethod === "mobile-money"
          ? form.mobileNumber
          : form.phone;
      const normalizedPhone = phone.startsWith("+")
        ? phone
        : `+224${phone.replace(/^0+/, "")}`;

      const res = await checkoutApi.mutateAsync({
        fulfillmentMode,
        address: {
          name: form.fullName.trim(),
          phone: form.phone.startsWith("+")
            ? form.phone
            : `+224${form.phone.replace(/^0+/, "")}`,
          ...(deliveryMode !== "main-propre"
            ? {
                zoneId: form.city || "zone_1",
                manualAddress: form.address.trim(),
                landmark: form.city || undefined,
              }
            : {}),
        },
        orangeMoneyPhone: normalizedPhone,
      });
      const orders = Array.isArray((res as any)?.orders)
        ? (res as any).orders
        : [];
      const createdIds = orders.map(
        (o: any) => o.id || o._id || `ord_${Date.now()}`
      );

      clearCart();
      setOrderNumber(
        createdIds.length === 1
          ? createdIds[0]
          : createdIds.length > 0
            ? `${createdIds.length} commandes`
            : "commande"
      );
      setOrderPlaced(true);
      toast("Paiement sécurisé en attente de livraison", "success");
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la commande.";
      toast(msg, "error");
      if (err?.status === 401) {
        router.push(`/connexion?redirect=${encodeURIComponent("/checkout")}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /* ─── Order confirmed screen (Escrow) ─── */
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <AppSheet />

        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg mx-auto px-4 py-16">
            {/* Lock icon for escrow */}
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 mx-auto mb-6">
              <FiLock className="h-10 w-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Paiement sécurisé en séquestre
            </h1>
            <p className="text-muted-foreground mb-4">
              Ton paiement a été reçu et <span className="font-semibold text-foreground">bloqué en toute sécurité</span> jusqu&apos;à
              ce que tu confirmes la réception de l&apos;article.
            </p>

            {/* Order details */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">N° de commande</span>
                <span className="font-semibold text-foreground">{orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mode de livraison</span>
                <span className="font-medium text-foreground">{selectedDelivery.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Statut du paiement</span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                  <FiLock className="h-3.5 w-3.5" />
                  Bloqué en séquestre
                </span>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8 text-left">
              <p className="text-sm font-semibold text-foreground mb-2">Comment ça fonctionne ?</p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Ton paiement est <span className="font-medium text-foreground">débité tout de suite</span> et bloqué en séquestre chez FripCash</li>
                <li>Le vendeur prépare / envoie l&apos;article</li>
                <li>À la réception, tu appuies sur <span className="font-medium text-foreground">Confirmer la réception</span> dans ton tableau de bord</li>
                <li>Le paiement est alors <span className="font-medium text-foreground">libéré vers le vendeur</span> (ou tu ouvres un litige si problème)</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="rounded-full px-6">
                <Link href="/dashboard/commandes">Suivre ma commande</Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="rounded-full px-6"
              >
                <Link href="/">Continuer mes achats</Link>
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  /* ─── Loading / Empty cart ─── */
  if (!mounted || count === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <AppSheet />

        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4 py-20">
            {!mounted ? (
              <div className="flex items-center justify-center">
                <span className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="w-56 h-56 mx-auto mb-4">
                  <EmptyStateLottie />
                </div>
                <h1 className="text-2xl font-bold text-primary mb-2">
                  Ton panier est vide
                </h1>
                <p className="text-primary mb-6">
                  Ajoute des articles à ton panier pour passer commande.
                </p>
                <Button asChild className="rounded-full px-6">
                  <Link href="/">Découvrir les articles</Link>
                </Button>
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  /* ─── Checkout page ─── */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <AppSheet />

      <main className="flex-1">
        <div className="container mx-auto px-4 pt-6 pb-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <FiHome className="h-3.5 w-3.5" />
              Accueil
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Paiement</span>
          </nav>

          <div className="flex items-center gap-2 mb-8">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.back()}
            >
              <FiArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Finaliser ta commande
            </h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* ─── Left: Forms ─── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping info */}
              <section className="border border-border rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-foreground mb-6">
                  Informations de livraison
                </h2>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">Nom complet *</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="Jean Dupont"
                      className="mt-2 h-12 px-4 text-base rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+224 6XX XXX XXX"
                      className="mt-2 h-12 px-4 text-base rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="jean@exemple.com"
                      className="mt-2 h-12 px-4 text-base rounded-xl"
                    />
                  </div>

                  {deliveryMode !== "main-propre" && (
                    <div className="sm:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium">Adresse de livraison *</Label>
                      <Input
                        id="address"
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="Quartier, rue, numéro..."
                        className="mt-2 h-12 px-4 text-base rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="city" className="text-sm font-medium">Ville *</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Conakry"
                      className="mt-2 h-12 px-4 text-base rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-sm font-medium">Pays</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      className="mt-2 h-12 px-4 text-base rounded-xl"
                    />
                  </div>
                </div>
              </section>

              {/* ─── Delivery mode ─── */}
              <section className="border border-border rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-foreground mb-2">
                  Mode de livraison
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Choisis comment tu souhaites recevoir ton article.
                </p>

                <div className="space-y-3">
                  {deliveryModes.map((mode) => {
                    const isSelected = deliveryMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDeliveryMode(mode.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            <mode.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {mode.label}
                              </p>
                              {isSelected && (
                                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white">
                                  <FiCheck className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {mode.description}
                            </p>
                            {isSelected && (
                              <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                <FiShield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                  {mode.detail}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Escrow info banner */}
                <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <FiLock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Protection séquestre</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      L&apos;argent est débité immédiatement et bloqué chez FripCash jusqu&apos;à ta confirmation.
                      Le vendeur ne reçoit le paiement qu&apos;après que tu aies validé la réception (bouton dans tes commandes).
                    </p>
                  </div>
                </div>
              </section>

              {/* Payment method */}
              <section className="border border-border rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Mode de paiement
                </h2>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {([
                    { id: "mobile-money" as PaymentMethod, icon: FiSmartphone, label: "Mobile Money" },
                    { id: "card" as PaymentMethod, icon: FiCreditCard, label: "Carte" },
                    { id: "wallet" as PaymentMethod, icon: FiShield, label: "Solde FripCash" },
                  ]).map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border transition-all text-sm font-medium ${
                        paymentMethod === pm.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <pm.icon className="h-4 w-4" />
                      {pm.label}
                    </button>
                  ))}
                </div>

                {/* Payment fields */}
                {paymentMethod === "mobile-money" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Opérateur</Label>
                      <Select
                        value={form.mobileOperator}
                        onValueChange={(v) => updateField("mobileOperator", v)}
                      >
                        <SelectTrigger className="mt-2 h-12 rounded-xl px-3">
                          <span className="flex items-center gap-3 min-w-0">
                            {(() => {
                              const op = MOBILE_OPERATORS.find(
                                (o) => o.id === form.mobileOperator
                              );
                              return op ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={op.logo}
                                  alt=""
                                  className="h-7 w-7 shrink-0 object-contain rounded-md bg-white border border-border"
                                />
                              ) : null;
                            })()}
                            <SelectValue placeholder="Choisir un opérateur" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {MOBILE_OPERATORS.map((op) => (
                            <SelectItem key={op.id} value={op.id}>
                              <span className="flex items-center gap-3 py-0.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={op.logo}
                                  alt=""
                                  className="h-7 w-7 object-contain rounded-md bg-white"
                                />
                                <span>{op.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="mobileNumber" className="text-sm font-medium">
                        Numéro Mobile Money *
                      </Label>
                      <Input
                        id="mobileNumber"
                        type="tel"
                        value={form.mobileNumber}
                        onChange={(e) =>
                          updateField("mobileNumber", e.target.value)
                        }
                        placeholder="6XX XXX XXX"
                        className="mt-2 h-12 px-4 text-base rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber" className="text-sm font-medium">Numéro de carte *</Label>
                      <Input
                        id="cardNumber"
                        value={form.cardNumber}
                        onChange={(e) =>
                          updateField("cardNumber", e.target.value)
                        }
                        placeholder="4242 4242 4242 4242"
                        className="mt-2 h-12 px-4 text-base rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cardExpiry" className="text-sm font-medium">Expiration *</Label>
                        <Input
                          id="cardExpiry"
                          value={form.cardExpiry}
                          onChange={(e) =>
                            updateField("cardExpiry", e.target.value)
                          }
                          placeholder="MM/AA"
                          className="mt-2 h-12 px-4 text-base rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cardCvc" className="text-sm font-medium">CVC *</Label>
                        <Input
                          id="cardCvc"
                          value={form.cardCvc}
                          onChange={(e) =>
                            updateField("cardCvc", e.target.value)
                          }
                          placeholder="123"
                          className="mt-2 h-12 px-4 text-base rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "wallet" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <FiShield className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Solde FripCash : {walletBalance.toLocaleString("fr-FR")} GNF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Débité de ton porte-monnaie, puis bloqué en séquestre jusqu&apos;à confirmation de réception.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* ─── Right: Order summary ─── */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 border border-border rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-foreground">
                  Résumé de la commande
                </h2>

                {/* Items */}
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {displayItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-2 rounded-lg"
                    >
                      <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.brand}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.brand}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qté : {item.quantity}
                          {"size" in item && item.size ? ` · ${item.size}` : ""}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                          {(item.price * item.quantity).toLocaleString("fr-FR")} GNF
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Delivery mode badge */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                  <selectedDelivery.icon className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-foreground">{selectedDelivery.label}</p>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Sous-total ({count} article{count > 1 ? "s" : ""})
                    </span>
                    <span className="font-medium">{sub.toLocaleString("fr-FR")} GNF</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="font-medium">
                      {shippingFees.toLocaleString("fr-FR")} GNF
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold border-t pt-3">
                    <span>Total</span>
                    <span className="text-primary">
                      {total.toLocaleString("fr-FR")} GNF
                    </span>
                  </div>
                </div>

                {/* Place order button */}
                <Button
                  className="w-full h-12 rounded-full font-semibold text-base gap-2"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <FiLock className="h-4 w-4" />
                      Payer {total.toLocaleString("fr-FR")} GNF
                    </>
                  )}
                </Button>

                {/* Security note */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FiShield className="h-3.5 w-3.5 shrink-0" />
                  <p>
                    Paiement bloqué en séquestre jusqu&apos;à confirmation de réception.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
