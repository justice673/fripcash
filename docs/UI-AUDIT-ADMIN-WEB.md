# FripCash Web & Admin — UI Audit Companion

**Date:** 2026-09-30  
**Scope:** Next.js app at `/home/justice/Desktop/Projects/fripcash` (public site, consumer dashboard, admin console).  
**Related:** [Flutter UI audit](file:///home/justice/frip_cash/docs/UI-AUDIT-AND-GAPS.md) (`~/frip_cash/docs/UI-AUDIT-AND-GAPS.md`) · [SRS roles](./srs/02-actors-and-roles.md) · [SRS platforms web vs app](./srs/15-platforms-web-vs-app.md) · [SRS admin](./srs/12-admin.md)

---

## 0. Verdict

| Surface | Verdict |
|---------|---------|
| **Public marketing / browse** | Mostly complete; catalogue hits live Nest API when configured |
| **Consumer `/dashboard`** | Account features largely live; **orders intentionally mocked** (`USE_MOCK_ORDERS=true`) |
| **Admin `/admin`** | **~40% live**, ~60% polished empty shells waiting on list APIs |
| **Advanced seller / courier** | Correctly deferred to **Flutter app** (GetAppBanner / blocked login) |

Admin is strong for: users, shop/KYC validations, listing moderation, categories, zones, platform commissions.  
Admin is **not** ready as a full ops desk for: orders queue, disputes queue, couriers, wallets overview, signalements, sessions, delivery tariffs.

---

## 1. Surfaces & who uses what

```text
Public (/ , /produits, /article/*, marketing, /checkout)
        │
        ▼
Consumer dashboard (/dashboard/*)
  Buyers + light particulier sellers only
        │
Admin (/admin-login → /admin/*)
  Staff only — separate login + admin session flag

NOT on web (SRS → Flutter):
  Boutique / proximité / enseigne seller tools
  Excel import, product library, full seller dashboard
  Courier shell
```

| Role | Web | Flutter |
|------|-----|---------|
| Acheteur | Browse + dashboard | Full marketplace |
| Particulier | Light sell (`/dashboard/articles`) + wallet | Full sell |
| Boutique / proximité / enseigne | CTA to app | Full tools |
| Livreur | Blocked at login | Courier shell |
| Admin | **This Next.js admin** | No consumer path (orphan mobile screen only) |

---

## 2. How to run

```bash
cd ~/Desktop/Projects/fripcash
npm install
npm run dev   # http://localhost:3000
```

Env (typical): `NEXT_PUBLIC_API_URL`, `API_UPSTREAM_URL`, `NEXT_PUBLIC_MEDIA_BASE_URL`.  
Auth gating is **client-side** in layouts (no `middleware.ts`).

---

## 3. Admin sidebar (every section)

Source: `components/admin/app-sidebar.tsx`

| Section | Items | Status summary |
|---------|-------|----------------|
| **Monitoring** | Dashboard, Sessions, Rapports | Partial / stub |
| **Cartographie** | Zones, Tarifs livraison | Zones live; tariffs stub |
| **Logistique** | Livreurs | Stub |
| **Catalogue & modération** | Utilisateurs, Validations, Articles, Commandes, Catégories, Signalements, Litiges | Mix live / stub |
| **Finances & partenaires** | Porte-monnaies, Enseignes (partenaires), Paramètres | Stub / partial |

Single admin menu — no sub-roles in UI. Sidebar footer identity is often **hardcoded** (not from `fetchAdminMe`).

---

## 4. Admin routes — detailed status

| Route | What it does | Status | Blocker / notes |
|-------|--------------|--------|-----------------|
| `/admin-login` | Email/password → admin audience | **Live** | Separate from consumer OTP |
| `/admin` | KPI cards, activity, pending listings preview | **Partial** | Escrow / disputes / delivery KPIs often 0; charts incomplete |
| `/admin/sessions` | Active sessions view | **Stub** | No sessions list API; empty |
| `/admin/rapports` | Analytics charts | **Partial** | Catalogue-ish charts; no order GMV / courier data |
| `/admin/zones` | Delivery zones CRUD | **Live** | `/catalog/zones` |
| `/admin/tarifs-livraison` | Inter-zone fee matrix | **Stub** | Zones may load; rates hardcoded / 0 — no tariff API |
| `/admin/livreurs` | Courier roster / missions | **Stub** | No admin courier list API |
| `/admin/utilisateurs` | Search, ban, CRUD, roles, revoke sessions | **Live** | Better Auth admin plugin |
| `/admin/validations` | Shop verification + KYC individual/org queues | **Live** | Empty if DB has no pending cases |
| `/admin/articles` | Listing moderation (approve / reject / flag) | **Live** | `GET/PATCH /admin/listings` |
| `/admin/commandes` | Order pipeline overview | **Stub** | **No `GET /admin/orders`** — UI empty |
| `/admin/categories` | Category tree CRUD + images | **Live** | |
| `/admin/signalements` | Reports queue | **Stub** | No reports API |
| `/admin/litiges` | Dispute queue, evidence, resolve | **Partial** | Resolve POST wired; **no `GET /admin/disputes`** — list empty |
| `/admin/porte-monnaies` | Seller balances / escrow overview | **Stub** | No admin wallets API |
| `/admin/partenaires` | Enseigne partners / SLA | **Stub** | No partners API |
| `/admin/parametres` | Commissions, min withdrawal, maintenance | **Partial** | API fields work; some toggles / contact fields local-only |

### Admin cosmetic stubs

- Header search — non-functional  
- Bell icon — decorative  
- Paramètres notification toggles — local React state only  

---

## 5. Consumer dashboard routes

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard` | Partial | Overview; orders from mock store |
| `/dashboard/profil` | Live | `updateMe` |
| `/dashboard/commandes` | **Mock** | `USE_MOCK_ORDERS=true` in `hooks/use-orders.ts` + localStorage |
| `/dashboard/favoris` | Live | |
| `/dashboard/messages` | Live | |
| `/dashboard/notifications` | Live | |
| `/dashboard/articles` | Live | Particulier listing CRUD; gated on `createListing` |
| `/dashboard/porte-monnaie` | Live | Balance, ledger, withdraw |
| `/dashboard/parametres` | Live | Profile, `becomeParticulier`, prefs |

Sidebar (`components/dashboard/user-sidebar.tsx`): same nav for buyer and particulier; capabilities gate actions inside pages. Footer pushes advanced selling to the mobile app.

---

## 6. Public + auth routes

### Public

| Route | Status |
|-------|--------|
| `/` | Live listings / categories (when API up); some marketing stats hardcoded |
| `/produits` | Live browse + filters |
| `/article/[id]` | Live PDP — offers, chat entry, cart |
| `/checkout` | Live cart/checkout API; payment UI partly cosmetic |
| `/a-propos`, `/comment-ca-marche`, `/contact`, `/conditions`, `/confidentialite`, `/eco-responsabilite`, `/securite` | Static marketing |

### Auth (consumer)

| Route | Status |
|-------|--------|
| `/connexion` | Live — phone OTP (GN) or email/password; rejects ADMIN / COURIER |
| `/inscription` | Live |
| `/mot-de-passe-oublie` | Live |
| `/verifier-email` | Live |

---

## 7. Mock vs live API (web)

### Real API (used when Nest is up)

- Auth: OTP, email, admin login, sign-out  
- `GET/PATCH /me`  
- Catalog: categories, zones, listings (public + admin moderation)  
- Cart, checkout, favorites, notifications, messaging, offers, reviews  
- Wallet (consumer)  
- Seller: `becomeParticulier`, KYC / shop apply hooks  
- Admin: users, listings moderation, validations/KYC, platform settings, audit logs, dispute **resolve**

### Mock / empty / local-only

| Item | Where |
|------|--------|
| Consumer dashboard orders | `USE_MOCK_ORDERS=true` |
| Admin orders / disputes **lists** | Empty UI, missing GET endpoints |
| Admin sessions, livreurs, wallets, partenaires, signalements | Empty shells |
| Delivery tariff rates | All zero |
| Public homepage stats | Hardcoded |
| Admin transaction chart | Empty array |
| Admin notification toggles in paramètres | Local state |
| `lib/consumer-mock-data.ts` | Dead / unused dataset |

---

## 8. Cross-reference: Flutter vs Web vs SRS

| Concern | Flutter (mock) | Next.js web | SRS intent |
|---------|----------------|-------------|------------|
| Full seller (boutique / proximité / enseigne) | Yes | App banner only | App = depth |
| Particulier sell | Yes | `/dashboard/articles` | Web light sell |
| Courier | Courier shell | Blocked | App only |
| Admin disputes | Orphan screen, unreachable | UI + resolve POST; **list empty** | Admin = web |
| Admin validations (proximité / enseigne) | Mock verification service | **Live** `/admin/validations` | Admin web |
| Orders tracking | Full mock timeline | Dashboard mock orders | Both need BE for real |
| Disputes open | Buyer on order detail | Mock orders + real openDispute hook | Shared domain |
| Commissions config | Hardcoded / library 5% | Admin paramètres (live) | Admin configures |
| Quartier unique tools (library, pickup) | Yes in app | Not on web | App |

**Dispute outcome note:** SRS / admin types may include `partial_refund`; some wired APIs only expose `resolved_buyer` | `resolved_seller` — confirm with BE when wiring list + resolve.

---

## 9. What’s left (web / admin) — no Flutter work

### Needs backend list endpoints (admin ops)

1. `GET /admin/orders` → fill `/admin/commandes`  
2. `GET /admin/disputes` → fill `/admin/litiges`  
3. Admin sessions list  
4. Admin couriers list  
5. Admin wallets / escrow overview  
6. Signalements API  
7. Partners API  
8. Delivery tariff matrix API  

### Web product / FE (no or little BE)

9. Flip `USE_MOCK_ORDERS` to false when fulfillment API trusted  
10. Wire admin header search / real admin identity in sidebar  
11. Persist admin paramètres notification toggles  
12. Remove dead `consumer-mock-data` if unused  

### Shared product decisions

13. Confirm dispute resolve enum (partial refund)  
14. Keep Flutter admin disputes screen deleted or never linked (avoid two ops UIs)

---

## 10. Route count snapshot

| Surface | Routes | Live | Partial | Stub / mock / static |
|---------|--------|------|---------|----------------------|
| Public | 11 | ~4 dynamic | checkout | ~6 static |
| Auth | 4 | 4 | 0 | 0 |
| Dashboard | 9 | ~7 | 0 | orders (+ overview uses mock) |
| Admin | 16 | ~6 | ~3 | ~7 |
| API proxy | 1 | 1 | — | — |

---

## 11. Cross-links

- Flutter app gaps & role buttons: [`~/frip_cash/docs/UI-AUDIT-AND-GAPS.md`](file:///home/justice/frip_cash/docs/UI-AUDIT-AND-GAPS.md)  
- SRS pack in this repo: [docs/srs/README.md](./srs/README.md)  
- Especially: [02-actors](./srs/02-actors-and-roles.md), [12-admin](./srs/12-admin.md), [15-web-vs-app](./srs/15-platforms-web-vs-app.md), [18-disputes](./srs/18-disputes-and-refunds.md)
