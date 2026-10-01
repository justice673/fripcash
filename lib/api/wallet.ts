"use client";

import { api } from "./client";

export async function fetchWalletBalance() {
  // Canonical from-be: GET /wallet (balance alias kept as fallback).
  try {
    const { data } = await api.get("/wallet");
    return data;
  } catch {
    const { data } = await api.get("/wallet/balance");
    return data;
  }
}

export async function fetchWalletLedger(params?: {
  type?: string;
  cursor?: string;
  limit?: number;
}) {
  const { data } = await api.get("/wallet/ledger", { params });
  return data;
}

export async function requestWithdraw(
  amountGnf: number,
  orangeMoneyPhone: string,
  idempotencyKey?: string
) {
  const { data } = await api.post(
    "/wallet/withdraw",
    { amountGnf, orangeMoneyPhone },
    {
      headers: {
        "Idempotency-Key": idempotencyKey || crypto.randomUUID(),
      },
    }
  );
  return data;
}

export async function fetchWithdrawal(id: string) {
  const { data } = await api.get(`/wallet/withdrawals/${id}`);
  return data;
}

export async function updatePayoutMsisdn(orangeMoneyPhone: string) {
  const { data } = await api.patch("/wallet/payout-msisdn", {
    orangeMoneyPhone,
  });
  return data;
}
