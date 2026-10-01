# From-BE web wiring progress

Handoffs live in [`docs/from-be/`](./from-be/) (copied from Flutter `frip_cash` pack).

Upstream: `API_UPSTREAM_URL` → Nest `:3010` via Next proxy `/api/v1`.

| MD | Status | Notes |
|----|--------|-------|
| `auth-web-nextjs-handoff.md` | Live | Cookie `fripcash_token`, `/me`, admin separate login |
| `listings-web-nextjs-handoff.md` | Live | Discover + PDP + seller tools CTA to app |
| `checkout-web-nextjs-handoff.md` | Updated | `validateCart` → `quote` → `payments` + poll; cart sheet prefers Nest cart when logged in |
| `orders-web-nextjs-handoff.md` | Updated | Mock orders **off**; action routes `prepare` / `ready` / `confirm-receipt` / … |
| `wallet-web-nextjs-handoff.md` | Live | Balance + ledger + withdraw client |
| `courier-web-nextjs-handoff.md` | Stub | Courier surface is app-first; API client exists |
| `admin-web-nextjs-handoff.md` / `admin-fe-handoff.md` | Partial | Users / listings / KYC / settings live; added `GET /admin/orders` + shipping-rates helpers — UI shells still thin |

## Follow-ups

- [ ] Collapse Zustand cart entirely once guest checkout is ruled out
- [ ] Admin orders / litiges list pages → `fetchAdminOrders` / dispute resolve `outcome`
- [ ] Admin shipping matrix UI → `fetchAdminShippingRates`
- [ ] Courier web only if product needs it (prefer Flutter)
