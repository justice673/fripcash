# Admin ops — FE handoff index

**Audience:** Next.js `/admin` console  
**API base:** `/api/v1` · Bearer `aud: admin`  
**Status:** Shipped on Nest  
**Related:** [15-admin.md](./15-admin.md) · [admin-web-nextjs-handoff.md](./admin-web-nextjs-handoff.md)

Gate shell on `GET /admin/me` (`isAdmin: true`). Consumer/courier tokens → `403`.

| Priority | Endpoints |
|----------|-----------|
| P0 | `GET /admin/orders`, `GET /admin/disputes`, resolve with SRS outcomes |
| P0 | `GET /admin/finance/overview`, wallets |
| P1 | shipping-rates, couriers, missions |
| P2 | reports, partners, sessions, timeseries |
