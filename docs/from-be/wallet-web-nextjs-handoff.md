# Wallet, escrow & commissions — Next.js (web)

**Audience:** Web seller wallet, courier earnings, admin finance  
**API base:** `/api/v1`  
**Status:** Shipped on Nest  
**Related:** [wallet-mobile-flutter-handoff.md](./wallet-mobile-flutter-handoff.md) · [12-wallet.md](./12-wallet.md)

---

## Seller / courier

| Method | Path |
|--------|------|
| GET | `/wallet` |
| GET | `/wallet/ledger` |
| POST | `/wallet/withdraw` (+ `Idempotency-Key`) |
| GET | `/wallet/withdrawals/:id` |
| PATCH | `/wallet/payout-msisdn` |
| GET | `/courier/earnings?from&to` |

Platform rates: `GET /platform/commission-rates` · Admin `GET/PATCH /admin/platform-settings` (includes `minWithdrawalGnf`).

---

## Admin finance

| Method | Path |
|--------|------|
| GET | `/admin/wallets?q=` |
| GET | `/admin/wallets/:userId` |
| GET | `/admin/wallets/:userId/ledger` |
| POST | `/admin/wallets/:userId/adjust` |
| GET | `/admin/withdrawals?status=` |
| GET | `/admin/finance/overview` |

```json
POST /admin/wallets/:userId/adjust
{
  "amountGnf": 1000,
  "direction": "credit",
  "bucket": "available",
  "reason": "Support goodwill"
}
```

Dispute resolve (explicit amounts):

```json
POST /admin/disputes/:id/resolve
{
  "outcome": "partial_refund",
  "buyerRefundGnf": 20000,
  "sellerReleaseGnf": 20000,
  "notes": "…"
}
```

---

## Policy A (display for ops)

1. On pay: escrow liability split (seller net / commission / delivery fee). Seller **available** unchanged.  
2. On confirm-receipt: seller net → available; commission → revenue.  
3. On courier deliver: fee → courier available.  
4. Courier `delivered` alone does **not** release seller money.

---

## Checklist

- [ ] Wallet page: available + séquestre + withdraw form  
- [ ] Admin wallets list + adjust + finance overview  
- [ ] Platform settings: rates + min withdrawal  
