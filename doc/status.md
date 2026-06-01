# Build Status

> **Living document.** Update this whenever you finish a meaningful unit of work
> (a module rewrite, a spec section closing, an endpoint set added/removed).
> See `AGENTS.md` for the obligation to keep this file current.

**Last verified:** 2026-05-24
**Verified by:** end-to-end smoke against local docker postgres + live backend on `http://localhost:3000`

---

## Bottom line

- **Backend ↔ DDL alignment:** clean. 33/36 tables actively used; the three unused tables (`audit_logs`, `shipments`, `shipment_packs`) are deliberate gaps documented below.
- **Frontend ↔ Backend integration:** every page calls real endpoints; 22/22 endpoints respond `200` live; no dangling URL references.
- **Spec compliance (`doc/pr-1_spec.md`):** ~85% wired end-to-end. The remaining ~15% is concentrated in audit-log writes, the shipments lifecycle, and the returns/refunds + reports UIs.
- **Tests:** 11 backend tests (auth + users contract); 1 frontend placeholder. The catalog → PO → production → sales chain is verified via manual smoke runs, not yet by automated tests.

---

## Backend ↔ DDL

| Layer | Count | Notes |
|---|---|---|
| DDL tables | 36 | `packages/backend/sql/ddl.sql` |
| Backend modules | 14 | `auth, customers, dashboard, formulas, inventory, losses, paints, production, purchase-orders, resources, sales, settings, suppliers, users` |
| pgtyped queries | 184 | `packages/backend/sql/queries.sql` → generates `src/queries.ts` |
| Tables referenced by queries | 33 / 36 | three unreferenced (see below) |
| Queries referencing unknown tables | 0 | no schema drift |

### Tables with no backend usage

- **`audit_logs`** — table + append-only trigger exist (`ddl.sql:129-148`), but nothing writes to it. **Spec §3.9 violation** (acceptance criterion: "100% of mutating actions appear in the audit trail").
- **`shipments`** + **`shipment_packs`** — **Spec §3.4 violation.** No endpoints; `customer_orders.shipped_at` / `completed_at` never set. The shipment lifecycle (Operator marks ready → Sales marks shipped) is missing.

### Spot-checks that PASS

- Wastage symmetric, **variance asymmetric (over-consumption only)** — `production/index.ts:285` uses `variance_pct > threshold` (not `Math.abs`).
- Threshold resolution per spec §3.3: per-formula override → `app_settings` → `SYSTEM_DEFAULTS` — `production/index.ts:122` `pickThreshold(...)`.
- Sales **financial visibility** (§3.4): `sales/index.ts:185, 446` null `negotiated_price_per_pack` / `price_per_pack` for non-owner non-Manager.
- Cost-to-build computed live from `formula_resources × resources.weighted_avg_cost_per_kg / standard_output_kg` — `sales/index.ts:137`.
- Resource weighted-avg cost maintained by DDL trigger on `resource_stock_transactions` (`ddl.sql:381-422`); PO receive fires the trigger.
- ON DELETE CASCADE coverage (paint→variants, order→items, sale→sale_items, etc.) — matches the spec's archive-cascade intent; physical deletes aren't issued anyway (only soft-delete).
- Password-reset flow (§5): NULL `password_hash` / `password_reset_required` → `/auth/login` returns 403 `password_reset_required` → `/auth/set-password` accepts a one-time set → JWT.
- Device approval (§2.2): Operator/Sales blocked on first device with 403 + pending row; Managers bypass and auto-approve their device for the audit trail.

---

## Frontend ↔ Backend

All 19 frontend pages and every `apiRequest(...)` URL map to a live backend route. Verified live: every endpoint listed below returns `200` with a valid JWT.

| Frontend page | Backend endpoints |
|---|---|
| `Login.tsx` | `/auth/login`, `/auth/set-password` |
| `Dashboard.tsx` | `/api/dashboard` |
| `Paints.tsx` | `/paints`, `/paints/:id/{archive,restore}` |
| `Formulas.tsx` | `/formulas`, `/formulas/:id`, `/formulas/:id/{default,archive,restore}` |
| `Clients.tsx` (Customers) | `/customers/*`, `/customers/:id/shipping-addresses` |
| `Suppliers.tsx` | `/suppliers/*` |
| `RawMaterials.tsx` | `/resources/*` |
| `PurchaseOrders.tsx` | `/purchase-orders`, `/:id/{transition,receive}` |
| `Production.tsx`, `ProductionRunForm`, `ProductionDetail`, `ProductionPackaging` | `/production/{requests,runs}/...` |
| `Orders.tsx` | `/sales/orders/:id/{submit,approve,cancel,confirmation,sale,cost-to-build}` |
| `Sales.tsx` | `/sales/orders/:id/sale`, `/inventory/finished/by-variant/:id` |
| `SalesHistory.tsx` | `/sales/transactions[/:id/payments]` |
| `Inventory.tsx` | `/inventory/{finished,finished/stash,resources}` |
| `Losses.tsx` | `/api/losses[/operator-summary]` |
| `Settings.tsx` | `/settings[/:key]`, `/settings/pack-sizes[/:kg]` |
| `Users.tsx` | `/users`, `/users/device-requests`, `/users/:id/reset-password` |
| `SharedPurchaseOrder.tsx` | placeholder (no public PO-by-token endpoint yet) |

---

## Spec coverage matrix

| § | Item | Backend | Frontend |
|---|---|---|---|
| §2 | User roles + permissions | ✅ | ✅ |
| §2.1 | Customers + Suppliers (data entities) | ✅ | ✅ |
| §2.2 | Device approval (clientId UUID, Manager bypass) | ✅ | ✅ |
| §3.1 | Paints + variant matrix + formulas + default + copy | ✅ | ✅ |
| §3.1 | Shelf-life rules (water-based 1y / made-to-order) | ❌ | ❌ |
| §3.2 | Resources, weighted-avg cost on PO receipt | ✅ | ✅ |
| §3.2 | Supplier-supplied finished paint via PO | ✅ | ⚠️ create UI only supports resource lines |
| §3.2 | Low-stock alerts to Managers | ✅ flag computed; ❌ no notification | ✅ dashboard tile |
| §3.3 | Production requests, run, dilution, actuals, packaging, stash | ✅ | ✅ |
| §3.3 | Per-formula threshold overrides | ✅ | ❌ read-only display; no editor |
| §3.4 | Customer orders, variant drill-down, payment terms, due date | ✅ | ✅ |
| §3.4 | Manager approval before fulfilment | ✅ | ✅ |
| §3.4 | Order status auto-progression (approved → in_production → ready_for_shipment → shipped → completed) | ❌ | n/a |
| §3.4 | **Shipments** (Operator marks ready, Sales marks shipped) | ❌ tables exist, no endpoints | ❌ |
| §3.4 | Order Confirmation document | ✅ jsonb snapshot versioned | ⚠️ totals shown via alert; PDF render + email not done |
| §3.4 | Sales rep financial visibility | ✅ | ✅ "restricted" handling |
| §3.4 | Multiple Payments per sale, Payment Status | ✅ | ✅ |
| §3.4 | Overdue detection | ✅ dashboard tile | ✅ |
| §3.5 | Returns + disposition (`re_inventory` / `lost`) | ✅ | ❌ no returns UI |
| §3.5 | Refund approval workflow + multiple payouts | ✅ | ❌ no refund UI |
| §3.6 | Tolerance-bounded irregularity flagging | ✅ (refund payout still hard-codes 0.01) | ⚠️ |
| §3.7 | Weighted-average cost + cost-to-build | ✅ | ✅ |
| §3.8 | kg + per-row currency | ✅ | ✅ |
| §3.9 | Production Irregularity Report | ✅ | ✅ |
| §3.9 | Sales/Financial Irregularity Report | ❌ no endpoint | ❌ |
| §3.9 | Resource Purchase History Report | ❌ (data exists via PO list) | ❌ |
| §3.9 | Refunds Report | ❌ | ❌ |
| §3.9 | Overdue Sales Report | partial (dashboard tile) | partial |
| §3.9 | **Audit Trail** (Manager-only) | ❌ table exists, no writer | ❌ no viewer |
| §3.10 | Archive/restore | ✅ | ✅ |
| §3.10 | Cascade-with-warning (impact preview) | ❌ | ❌ |
| §3.11 | Offline behaviour | ❌ | ❌ |
| §5 | Password reset (first-login + Manager-triggered) | ✅ | ✅ |
| §5 | Google sign-in for Manager | ❌ | ❌ |
| §6 | Phase-2 (PDF, FX, full offline) | out of scope | out of scope |

---

## Must-fix (P0 — required for spec-complete)

1. **Audit log writes.** Fastify `onResponse` hook in `app.ts` that filters non-GET routes and inserts `audit_logs(user_id, action, entity_type, entity_id, payload_diff)`. Plus `GET /audit-logs` (Manager). Spec §3.9 acceptance criterion.
2. **Shipments module.** `packages/backend/src/modules/shipments/index.ts` with `POST /shipments` + `:id/{ship,deliver}`. Should also advance the order through `ready_for_shipment` → `shipped` → `completed`. Plus a Sales-facing UI page.
3. **Order status auto-progression.** When a `production_run` is opened for an order_item, move the order to `in_production`. When all `sale_item_packs` for the order are claimed, move to `ready_for_shipment`. Shipments handle the rest.
4. **Returns + Refunds UI.** Backend complete; needs a Manager-facing UI on the Sale detail (`SalesHistory.tsx`).

## P1 (polish)

- **Per-formula threshold editor** in the Formulas page (backend already accepts on PATCH).
- **Reports**: Refunds, Sales/Financial Irregularity, Resource Purchase History endpoints + pages.
- **Cascade-impact preview** on archive (`GET /<entity>/:id/archive-impact`).
- **Refund tolerance** — currently `0.01` literal in `sales/index.ts`; read `finance.refund_tolerance` from `app_settings` instead.
- **Shelf-life enforcement** — block water-based pre-production; warn on return-to-inventory for near/past 1-year water-based packs.
- **PO create UI** for finished-paint lines (`kind=finished_paint`) — backend already supports it.
- **Order Confirmation PDF + email** — backend stores the payload; needs a renderer (`@react-pdf/renderer` server-side) and an SMTP provider.
- **Notifications** — low-stock, overdue-sale, device-approval pings.
- **Integration tests** for catalog → PO → production → sales chain (use `@electric-sql/pglite` or docker postgres in CI).

## Phase-2 (deliberately out of scope per §6)

- GST / tax invoicing
- Cross-currency aggregation + FX
- Full offline mode with background sync
- Google sign-in for Manager
- Standard pricing / catalogue prices

---

## How to refresh this file

When you finish a meaningful unit of work:

1. **Re-run the smoke checks** that produced the numbers in this file:
   - Backend endpoint sweep (login + the 22-endpoint loop).
   - DDL ↔ queries diff (the `comm` two-way comparison).
   - Frontend page compile check via Vite.
2. **Update the matching cells** in the spec coverage matrix (✅ / ⚠️ / ❌).
3. **Move items between Must-fix → P1 → "Done"** as work lands.
4. **Bump `Last verified`** at the top.
5. Mention this file in your PR description so a reviewer can verify the claim.
