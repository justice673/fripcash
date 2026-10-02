# Featured promotions — BE handoff (Admin + Web + Flutter)

**From:** Product / FE (Admin Next.js + Website Next.js + Flutter app)  
**To:** Nest BE  
**Date:** 2026-10-01  
**Priority:** High — home carousel already shipped on Flutter with dummy data; admin CRUD UI is ready and waiting on these endpoints  
**Env (current):** `http://62.84.179.126:3010`  
**Base path:** `/api/v1`  
**Timezone rule:** **All datetimes in the API are ISO-8601 UTC with `Z` suffix.** Clients convert to/from local wall-clock for admin forms and countdown UI.

---

## 1. Why this exists

We need a **server-owned “Featured promotions” carousel** on:

| Surface | Where it shows | Consumer action |
|---------|----------------|-----------------|
| **Flutter app** | Home — after groceries / before New arrivals | CTA **« Acheter / Shop now » → product details page (PDP)** for that listing |
| **Website (Next.js)** | Same home slot (to be wired once public API exists) | Same — open listing PDP |
| **Admin dashboard** | `/admin/promotions` | Browse **all active articles** → **Promouvoir** sheet (dates, prices, badge) → card appears in Featured **without removing** the listing from normal catalogue |

Today Flutter uses **local placements** (prefer live discounted listings with real `productId`) with a live **countdown** driven by `endsAt`. Admin UI lists catalogue articles and opens a promote sheet; until Nest returns 200 it persists to localStorage.

This is **not** seller self-serve ads. **Only staff admins** create/edit/delete promotions. Consumers only **read** active ones.

### Admin UX (locked)

1. Page shows **all published articles** from the app (same source as Articles admin).
2. Each row has **Promouvoir** (or **Modifier promo** if already featured).
3. Sheet lets admin set: `startsAt` / `endsAt` (datetime), promo + compare-at prices, subtitle, badge, CTA labels, surface, sort order, active.
4. Preview card mirrors the home carousel UI.
5. Saving creates a `PRODUCT` promotion with `listingId = article.id`.
6. **Shop now always deep-links to that listing’s PDP** (`deepLink.type = LISTING`). The listing stays in New arrivals / category / search as usual — Featured is an extra surface only.

---

## 2. Product rules (non-negotiable)

1. **Time window is mandatory**
   - Every promotion has `startsAt` and `endsAt` (UTC).
   - Public list returns only promotions that are **eligible now** (see §6).
   - Countdown on App/Web = `endsAt − DateTime.now()` (client clock). When ≤ 0, hide that slide or mark ended (client may refetch).

2. **No App Store–risky off-platform flows**
   - CTA must open **in-app / on-site** destinations only (listing PDP or shop page).
   - Do **not** require WhatsApp / phone / “contact admin” as the primary CTA for this carousel.

3. **Prices are display snapshots for the card**
   - `promoPriceGnf` + `compareAtPriceGnf` are what the carousel shows.
   - Checkout still uses the **live listing price** from `/listings/:id` (or cart). If you want the promo price to be binding at checkout, that is a **separate** listing price change — out of scope for v1 unless product asks later.
   - Discount % on the card is **computed client-side**:  
     `round((compareAt − promo) / compareAt × 100)` when both present and `compareAt > promo`.

4. **Creative image**
   - Optional override via Cloudinary (`imageUrl` / `imagePublicId`).
   - If null and `kind=PRODUCT`, public response should **backfill** listing cover media URL.
   - Folder suggestion for sign: `fripcash/promotions` (extend `POST /media/cloudinary-sign` to accept `folder: "promotions"`).

5. **i18n**
   - Store FR + EN strings. Public response may return a single localized pair based on `x-locale: FR|EN`, **or** return both and let clients pick. Prefer **locale-resolved fields** on public GET for smaller payloads (see §7.2).

6. **Surfaces**
   - `HOME_APP` | `HOME_WEB` | `BOTH`
   - Public GET must filter by requested surface.

7. **Ordering**
   - Ascending `sortOrder`, then `startsAt` desc (or `createdAt` desc) as tie-breaker.
   - Default `sortOrder = 0`.

---

## 3. Data model

### 3.1 Table suggestion: `promotions`

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | UUID PK | no | |
| `kind` | enum `PRODUCT` \| `SHOP` | no | |
| `status` | enum `DRAFT` \| `SCHEDULED` \| `LIVE` \| `PAUSED` \| `ENDED` | no | See §5 for derivation vs stored |
| `title_fr` | varchar(160) | no | |
| `title_en` | varchar(160) | no | |
| `subtitle_fr` | varchar(160) | yes | e.g. “Offre flash” |
| `subtitle_en` | varchar(160) | yes | |
| `description_fr` | text | yes | Short card copy |
| `description_en` | text | yes | |
| `badge_fr` | varchar(40) | yes | e.g. “-40 %” — optional; clients can also compute % |
| `badge_en` | varchar(40) | yes | |
| `cta_label_fr` | varchar(40) | yes | default `"Acheter"` |
| `cta_label_en` | varchar(40) | yes | default `"Shop now"` |
| `listing_id` | UUID FK → listings | yes | **Required** when `kind=PRODUCT` |
| `seller_profile_id` | UUID FK → seller_profiles | yes | **Required** when `kind=SHOP` |
| `image_url` | text | yes | Cloudinary secure URL override |
| `image_public_id` | text | yes | For replace/delete |
| `promo_price_gnf` | integer | yes | ≥ 0; display promo price |
| `compare_at_price_gnf` | integer | yes | ≥ 0; strikethrough; should be ≥ promo when both set |
| `starts_at` | timestamptz | no | Inclusive start (UTC) |
| `ends_at` | timestamptz | no | Exclusive or inclusive end — **pick one and document**; FE countdown treats end as “promo dies at this instant” |
| `surface` | enum `HOME_APP` \| `HOME_WEB` \| `BOTH` | no | default `BOTH` |
| `sort_order` | integer | no | default `0` |
| `is_active` | boolean | no | default `true`; hard kill switch |
| `internal_notes` | text | yes | **Admin only — never on public API** |
| `created_by_admin_id` | UUID | yes | Staff who created |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |

**Indexes**

- `(is_active, starts_at, ends_at)` for public eligibility
- `(sort_order)`
- `(listing_id)` / `(seller_profile_id)`
- `(status)` for admin filters

**Constraints**

- `ends_at > starts_at`
- XOR on target:  
  - `PRODUCT` → `listing_id IS NOT NULL` AND `seller_profile_id IS NULL`  
  - `SHOP` → `seller_profile_id IS NOT NULL` AND `listing_id IS NULL`
- Listing must exist and preferably be `PUBLISHED` (or whatever your live status is) when activating / going LIVE — return `400 LISTING_NOT_PUBLISHABLE` if admin tries to activate a dead listing.
- Prices: if both set, prefer validating `compare_at_price_gnf >= promo_price_gnf`.

---

## 4. Datetime contract (critical)

### 4.1 Wire format

```http
startsAt: 2026-10-01T18:00:00.000Z
endsAt:   2026-10-03T23:59:00.000Z
```

- Always **UTC** (`Z`).
- Milliseconds optional; FE will send `.000Z` from `Date.toISOString()`.
- Admin UI uses `<input type="datetime-local">` in the **admin’s browser timezone**, then converts with `new Date(localValue).toISOString()` before POST/PATCH.
- Nest must **not** reinterpret strings as local server time. Store as `timestamptz`.

### 4.2 Inclusive window (recommend)

A promotion is **in window** when:

```text
startsAt <= nowUtc < endsAt
```

(Document if you choose `<= endsAt` instead; Flutter countdown hits zero at `endsAt`.)

### 4.3 Examples

| Scenario | startsAt | endsAt | now (UTC) | Eligible? |
|----------|----------|--------|-----------|-----------|
| Flash 18h | `2026-10-01T10:00:00.000Z` | `2026-10-02T04:00:00.000Z` | `2026-10-01T20:00:00.000Z` | Yes |
| Not started | `2026-10-05T00:00:00.000Z` | `2026-10-06T00:00:00.000Z` | `2026-10-01T12:00:00.000Z` | No (SCHEDULED) |
| Expired | `2026-09-01T00:00:00.000Z` | `2026-09-02T00:00:00.000Z` | `2026-10-01T12:00:00.000Z` | No (ENDED) |

### 4.4 Clock skew

Clients may be ± a few minutes off. Prefer **server `now`** for eligibility. Countdown UI is approximate client-side; optional: public payload includes `serverNow: "…Z"` so clients can skew-correct (nice-to-have, not required for v1).

---

## 5. Status machine

### 5.1 Stored vs derived

You may **store** `status` and/or **derive** it:

| Status | Meaning |
|--------|---------|
| `DRAFT` | Editable, never public |
| `SCHEDULED` | `isActive` + `now < startsAt` (+ not PAUSED) |
| `LIVE` | `isActive` + in window |
| `PAUSED` | Admin force-hide; ignore window |
| `ENDED` | `now >= endsAt` (or admin archived) |

**Recommended:**

- Admin can set `DRAFT` / `PAUSED` explicitly via PATCH.
- A cron or on-read derivation updates `SCHEDULED` ↔ `LIVE` ↔ `ENDED`.
- Public GET **never** returns DRAFT / PAUSED / ENDED / out-of-window.

### 5.2 `isActive`

- `isActive=false` ⇒ treat like PAUSED for public visibility.
- Admin list still shows them.

---

## 6. Public eligibility filter (App + Web)

A promotion is returned by `GET /promotions` only if **all** are true:

1. `status` ∉ `{DRAFT, PAUSED}` (or equivalent via `isActive`)
2. `isActive === true`
3. `startsAt <= now < endsAt`
4. `surface` matches request:
   - Request `surface=HOME_APP` → row `HOME_APP` **or** `BOTH`
   - Request `surface=HOME_WEB` → row `HOME_WEB` **or** `BOTH`
5. Linked listing/shop still usable (listing published / shop open) — if not, **omit** from public list (don’t 500)

Default `limit=12`, max `50`.

---

## 7. Endpoints

All under `/api/v1`.

### 7.1 Admin auth

Same as other admin routes:

```http
Authorization: Bearer <admin accessToken>
```

Staff permission suggestion: `promotions:read` / `promotions:write` (or reuse a broad `catalog:write` if you don’t split yet).

---

### 7.2 Public — mobile + website

#### `GET /promotions`

**Auth:** optional / none (public catalogue-style).  
**Headers:**

```http
x-locale: FR
```

**Query**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `surface` | `HOME_APP` \| `HOME_WEB` | **required** (or default `HOME_WEB`) | Filter |
| `limit` | int 1–50 | `12` | Cap |

**Response `200`**

```json
{
  "items": [
    {
      "id": "8f2c1a90-…",
      "kind": "PRODUCT",
      "title": "Numeris Atelier – Cloud",
      "subtitle": "Offre flash",
      "description": "Baskets premium — fenêtre promo limitée.",
      "badge": "-40 %",
      "ctaLabel": "Acheter",
      "listingId": "60ea903f-…",
      "sellerProfileId": null,
      "imageUrl": "https://res.cloudinary.com/…/promotions/….jpg",
      "promoPriceGnf": 349920,
      "compareAtPriceGnf": 583200,
      "discountPercent": 40,
      "startsAt": "2026-10-01T10:00:00.000Z",
      "endsAt": "2026-10-02T04:00:00.000Z",
      "surface": "BOTH",
      "sortOrder": 10,
      "deepLink": {
        "type": "LISTING",
        "id": "60ea903f-…"
      }
    }
  ],
  "serverNow": "2026-10-01T18:05:12.441Z"
}
```

**Locale resolution**

Given `x-locale: FR`, map:

- `title` ← `title_fr`
- `subtitle` ← `subtitle_fr`
- … same for description, badge, ctaLabel  

Given `EN`, use `*_en`. Fallback to FR if EN empty.

**`discountPercent`**

Server may compute and return; clients can recompute. Prefer server for consistency.

**`deepLink`**

Helps Flutter / web navigate without guessing:

- PRODUCT → `{ "type": "LISTING", "id": "<listingId>" }`
- SHOP → `{ "type": "SHOP", "id": "<sellerProfileId>" }`

**Empty**

```json
{ "items": [], "serverNow": "…" }
```

**Errors**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Bad `surface` / `limit` |

---

### 7.3 Admin — list

#### `GET /admin/promotions`

**Auth:** admin Bearer.

**Query**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | enum \| `ALL` | `ALL` | Filter stored/derived status |
| `surface` | enum \| `ALL` | `ALL` | |
| `q` | string | | Search title_fr/en, listingId, badge |
| `cursor` | string | | Opaque pagination |
| `limit` | int | `20` | max 100 |

**Response `200`**

```json
{
  "items": [ /* full admin shape — see §8 */ ],
  "nextCursor": null,
  "total": 3
}
```

Admin shape **includes** `titleFr`/`titleEn`, `internalNotes`, `isActive`, `createdAt`, `updatedAt`, `createdByAdminId`, raw status, etc. (not locale-collapsed).

---

### 7.4 Admin — get one

#### `GET /admin/promotions/:id`

**404** `PROMOTION_NOT_FOUND` if missing.

---

### 7.5 Admin — create

#### `POST /admin/promotions`

**Body**

```json
{
  "kind": "PRODUCT",
  "status": "DRAFT",
  "titleFr": "Numeris Atelier – Cloud",
  "titleEn": "Numeris Atelier – Cloud",
  "subtitleFr": "Offre flash",
  "subtitleEn": "Flash deal",
  "descriptionFr": "Baskets premium — fenêtre promo limitée.",
  "descriptionEn": "Premium trainers — limited promo window.",
  "badgeFr": "-40 %",
  "badgeEn": "-40%",
  "ctaLabelFr": "Acheter",
  "ctaLabelEn": "Shop now",
  "listingId": "60ea903f-aaaa-bbbb-cccc-ddddeeeeffff",
  "sellerProfileId": null,
  "imageUrl": "https://res.cloudinary.com/…/image.jpg",
  "imagePublicId": "fripcash/promotions/xyz",
  "promoPriceGnf": 349920,
  "compareAtPriceGnf": 583200,
  "startsAt": "2026-10-01T18:00:00.000Z",
  "endsAt": "2026-10-03T23:59:00.000Z",
  "surface": "BOTH",
  "sortOrder": 10,
  "isActive": true,
  "internalNotes": "Weekend push — negotiated with seller offline"
}
```

**Validation**

| Rule | Error code |
|------|------------|
| Missing `titleFr` | `VALIDATION_ERROR` |
| Missing `startsAt` / `endsAt` | `VALIDATION_ERROR` |
| `endsAt <= startsAt` | `INVALID_TIME_WINDOW` |
| `kind=PRODUCT` without `listingId` | `LISTING_REQUIRED` |
| `kind=SHOP` without `sellerProfileId` | `SELLER_REQUIRED` |
| Unknown listing / seller | `LISTING_NOT_FOUND` / `SELLER_NOT_FOUND` |
| Invalid prices | `INVALID_PRICE` |
| Invalid `surface` / `kind` / `status` | `VALIDATION_ERROR` |

**Response `201`** — full admin promotion object.

---

### 7.6 Admin — update

#### `PATCH /admin/promotions/:id`

Partial body (same fields as create).  
Re-validate time window if either date changes.  
Re-validate XOR kind/target if `kind` or ids change.

**Response `200`** — full object.

---

### 7.7 Admin — delete

#### `DELETE /admin/promotions/:id`

Hard delete is fine for v1 (or soft-delete with `deletedAt` if you prefer audit).  
**Response `200`** `{ "ok": true }` or `204`.

---

### 7.8 Cloudinary sign extension

#### `POST /media/cloudinary-sign`

Allow:

```json
{ "folder": "promotions" }
```

alongside existing `listings` | `categories`.  
Admin FE already calls `uploadCatalogueImage(file, "promotions")`.

---

## 8. Admin object shape (canonical)

```ts
type Promotion = {
  id: string;
  kind: "PRODUCT" | "SHOP";
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED";
  titleFr: string;
  titleEn: string;
  subtitleFr: string | null;
  subtitleEn: string | null;
  descriptionFr: string | null;
  descriptionEn: string | null;
  badgeFr: string | null;
  badgeEn: string | null;
  ctaLabelFr: string | null;
  ctaLabelEn: string | null;
  listingId: string | null;
  sellerProfileId: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  promoPriceGnf: number | null;
  compareAtPriceGnf: number | null;
  startsAt: string; // ISO UTC
  endsAt: string;   // ISO UTC
  surface: "HOME_APP" | "HOME_WEB" | "BOTH";
  sortOrder: number;
  isActive: boolean;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string | null;
};
```

JSON field names: **camelCase** (match existing Nest FE contracts).

---

## 9. Consumer mapping (what FE will do)

### 9.1 Flutter

Replace `dummyPromoPlacements` / `mock_sponsored.dart` with:

```http
GET /api/v1/promotions?surface=HOME_APP&limit=12
x-locale: FR|EN
```

Map to existing UI model:

| API | `SponsoredPlacement` |
|-----|----------------------|
| `id` | `id` |
| `kind` | `product` / `shop` |
| `imageUrl` | `imageUrl` |
| `title` | `title` |
| `subtitle` | `subtitle` |
| `description` | `description` |
| `listingId` | `productId` |
| `sellerProfileId` | `sellerId` |
| `badge` | `badge` |
| `promoPriceGnf` | `price` |
| `compareAtPriceGnf` | `compareAtPrice` |
| `endsAt` | `endsAt` (parse ISO → `DateTime`) |

CTA already navigates product PDP when `productId` is set.

### 9.2 Website

Same public GET with `surface=HOME_WEB`.  
Home section should mirror app: carousel + countdown + white pill CTA.

### 9.3 Admin dashboard (already built)

Path: `/admin/promotions`  
Client: `lib/api/promotions.ts`

**UX:** article list (active listings) + **Promouvoir** sheet — not a blank free-form create.

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/admin/promotions` |
| Get | GET | `/admin/promotions/:id` |
| Create (from article) | POST | `/admin/promotions` with `kind: PRODUCT`, `listingId` |
| Update | PATCH | `/admin/promotions/:id` |
| Delete (unpromote) | DELETE | `/admin/promotions/:id` |

Sheet fields (article title/image/listingId are taken from the selected listing):

- startsAt / endsAt (datetime-local → ISO UTC)  
- promoPriceGnf / compareAtPriceGnf  
- subtitleFr/En, badgeFr/En, ctaLabelFr/En  
- surface, sortOrder, isActive, internalNotes  

**CTA contract:** public clients open **PDP of `listingId`**. Listing remains in all normal catalogue surfaces.

---

## 10. Example cURL

### Create (admin)

```bash
curl -sS -X POST "http://62.84.179.126:3010/api/v1/admin/promotions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-locale: FR" \
  -d '{
    "kind": "PRODUCT",
    "status": "DRAFT",
    "titleFr": "Montre élégante",
    "titleEn": "Elegant watch",
    "subtitleFr": "Promo weekend",
    "subtitleEn": "Weekend promo",
    "badgeFr": "-30 %",
    "badgeEn": "-30%",
    "ctaLabelFr": "Acheter",
    "ctaLabelEn": "Shop now",
    "listingId": "REPLACE_WITH_REAL_LISTING_UUID",
    "promoPriceGnf": 438480,
    "compareAtPriceGnf": 626400,
    "startsAt": "2026-10-01T18:00:00.000Z",
    "endsAt": "2026-10-04T18:00:00.000Z",
    "surface": "BOTH",
    "sortOrder": 20,
    "isActive": true,
    "internalNotes": "Test handoff 2026-10-01"
  }'
```

### Activate / go live (admin)

```bash
curl -sS -X PATCH "http://62.84.179.126:3010/api/v1/admin/promotions/$ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "LIVE", "isActive": true }'
```

### Public (app)

```bash
curl -sS "http://62.84.179.126:3010/api/v1/promotions?surface=HOME_APP&limit=12" \
  -H "x-locale: FR"
```

### Public (web)

```bash
curl -sS "http://62.84.179.126:3010/api/v1/promotions?surface=HOME_WEB&limit=12" \
  -H "x-locale: FR"
```

---

## 11. Error envelope (match existing Nest style)

```json
{
  "code": "INVALID_TIME_WINDOW",
  "message": "endsAt must be after startsAt",
  "details": {
    "startsAt": "2026-10-03T00:00:00.000Z",
    "endsAt": "2026-10-01T00:00:00.000Z"
  }
}
```

Do **not** return empty 500 bodies.

---

## 12. Acceptance checklist (BE)

- [ ] Migration + model for `promotions`
- [ ] `POST/GET/PATCH/DELETE /admin/promotions` (+ `GET :id`)
- [ ] Admin auth + permission gate
- [ ] Validation: time window, kind XOR targets, prices
- [ ] `GET /promotions?surface=&limit=` public eligibility filter
- [ ] Locale resolution via `x-locale`
- [ ] `discountPercent` + `deepLink` on public items
- [ ] `cloudinary-sign` accepts `folder: "promotions"`
- [ ] Listing/shop soft-omit when target not publishable (no 500)
- [ ] Seed **0–2** sample rows optional for staging
- [ ] Document effective status derivation + cron if any

---

## 13. FE acceptance (after BE ships)

- [ ] Admin banner disappears; CRUD hits live API
- [x] Flutter home carousel loads from `GET /promotions?surface=HOME_APP`
- [x] Countdown matches `endsAt` (synced via `serverNow`)
- [x] CTA opens correct PDP / shop (`deepLink`)
- [ ] Website home uses `surface=HOME_WEB`
- [x] Expired / paused promos never appear on public home (server filter; Flutter hides section when `items: []`)

---

## 14. Out of scope (v1)

- Seller self-serve “promote my listing” billing
- Promo codes / coupons at checkout
- Forcing checkout price to match `promoPriceGnf` without changing listing
- Push notifications when a promo goes LIVE
- Analytics / impression tracking (can add `GET /promotions/:id/impression` later)

---

## 15. Contact / references

| Artifact | Path |
|----------|------|
| Admin page | `fripcash/app/admin/promotions/page.tsx` |
| Admin API client | `fripcash/lib/api/promotions.ts` |
| Flutter carousel UI | `frip_cash/lib/widgets/home/home_sponsored_section.dart` |
| Flutter dummy model | `frip_cash/lib/mock/mock_sponsored.dart` |
| This handoff | `frip_cash/docs/to-be/PROMOTIONS-FEATURED-HANDOFF.md` |
| Live BE handoff | `docs/from-be/promotions-fe-handoff.md` |

**Please reply with:** estimated ship date, any field renames you need, and whether public items are locale-collapsed (`title`) or bilingual (`titleFr`/`titleEn`). FE can adapt either way; locale-collapsed is preferred for mobile.
