# Endpoint recheck vs from-be (web)

**Date:** 2026-10-01  
**Base:** `NEXT_PUBLIC_API_URL=/api/v1` — client paths must **not** repeat `/api/v1`.  
**Typecheck:** `npx tsc --noEmit` clean after this pass.

## Verdict

Consumer flows that the site actually calls (**wallet, listings, orders, cart/checkout**) now match the from-be MDs. Remaining gaps are mostly **admin shells**, **auth UI still on legacy OTP**, and **courier path prefix**.

---

## Fixed in this recheck

| Area | Was | Now |
|------|-----|-----|
| Wallet balance | `GET /wallet/balance` only | `GET /wallet` (+ balance fallback) |
| Wallet withdraw | `{ amountGnf }` only | + `orangeMoneyPhone` + `Idempotency-Key` |
| Wallet extras | — | `GET /wallet/withdrawals/:id`, `PATCH /wallet/payout-msisdn` |
| My listings | Public `GET /listings` filtered client-side | `GET /me/listings` |
| Create listing | Sent `destination` + `quantity` | No `destination`; uses `stock` |
| Listing updates | PATCH with price/stock/status | + `/price`, `/stock`, `/publish`, `/hide` |
| Order rating | `POST …/reviews` | Prefer `POST …/ratings` |
| PATCH `/me` | `{ name }` | `{ displayName }` (maps `name`) |
| OTP purpose | `"reset"` | `"reset_password"` (maps legacy `"reset"`) |
| Seller tools | library POST only; excel `{ objectKey }` | + `/library/publish`; excel accepts `{ rows }` |
| Orders | Mock | Live `GET /orders?as=` + action routes |
| Checkout | Legacy `POST /checkout` | `validate` → `quote` → `payments` + poll |

---

## MATCH (called and aligned)

- **Cart:** CRUD, `POST /cart/validate`
- **Checkout:** `POST /checkout/quote`, `POST /checkout/payments` + `Idempotency-Key`, `GET /checkout/payments/:id`
- **Orders:** `GET /orders?as=`, timeline, prepare / ready / confirm-handoff / confirm-receipt / ratings / seller-refund / disputes / courier progress
- **Listings:** discover + PDP, `GET /me/listings`, create (no destination), media, price/stock/publish/hide
- **Wallet:** `GET /wallet`, ledger, withdraw with phone + idempotency
- **Auth helpers:** `/auth/otp/*`, `/auth/register`, `/auth/login`, password forgot/reset/change, admin login, `/admin/me`
- **No** `api.get/post` bypasses outside `lib/api/`

---

## Still open (not blocking marketplace buy/sell)

| Gap | MD | Notes |
|-----|-----|-------|
| Connexion / inscription UI | Phone+password flow | Still legacy OTP/email screens; helpers exist |
| Admin finance / wallets / disputes lists | `GET /admin/finance/overview`, wallets, disputes | Pages stubbed |
| Shipping catalogs | `GET /catalog/delivery-zones`, `/catalog/shipping-rates` | Not wired |
| Admin shipping | `PUT` bulk (admin-web) vs `POST` upsert (checkout MD) | Client has POST upsert |
| Courier paths | `/missions` | Client still `/courier/missions` (legacy alias) |
| Admin token cookie | Separate `fripcash_admin_token` | Shares `fripcash_token` |
| Deprecated `POST /checkout` | Removed in MD | Still exported; hooks do not call it |

---

## How to re-verify

```bash
cd ~/Desktop/Projects/fripcash && npx tsc --noEmit
# Spot-check callers: grep api.(get|post|patch) lib/api/
```
