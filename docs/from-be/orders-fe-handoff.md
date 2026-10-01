# Orders & fulfillment — FE index

**Status:** Shipped on Nest  
**After pay:** seller prepare/ready, proximity handoff (pickup code), courier collect/transit/deliver, buyer confirm-receipt (escrow release), disputes, ratings.

| Audience | Doc |
|----------|-----|
| Flutter | [orders-mobile-flutter-handoff.md](./orders-mobile-flutter-handoff.md) |
| Next.js | [orders-web-nextjs-handoff.md](./orders-web-nextjs-handoff.md) |
| Legacy | [10-orders.md](./10-orders.md) |

Escrow held on `PAID`; released only on buyer confirm or admin `release_seller` — not on courier delivered alone.
