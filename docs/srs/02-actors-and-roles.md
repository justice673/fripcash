# 02 — Actors and roles

**UI inventory:** [Admin/web audit](../UI-AUDIT-ADMIN-WEB.md) · [Flutter audit](file:///home/justice/frip_cash/docs/UI-AUDIT-AND-GAPS.md)

## 2.1 Canonical account model
Do **not** model the user as a single overwriteable “current role” enum for day-to-day switching.

```
User
├── identity (id stable forever, phone, profile)
├── can_buy (typically always for marketplace users)
├── seller_profile: none | particulier | boutique
│     └── shop_kind (if boutique): standard | proximite | enseigne
├── verification_status: none | pending | approved | rejected
├── courier_profile (optional / separate onboarding)
└── is_admin (staff)
```

## 2.2 Signup / application paths (`SignUpRole`)
| Path | Runtime | shop_kind | Home universe | Manual validation |
|------|---------|-----------|---------------|-------------------|
| acheteur | buyer only | — | — | — |
| particulier | vendeurParticulier | — | secondeMain | No (light profile) |
| boutique | boutique | standard | articlesNeufs | Optional business checks |
| commerceLocal | boutique | proximite | quartierBoutiques | **Yes** |
| grandeSurface | boutique | enseigne | enseignes | **Yes** |

## 2.3 Runtime roles (`UserRole`)
`acheteur` | `vendeurParticulier` | `boutique` | `livreur` | `admin`

## 2.4 Permission matrix (summary)
| Capability | Acheteur | Particulier | Boutique std | Proximité | Enseigne | Livreur |
|------------|----------|-------------|--------------|-----------|----------|---------|
| Browse / buy | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (courier shell) |
| Offers on listing | ✅* | ✅* | ✅* | ✅* | ❌ on enseigne items | — |
| Create live listing | ❌ | ✅ | ✅ | ✅ if approved | ✅ if approved | ❌ |
| Seller dashboard | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Excel import | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Product library | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Courier missions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

\*Except enseigne listings (no “demander” / offers).

Full detail also in `../backend/roles-and-capabilities.md`.

## 2.5 Anti-requirements
- No Settings toggle that freely swaps acheteur ↔ enseigne.  
- No demo mode that impersonates another seller’s data in production.  
- Admin dispute tools must not be reachable by normal consumers.
