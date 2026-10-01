# Checkout handoff — Next.js (web)

**Audience:** Web cart / checkout / admin tarifs  
**API base:** `/api/v1` · Consumer Bearer (checkout) · Admin Bearer (tarifs)  
**Status:** Shipped on Nest  
**Related:** [checkout-mobile-flutter-handoff.md](./checkout-mobile-flutter-handoff.md) · [09-commerce.md](./09-commerce.md) · [nextjs-axios.md](./nextjs-axios.md)

Server owns totals. Buyer pays **display prices** only (commission already in listing `priceGnf`). One OM charge → **N seller orders**.

---

## Consumer endpoints

| Method | Path | Auth |
|--------|------|------|
| GET/DELETE | `/cart` | consumer |
| POST | `/cart/items` | consumer |
| PATCH/DELETE | `/cart/items/:id` | consumer |
| POST | `/cart/validate` | consumer |
| GET | `/catalog/delivery-zones` | public |
| GET | `/catalog/shipping-rates` | public |
| POST | `/checkout/quote` | consumer |
| POST | `/checkout/payments` | consumer + `Idempotency-Key` |
| GET | `/checkout/payments/:id` | consumer |

Legacy `POST /checkout` (instant pay + clear cart) is **removed** — use quote → payments → poll.

Webhook (PSP only): `POST /webhooks/orange-money` (also legacy `POST /payments/webhooks/orange-money`).

---

## Suggested client helpers

```ts
// cart
getCart()
addCartItem(listingId: string, quantity = 1)
updateCartItem(itemId: string, quantity: number)
removeCartItem(itemId: string)
clearCart()
validateCart()

// checkout
getDeliveryZones()
getShippingRates()
quoteCheckout(body: QuoteBody)
createPayment(body: PayBody, idempotencyKey: string)
getPayment(paymentIntentId: string)
```

Cache key: keep **one** `['cart']` query; every cart mutation returns the full cart — replace cache.

---

## Quote → pay

1. `validateCart()` — abort if `!ok`  
2. Collect address (see field matrix below)  
3. `quoteCheckout({ cartRevision, fulfillmentMode, address })`  
4. Show **server** `subtotalGnf` + `deliveryFeeGnf` + `grandTotalGnf` by `sellerGroups`  
5. Collect `orangeMoneyPhone` (not PIN)  
6. `createPayment({ …quote fields, orangeMoneyPhone, quoteGrandTotalGnf }, crypto.randomUUID())`  
7. Poll `getPayment` every 2–3s until terminal  
8. On `succeeded`: confirmation route; cart already cleared server-side  

Same `Idempotency-Key` + same body → original intent. Different body → `IDEMPOTENCY_CONFLICT`.

---

## Address matrix

| Field | Required when |
|-------|----------------|
| `name`, `phone` | Always |
| `zoneId` | `courier` or `shopLocalDelivery` |
| `quartier` | `zone_1` \| `zone_2` |
| `manualAddress`, `landmark` | `zoneId === other` |
| `fulfillmentMode` | Always (`pickup` default for proximité) |

Normalize phones to Guinea E.164 (`+224…`). Delivery phone ≠ OM phone allowed.

---

## Pricing UI

Checkout shows: **subtotal (display) + delivery = total**.  
Do **not** add a commission line. FAQ copy (~1% OM + ~7% platform) is marketing only.

---

## Admin

| Method | Path |
|--------|------|
| GET/POST | `/admin/shipping-rates` |
| GET | `/admin/payments` |

`POST` body: `{ fromZoneCode, toZoneCode, feeGnf, isActive? }` upserts the matrix cell.

Delivery zone catalog for checkout is logical (`zone_1` / `zone_2` / `other`) — distinct from geo `GET /catalog/zones` used by sellers.

---

## Multi-seller

One payment intent, `orderIds: string[]`. Confirmation / order history must list **all** orders. Do not assign `sellerId = items[0]`.

---

## Error handling (web)

| Code | UI |
|------|-----|
| `TOTAL_CHANGED` | Refresh quote, show banner |
| `MIXED_PROXIMITY_COURIER` | Block checkout, explain |
| `OUT_OF_STOCK` / `PRICE_CHANGED` | Revalidate cart |
| `PAYMENT_FAILED` / poll `failed` | Retry with new Idempotency-Key |
| `401` | Login — no guest checkout |

---

## Checklist

- [ ] Replace mock cart with API  
- [ ] Wire quote + payments + poll  
- [ ] Idempotency-Key header  
- [ ] Admin shipping rates page → `/admin/shipping-rates`  
- [ ] Pickup code on proximity order detail  
