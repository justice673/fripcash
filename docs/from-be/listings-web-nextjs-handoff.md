# Listings handoff — Next.js (web)

**Audience:** Web team (consumer dashboard + admin)  
**API base:** `NEXT_PUBLIC_API_URL` + Axios from [nextjs-axios.md](./nextjs-axios.md)  
**Status:** Shipped on Nest  
**Related:** [listings-destinations-fe-handoff.md](./listings-destinations-fe-handoff.md) · [listing-pricing-fe-handoff.md](./listing-pricing-fe-handoff.md) · [auth-web-nextjs-handoff.md](./auth-web-nextjs-handoff.md) · [15-admin.md](./15-admin.md)

Same listing API as mobile. Web stays **light** for sellers; full wizard / Excel / library remain **app-first**.

---

## Scope by surface

| Surface | Listing depth |
|---------|----------------|
| Public marketplace pages | Browse + PDP (`displayPriceGnf` only) |
| Consumer `/dashboard` | Light list / create for **particulier**; CTA to app for boutique/proximité/enseigne tools |
| Admin `/admin` | Platform commission rates, taxonomy categories, listing moderation |

---

## Public discovery & PDP

```ts
// Home universe tabs
const { data } = await api.get('/api/v1/listings', {
  params: {
    destination: 'SECONDE_MAIN', // or ARTICLES_NEUFS | QUARTIER_BOUTIQUES | ENSEIGNES
    q,
    minPrice,
    maxPrice,
    inStockOnly: true,
    sort: 'newest', // priceAsc | priceDesc
    cursor,
    limit: 20,
  },
});
// data.items[], data.nextCursor

const { data: listing } = await api.get(`/api/v1/listings/${id}`);
// listing.displayPriceGnf — NEVER show netPriceGnf / commission* on public UI
```

Optional: `GET /api/v1/catalog/listing-taxonomy` for filters / size labels.

---

## Consumer dashboard (seller light)

### Gate with `/me`

```ts
const { data: me } = await api.get('/api/v1/me');
if (!me.seller?.capabilities?.createListing) {
  // pending verification or not a seller → CTA become seller / wait
}
```

### Inventory

```http
GET /api/v1/me/listings?status=ACTIVE
GET /api/v1/me/listings/:id   // includes netPriceGnf, commissionRate, commissionGnf
```

Table columns suggestion: cover, title, **display** price, stock, status, actions (edit / hide / publish).

### Light create (particulier)

Do **not** send `destination`.

```ts
await api.post('/api/v1/listings', {
  title,
  description,
  categoryId,
  subcategoryId,
  conditionCode: 'veryGood',
  netPriceGnf,
  stock: 1,
  shippingCostGnf: 5000,
  publish: false,
});
// then Cloudinary sign → POST /listings/:id/media → POST /listings/:id/publish
```

Price preview:

```ts
const { data: rates } = await api.get('/api/v1/platform/commission-rates');
const display = Math.round(net * (1 + rates.effectiveForMe));
```

### Mutations (same as mobile)

| Action | Endpoint |
|--------|----------|
| Update | `PATCH /listings/:id` |
| Price | `POST /listings/:id/price` `{ netPriceGnf }` |
| Stock | `POST /listings/:id/stock` |
| Hide | `POST /listings/:id/hide` |
| Publish | `POST /listings/:id/publish` |
| Delete | `DELETE /listings/:id` |

### App CTA for advanced tools

If `me.seller.shopKind` is `proximite` | `enseigne` | `standard` boutique:

- Excel import  
- Product library  
- Full multi-step wizard  

→ deep-link / store badge: “Continuer sur l’app FripCash”.

API still supports excel/library if you choose to build them later:

- `POST /me/seller/tools/excel-import` `{ rows: [...] }`  
- `POST /me/seller/tools/library/publish`  

---

## Admin

### Commission settings

```http
GET  /api/v1/admin/platform-settings
PATCH /api/v1/admin/platform-settings
{
  "commissionRateStandard": 0.08,
  "commissionRateProximite": 0.05
}
```

UI: percent inputs (8 → send `0.08`). Toast: *applies to new listings and listings whose net price is edited* (snapshot).

Sellers preview via public `GET /platform/commission-rates`.

### Categories / zones

Existing admin catalog CRUD: `/api/v1/catalog/categories`, `/zones` (see [04-catalog.md](./04-catalog.md)).

Wizard taxonomy seed (sizes/colors): `GET /catalog/listing-taxonomy` (read-only for clients).

### Listing moderation

```http
PATCH /api/v1/admin/listings/:id
```

(status approve / reject / flag — see [15-admin.md](./15-admin.md))

---

## DTO rules (web)

| Context | Show |
|---------|------|
| Public cards / PDP / cart | `displayPriceGnf`, optional `compareAtPriceGnf` |
| Seller dashboard detail | + `netPriceGnf`, `commissionRate`, `commissionGnf` |
| Admin | full + moderation |

Never trust client-computed display for checkout — always use API `displayPriceGnf` / cart lines.

---

## Errors

| Code | Web UX |
|------|--------|
| `SELLER_VERIFICATION_PENDING` | Banner “Dossier en revue” |
| `PHOTOS_REQUIRED` | Block publish |
| `LISTING_HAS_OPEN_ORDERS` | Prefer hide over delete |
| `FORBIDDEN_AUDIENCE` | Wrong token (admin vs consumer) |

---

## Web checklist

### Consumer

- [ ] Discovery tabs by `destination` query  
- [ ] PDP uses `displayPriceGnf` only  
- [ ] Dashboard `GET /me/listings`  
- [ ] Particulier light create without `destination`  
- [ ] Rates from `/platform/commission-rates` for preview  
- [ ] App CTA for Excel / library / full wizard  

### Admin

- [ ] Edit commission rates (snapshot messaging)  
- [ ] Category/zone CRUD  
- [ ] Listing moderation queue  
