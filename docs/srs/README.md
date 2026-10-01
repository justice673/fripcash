# FripCash — SRS pack (multi-file)

**Audience:** Backend / product.  
**Format:** Separate detailed markdown files on purpose. **Do not collapse into one file on our side** — send this whole folder. The BE may later produce a single consolidated `SRS.md` if they prefer.

**UI status (this Next.js repo + Flutter):** [UI-AUDIT-ADMIN-WEB.md](../UI-AUDIT-ADMIN-WEB.md) · [Flutter UI-AUDIT-AND-GAPS.md](file:///home/justice/frip_cash/docs/UI-AUDIT-AND-GAPS.md)

**Also send (API-oriented companion):** `../backend/` (roles matrix, upgrade rules, destinations, endpoint sketch).

| # | File | Topic |
|---|------|--------|
| 00 | [00-document-control.md](./00-document-control.md) | Scope, versions, platforms |
| 01 | [01-product-overview.md](./01-product-overview.md) | Vision, market, goals |
| 02 | [02-actors-and-roles.md](./02-actors-and-roles.md) | Users, shops, permissions |
| 03 | [03-auth-and-onboarding.md](./03-auth-and-onboarding.md) | Signup, OTP, upgrade |
| 17 | [17-authentication-surfaces.md](./17-authentication-surfaces.md) | **App vs dashboard vs admin vs courier auth** |
| 04 | [04-discovery-and-catalog.md](./04-discovery-and-catalog.md) | Home universes, browse |
| 05 | [05-listings.md](./05-listings.md) | Create/edit listings, photos |
| 06 | [06-cart-checkout-payments.md](./06-cart-checkout-payments.md) | Cart, Orange Money |
| 07 | [07-orders-and-fulfillment.md](./07-orders-and-fulfillment.md) | Order pipeline |
| 08 | [08-offers-and-messaging.md](./08-offers-and-messaging.md) | Offers (“bids”), chat seller |
| 09 | [09-wallet-escrow-commissions.md](./09-wallet-escrow-commissions.md) | Money flows |
| 10 | [10-seller-tools.md](./10-seller-tools.md) | Dashboard, Excel, library |
| 11 | [11-courier.md](./11-courier.md) | Livreur app |
| 12 | [12-admin.md](./12-admin.md) | Admin web console |
| 13 | [13-notifications.md](./13-notifications.md) | Push / in-app |
| 14 | [14-non-functional.md](./14-non-functional.md) | i18n, security, devices |
| 15 | [15-platforms-web-vs-app.md](./15-platforms-web-vs-app.md) | Shared API, different UX depth |
| 16 | [16-open-questions-and-out-of-scope.md](./16-open-questions-and-out-of-scope.md) | Gaps / deferred |
| 18 | [18-disputes-and-refunds.md](./18-disputes-and-refunds.md) | **Litige → admin inspect → full/partial refund / release** |
| 19 | [19-codes-and-pins.md](./19-codes-and-pins.md) | **OTP, pickup code (4 digits), Orange Money PIN** |

**Rule for implementers:** Clients (Flutter + Next.js) are UI-complete against these rules. The **API must enforce** authorization, commissions, verification, and escrow — UI gates are not security.
