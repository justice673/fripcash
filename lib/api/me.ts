"use client";

import { api } from "./client";

export type Me = {
  id: string;
  phone: string | null;
  email?: string | null;
  displayName: string;
  preferredLocale: "FR" | "EN";
  canBuy: boolean;
  seller: {
    /** Present when BE exposes it — used to list own annonces without sales. */
    profileId?: string;
    id?: string;
    kind: "particulier" | "boutique";
    shopKind: "standard" | "proximite" | "enseigne" | null;
    verificationStatus: "none" | "pending" | "approved" | "rejected";
    listingDestination: string | null;
    allowedDestinations: string[];
    capabilities: {
      createListing: boolean;
      excelImport: boolean;
      productLibrary: boolean;
      sellerDashboard: boolean;
    };
  } | null;
  courier: { verificationStatus: string; isAvailable: boolean } | null;
  isAdmin: boolean;
};

export async function fetchMe() {
  const { data } = await api.get<Me>("/me");
  return data;
}

export async function updateMe(body: {
  /** @deprecated Prefer `displayName` (from-be). Mapped to displayName. */
  name?: string;
  displayName?: string;
  preferredLocale?: "FR" | "EN";
  marketingOptIn?: boolean;
  zoneId?: string;
  address?: string;
}) {
  const { name, displayName, ...rest } = body;
  const { data } = await api.patch<Me>("/me", {
    ...rest,
    displayName: displayName ?? name,
  });
  return data;
}
