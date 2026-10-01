# Orders & fulfillment — Next.js (web)

**Audience:** Web purchases / boutique sales / admin ops  
**API base:** `/api/v1`  
**Status:** Shipped on Nest  
**Related:** [orders-mobile-flutter-handoff.md](./orders-mobile-flutter-handoff.md) · [checkout-web-nextjs-handoff.md](./checkout-web-nextjs-handoff.md)

Server-gated lifecycle after pay. Prefer action routes over legacy `PATCH /orders/:id/status`.

---

## Consumer / seller routes

| Method | Path |
|--------|------|
| GET | `/orders?as=buyer\|seller&filter=&q=` |
| GET | `/orders/:id` · `/orders/:id/timeline` |
| POST | `/orders/:id/prepare` · `/ready` · `/confirm-handoff` |
| POST | `/orders/:id/confirm-receipt` · `/ratings` · `/seller-refund` |
| POST | `/orders/:id/collected` · `/in-transit` · `/delivered` |
| POST | `/orders/:id/disputes` |

## Admin

| Method | Path |
|--------|------|
| GET | `/admin/orders?status=&q=` |
| POST | `/admin/disputes/:id/resolve` |

```json
{
  "outcome": "refund_buyer" | "partial_refund" | "release_seller",
  "amountGnf": 50000,
  "notes": "…"
}
```

| Outcome | Order | Money |
|---------|-------|-------|
| `release_seller` | `FUNDS_RELEASED` | Escrow → seller net |
| `refund_buyer` | `REFUNDED` | Full refund from escrow |
| `partial_refund` | `REFUNDED` | Split (`amountGnf` required) |

---

## Happy paths

**Proximity:** pay → prepare → ready → `confirm-handoff` + code → buyer `confirm-receipt` → rate.

**Courier:** pay → prepare → ready → courier accept/collect/(in-transit)/deliver → buyer confirm → rate.

Multi-seller: one payment, **N** orders — confirm each separately.

---

## UI notes

- Drive CTAs from `nextActions` on order DTO.  
- Hide timeline when `DISPUTED` / `REFUNDED` — show dispute banner.  
- Escrow: `held` / `locked` / `released`.  
- Never release funds on courier `delivered` alone.

---

## Checklist

- [ ] Purchases + sales lists with filters  
- [ ] Order detail + timeline  
- [ ] Seller prepare/ready/handoff  
- [ ] Buyer confirm + rate + dispute  
- [ ] Admin orders + dispute resolve  
