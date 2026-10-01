# Courier missions — Next.js / admin

**Audience:** Admin console + any web courier tooling  
**API base:** `/api/v1`  
**Status:** Shipped on Nest  
**Related:** [courier-fe-handoff.md](./courier-fe-handoff.md) · [15-admin.md](./15-admin.md)

Marketplace web does **not** run the livreur shell. Use this for ops visibility and wallet/earnings admin.

---

## Courier JWT surface

Courier login remains `POST /api/v1/auth/courier/login`. Admin staff use admin audience — do not mix.

If building an internal courier web client:

```ts
await api.get('/api/v1/missions', { params: { filter: 'active' } });
await api.post(`/api/v1/missions/${id}/accept`);
```

Same contracts as [courier-mobile-flutter-handoff.md](./courier-mobile-flutter-handoff.md).

---

## Mission lifecycle (ops)

1. Seller marks order `READY_FOR_PICKUP` (courier fulfillment) → BE spawns `Mission` `open` in seller **pickup zone**.
2. Courier accepts → order `COURIER_ASSIGNED`.
3. `collected` → `in_transit` → `delivered` (+ optional proof URL).
4. On deliver: idempotent delivery fee credit to **delivering** courier wallet.
5. Dispute / refund → mission `cancelled`.

---

## Admin hooks (existing / next)

| Capability | Notes |
|------------|--------|
| List / verify livreurs | Admin user + courier profile upsert (see admin seed paths) |
| Finance overview | Pending delivery fees in [wallet-web-nextjs-handoff.md](./wallet-web-nextjs-handoff.md) |
| Force reassign | Prefer transfer API or future `GET/PATCH /admin/missions` |

---

## Do not

- Filter consumer `Order` lists as missions permanently — use `/missions`.
- Credit fees from client — only server on deliver.
- Change courier `zoneId` from client without admin policy (profile PATCH is displayName/address only).
