"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { FiPhone, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  sendOtp,
  verifyOtp,
  fetchMe,
  signInEmail,
  clearToken,
  type AuthUser,
} from "@/lib/api";
import { mapMeToUiUser, useAdminLogin } from "@/hooks/use-auth";
import {
  AUTH_COUNTRIES,
  AUTH_COUNTRY_OPTIONS,
  type AuthCountryId,
  fullPhoneFromLocal,
  isValidEmail,
  isValidLocalPhone,
  normalizeLocalPhone,
} from "@/lib/auth-country";
import { recordLoginSession } from "@/lib/admin-session-tracker";

const DEV_OTP =
  process.env.NODE_ENV === "development" ? "000000" : "";

/** Marketplace phone OTP is consumer-only (SRS auth surfaces). */
function rejectNonConsumerSession(user?: AuthUser | null): void {
  const audience = user?.authAudience?.toUpperCase();
  const kind = user?.userKind?.toUpperCase();
  if (audience === "COURIER" || kind === "COURIER") {
    clearToken();
    throw new Error(
      "Compte livreur — utilise l’app FripCash (Espace livreur). Ce site web est réservé aux acheteurs et vendeurs."
    );
  }
  if (audience === "ADMIN" || kind === "ADMIN") {
    clearToken();
    throw new Error(
      "Compte administrateur — connecte-toi avec email et mot de passe (pays France)."
    );
  }
}

function connexionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && !(err instanceof ApiError)) {
    return err.message;
  }
  if (!(err instanceof ApiError)) return fallback;

  const msg = (err.body.message || "").toLowerCase();
  const code = (err.body.code || "").toUpperCase();

  if (
    msg.includes("admin/login") ||
    msg.includes("staff account") ||
    msg.includes("staff accounts") ||
    code === "FORBIDDEN_AUDIENCE"
  ) {
    if (msg.includes("staff") || msg.includes("admin")) {
      return "Compte administrateur — utilise email + mot de passe (sélectionne France).";
    }
    return "Ce compte n’a pas accès à l’espace acheteur/vendeur. Livreurs : app FripCash.";
  }

  return err.body.message || fallback;
}
export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <ConnexionInner />
    </Suspense>
  );
}

function ConnexionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const adminLogin = useAdminLogin();

  const [countryId, setCountryId] = useState<AuthCountryId>(() =>
    searchParams.get("mode") === "email" ? "FR" : "GN"
  );
  const country = AUTH_COUNTRIES[countryId];
  const isEmailAuth = country.authMethod === "email";

  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [localPhone, setLocalPhone] = useState("");
  const [phoneSent, setPhoneSent] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(DEV_OTP);
  const [loading, setLoading] = useState(false);

  const handleCountryChange = (id: AuthCountryId) => {
    setCountryId(id);
    setStep("identifier");
    setLocalPhone("");
    setPhoneSent("");
    setEmail("");
    setPassword("");
    setCode(DEV_OTP);
  };

  const finishLogin = async (fallbackContact: string) => {
    try {
      const me = await fetchMe();
      const user = mapMeToUiUser(me);
      queryClient.setQueryData(["me"], user);
      recordLoginSession({
        email: me.phone ?? fallbackContact,
        displayName: me.displayName,
        role: me.seller ? "particulier" : "acheteur",
        userId: me.id,
      });
      toast("Connexion réussie !");
      if (!me.displayName || me.displayName === me.phone) {
        try {
          sessionStorage.setItem("fripcash_need_profile", "1");
        } catch {
          /* ignore */
        }
        router.push("/inscription");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      clearToken();
      if (err instanceof ApiError && err.body.code === "FORBIDDEN_AUDIENCE") {
        throw new Error(
          "Ce compte n’a pas accès à l’espace web acheteur/vendeur. Livreurs : utilise l’app (Espace livreur)."
        );
      }
      throw err;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLocalPhone(localPhone, country)) {
      toast(
        `Numéro invalide — ${country.maxLocalDigits} chiffres requis.`,
        "error"
      );
      return;
    }
    const phoneNumber = normalizeLocalPhone(localPhone, country);
    setLoading(true);
    try {
      await sendOtp(phoneNumber);
      setPhoneSent(phoneNumber);
      setStep("code");
      setCode(DEV_OTP);
      toast(
        process.env.NODE_ENV === "development"
          ? "Code envoyé (démo : 000000)."
          : "Code envoyé par SMS.",
        "success"
      );
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.body.message
          : "Impossible d'envoyer le code.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast("Adresse email invalide.", "error");
      return;
    }
    if (!password) {
      toast("Entre ton mot de passe.", "error");
      return;
    }
    setLoading(true);
    const trimmed = email.trim();
    try {
      // Staff first: POST /auth/admin/login (marketplace sign-in rejects staff).
      try {
        await adminLogin.mutateAsync({ email: trimmed, password });
        toast("Connexion réussie ! Bienvenue, Admin.");
        router.push("/admin");
        return;
      } catch {
        // Not staff or wrong admin creds — try consumer email sign-in.
      }

      const session = await signInEmail(trimmed, password);
      rejectNonConsumerSession(session.user);
      await finishLogin(trimmed);
    } catch (err) {
      toast(connexionErrorMessage(err, "Email ou mot de passe incorrect."), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\D/g, "").length !== 6) {
      toast("Entre le code à 6 chiffres.", "error");
      return;
    }
    setLoading(true);
    try {
      const session = await verifyOtp(phoneSent, code.replace(/\D/g, ""));
      rejectNonConsumerSession(session.user);
      await finishLogin(fullPhoneFromLocal(phoneSent, country));
    } catch (err) {
      if (err instanceof ApiError && err.body.code === "TOO_MANY_ATTEMPTS") {
        toast("Trop d'essais. Renvoie un code.", "error");
        setStep("identifier");
      } else {
        toast(connexionErrorMessage(err, "Code invalide."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Bon retour !</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEmailAuth
            ? "Connexion par email — comptes France et administrateurs."
            : "Connexion par SMS — même compte que l'app FripCash."}
        </p>
      </div>

      {step === "identifier" ? (
        <form
          onSubmit={isEmailAuth ? handleEmailLogin : handleSendOtp}
          className="space-y-4"
        >
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-foreground">
                {isEmailAuth ? "Adresse email" : "Numéro de téléphone"}
              </label>
              {isEmailAuth && (
                <Select
                  value={countryId}
                  onValueChange={(v) => handleCountryChange(v as AuthCountryId)}
                >
                  <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-1.5 shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:opacity-50">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="text-sm leading-none">{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {AUTH_COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span>
                            {c.name}
                            {c.authMethod === "phone" ? ` (${c.code})` : ""}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isEmailAuth ? (
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="toi@exemple.fr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="pl-9 h-11"
                />
              </div>
            ) : (
              <div className="relative flex">
                <Select
                  value={countryId}
                  onValueChange={(v) => handleCountryChange(v as AuthCountryId)}
                >
                  <SelectTrigger className="h-11 w-auto shrink-0 rounded-r-none border-r-0 bg-muted px-3 gap-1.5 shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:opacity-60">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="text-base leading-none">{country.flag}</span>
                      <span>{country.code}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span>
                            {c.name}
                            {c.authMethod === "phone" ? ` (${c.code})` : ""}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder={country.placeholder}
                    required
                    value={localPhone}
                    onChange={(e) =>
                      setLocalPhone(
                        normalizeLocalPhone(e.target.value, country)
                      )
                    }
                    maxLength={country.maxLocalDigits}
                    inputMode="numeric"
                    className="pl-9 h-11 rounded-l-none"
                  />
                </div>
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isEmailAuth
                ? "Email + mot de passe — admin et comptes France."
                : `${country.name} ${country.code} — tu recevras un code à 6 chiffres.`}
            </p>
          </div>

          {isEmailAuth && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ton mot de passe"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pl-9 pr-11 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <FiEyeOff className="h-4 w-4" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md"
          >
            {loading
              ? isEmailAuth
                ? "Connexion..."
                : "Envoi..."
              : isEmailAuth
                ? "Se connecter"
                : "Recevoir le code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Code envoyé au {country.label} {phoneSent}
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-xs rounded-md bg-muted px-3 py-2 text-muted-foreground">
              Dev : utilise <strong>000000</strong>
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Code SMS
            </label>
            <OtpInput
              value={code}
              onChange={setCode}
              disabled={loading}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md"
          >
            {loading ? "Vérification..." : "Continuer"}
          </Button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setStep("identifier")}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Changer de numéro
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Première fois ?{" "}
        <Link
          href="/inscription"
          className="font-semibold text-primary hover:underline"
        >
          S&apos;inscrire
        </Link>
        {isEmailAuth ? " — compte France (email)." : " — OTP SMS Guinée."}
      </p>
      {isEmailAuth && (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link
            href="/mot-de-passe-oublie"
            className="font-semibold text-primary hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </p>
      )}
      {!isEmailAuth && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin ou compte France ?{" "}
          <button
            type="button"
            onClick={() => handleCountryChange("FR")}
            className="font-semibold text-primary hover:underline"
          >
            Connexion par email
          </button>
        </p>
      )}
    </div>
  );
}
