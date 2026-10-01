# 12 — Admin console

**Implemented UI status (this repo):** [UI-AUDIT-ADMIN-WEB.md](../UI-AUDIT-ADMIN-WEB.md) — live vs stub routes for `/admin/*`.

## 12.1 Access
Staff-only web app (`/admin`). Separate login. All mutating actions audited.

## 12.2 Feature areas (required)
### Monitoring
- Dashboard KPIs  
- Active sessions (ops visibility)  
- Reports / exports

### Cartographie & logistics
- Zones management  
- Delivery tariffs (inter-zone matrix, same-zone local fee)  
- Livreurs management (docs, vehicle, status)

### Catalogue & moderation
- Users list / suspend  
- **Seller validations** (approve / reject proximité & enseigne)  
- Articles moderation (flag, reject, unpublish)  
- Orders overview  
- Categories / listing catalog admin  
- Signalements (reports)  
- Litiges (disputes): `release_seller` | `partial_refund` | `refund_buyer`

### Finances & partners
- Wallets overview  
- Enseignes / partenaires  
- Platform settings: commission % (standard vs proximité), minimums

## 12.3 Validation queue (critical path)
Input: shop applications with `verification_status=pending`.  
Output: approved (directory + publish unlocked) or rejected (reason stored).

## 12.4 Security
- Role `admin` only.  
- Never expose dispute resolve APIs to consumer tokens.
