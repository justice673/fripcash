# Auth handoff — Next.js (web)

**Audience:** Web team (consumer dashboard + admin console)  
**API base:** `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3000`) · prefix `/api/v1`  
**Related:** [nextjs-axios.md](./nextjs-axios.md) · [01-auth.md](./01-auth.md) · [03-users.md](./03-users.md) · [15-admin.md](./15-admin.md) · [auth-be-handoff.md](./auth-be-handoff.md)

Contract for the **web client**. Same consumer auth API as mobile (`aud=CONSUMER`). Admin is a **separate** audience — never reuse the consumer session for `/admin/*`.

---

## What changed

| Before | Now |
|--------|-----|
| Phone OTP verify = create + login | **Recommended:** password register (`signupPath`) + password login |
| Web email path only loosely documented | Email signup/sign-in still available via Better Auth |
| Thin / unclear surface rules | Hard `WRONG_AUTH_SURFACE` / `FORBIDDEN_AUDIENCE` |

Dev OTP: **`000000`**. Register OTP resend cooldown: **60s**.

---

## Surfaces on web

| App area | Routes (example) | Auth | Audience |
|----------|------------------|------|----------|
| Consumer | `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/dashboard/*` | Phone (+ optional email) | `CONSUMER` |
| Admin | `/admin-login`, `/admin/*` | Email + password only | `ADMIN` |

- Consumer token on `/admin/**` → **403**
- Staff must use `POST /api/v1/auth/admin/login` — marketplace `/sign-in/email` rejects staff
- After consumer login: thin dashboard; advanced boutique / proximité / enseigne / courier → CTA to **mobile app** (SRS)

---

## HTTP client

Use the shared Axios instance from [nextjs-axios.md](./nextjs-axios.md):

- Cookie `fripcash_token` **or** memory + `Authorization: Bearer`
- `withCredentials: true`
- 401 → clear token → `/connexion`
- 403 `FORBIDDEN_AUDIENCE` → wrong surface (e.g. landed on admin with consumer token)

```ts
import { api, writeToken } from '@/lib/api/axios';

const { data } = await api.post('/api/v1/auth/login', {
  phone: '+224620123456',
  password,
  termsAccepted: true,
});
writeToken(data.token);
const { data: me } = await api.get('/api/v1/me');
```

---

## Consumer — recommended flows

### Register (`/inscription`)

```
POST /api/v1/auth/otp/request
{ "phone": "+224620123456", "purpose": "register" }

POST /api/v1/auth/otp/verify
{ "phone": "+224620123456", "code": "000000", "purpose": "register" }
→ { registrationSessionId }

# If collecting shop logo on web:
POST /api/v1/auth/media/register-cloudinary-sign
{ "phone": "+224620123456", "registrationSessionId": "…" }

POST /api/v1/auth/register
{
  "registrationSessionId": "…",
  "signupPath": "acheteur",
  "phone": "+224620123456",
  "password": "••••••••",
  "displayName": "Aminata Diallo",
  "termsAccepted": true,
  "marketingOptIn": false,
  "locale": "fr"
}
→ { token, user } → writeToken → GET /api/v1/me → /dashboard
```

**Web v1 scope (recommended):** support at least `signupPath: "acheteur"` (+ maybe `particulier`). Full boutique / proximité / enseigne register is **app-first**; web can deep-link to store or show “Continuer sur l’app”.

If you do support shop paths on web, field matrix = same as mobile ([auth-mobile-flutter-handoff.md](./auth-mobile-flutter-handoff.md) §1).

### Login (`/connexion`)

```http
POST /api/v1/auth/login
{
  "phone": "+224620123456",
  "password": "••••••••",
  "termsAccepted": true
}
```

| Code | UX |
|------|-----|
| `INVALID_CREDENTIALS` | Generic “Identifiants incorrects” |
| `TERMS_REQUIRED` | Block until terms checked |
| `WRONG_AUTH_SURFACE` | “Compte livreur / admin — use the right portal” |

### Optional: email (diaspora / existing BA)

Still available:

```http
POST /api/v1/auth/sign-up/email
POST /api/v1/auth/sign-in/email
```

Staff accounts **cannot** use `/sign-in/email` → use admin login. Prefer documenting phone as primary for GN marketplace; email as secondary if your UI already has it.

### Optional: legacy phone OTP only

```http
POST /api/v1/auth/phone-number/send-otp
POST /api/v1/auth/phone-number/verify
```

Still works (creates account on first verify, **no** password / `signupPath`). Prefer the product register/login above for new screens so web and mobile stay aligned.

### Forgot password (`/mot-de-passe-oublie`)

```
POST /api/v1/auth/password/forgot { "phone": "…" }   // always 200
POST /api/v1/auth/otp/verify
{ "phone": "…", "code": "…", "purpose": "reset_password" }
→ { resetToken }
POST /api/v1/auth/password/reset
{ "phone": "…", "resetToken": "…", "password": "…" }
→ /connexion
```

### Change password (settings)

```http
POST /api/v1/auth/password/change
Authorization: Bearer …
{ "currentPassword": "…", "newPassword": "…" }
```

### Logout

```http
POST /api/v1/auth/sign-out
```

Clear `fripcash_token` + React Query `['me']`.

---

## Become seller (web light)

Same user id:

```http
POST /api/v1/me/seller/particulier
{
  "displayName": "…",
  "zoneId": "…",
  "address": "…",
  "deliverySla": "24h"
}
```

Full shop upgrade (`POST /me/seller/shop`) is supported by API but **app-first** for UX (logo, category, pending review). Web: CTA to mobile after `particulier` if needed.

Invalidate `['me']` after success.

---

## `GET /api/v1/me` (dashboard gates)

```ts
const { data: me } = await api.get('/api/v1/me');
// me.canBuy, me.seller?.capabilities, me.seller?.verificationStatus
```

| UI | Condition |
|----|-----------|
| Buy / cart | `canBuy === true` |
| Seller nav | `seller !== null` |
| Create listing | `seller.capabilities.createListing` |
| Pending shop banner | `verificationStatus === 'pending'` |
| Phone field | read-only |

`PATCH /api/v1/me` — `displayName`, `preferredLocale`, `marketingOptIn`, `zoneId`, `address` (not phone).

---

## Admin console

```http
POST /api/v1/auth/admin/login
{ "email": "ops@fripcash.com", "password": "…" }
→ { token, user }  // authAudience ADMIN
```

- Store admin token **separately** from consumer cookie (e.g. `fripcash_admin_token`) so sessions never cross.
- Middleware: `/admin/*` requires admin audience; redirect others to `/admin-login`.
- No SMS OTP for admin primary auth.
- Seller approve/reject: see [15-admin.md](./15-admin.md).

Logout: `POST /api/v1/auth/sign-out` (or admin logout if you add a dedicated call — session invalidate + clear admin cookie).

---

## Middleware sketch

```ts
// Consumer dashboard
if (pathname.startsWith('/dashboard') && !readToken()) {
  redirect('/connexion');
}

// Admin — separate cookie
if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
  if (!readAdminToken()) redirect('/admin-login');
}
```

After login, call `GET /me` (consumer) or `GET /admin/me` (admin) before rendering gated UI.

---

## Error codes (auth)

| Code | HTTP | Web UX |
|------|------|--------|
| `VALIDATION_ERROR` | 400 | Inline field errors |
| `TERMS_REQUIRED` | 400 | Terms checkbox |
| `OTP_INVALID` / `OTP_EXPIRED` | 401 | OTP step |
| `OTP_RATE_LIMITED` | 429 | Disable resend 60s |
| `PHONE_ALREADY_REGISTERED` | 409 | Link to `/connexion` |
| `INVALID_CREDENTIALS` | 401 | Login form |
| `WRONG_AUTH_SURFACE` | 403 | Point to courier app / admin |
| `FORBIDDEN_AUDIENCE` | 403 | Clear wrong token; redirect |

---

## Checklist for web

### Consumer

- [ ] `/inscription` → otp + register (`acheteur` minimum)
- [ ] `/connexion` → phone + password + terms
- [ ] Token cookie + Axios bearer
- [ ] `GET /me` after auth; React Query `['me']`
- [ ] Forgot / reset password pages
- [ ] Do **not** use `/admin-login` for normal users
- [ ] Light `become particulier` or CTA to app for full shop

### Admin

- [ ] Separate login + token storage
- [ ] Guard `/admin/*`
- [ ] Seller verification approve/reject wired

### Align with mobile

- [ ] Same password login semantics (no OTP-every-login)
- [ ] Same E.164 phone rules
- [ ] Same error `code` mapping
