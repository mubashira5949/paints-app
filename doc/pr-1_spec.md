**Paint Production & Inventory App: Specification Document**

**1. Introduction**

This document outlines the specifications for a custom web application designed to manage the production and inventory of paint colors. The primary goal of this application is to provide a simple, intuitive, and powerful tool to streamline the paint manufacturing process, from managing raw materials to tracking sales of finished products.

The application will be designed with a "mobile-first" approach, ensuring a seamless experience on tablets (especially iPads) and other mobile devices. This allows the team to access and update information from anywhere — in the office, the warehouse, or on the shop floor.

By using this application, the business will be able to:

* **Improve Efficiency:** Reduce manual data entry and paperwork.
* **Enhance Accuracy:** Minimize errors in inventory and production records.
* **Ensure Process Integrity:** Detect and flag irregularities, wastage, and potential cheating in both the manufacturing and sales processes.
* **Gain Insights:** Get a clear overview of operations and costs to make better business decisions.
* **Increase Accountability:** Track all actions performed within the system.

**1.1. Glossary**

* **Paint (Product):** A product defined by an **HSN code** and **product code** (which remain constant across its variants), plus a name, color swatch, notes, and tags. A paint declares which **product classifications** and **ink series** it supports — the sellable combinations of these are the paint's **variants**.
* **Product Classification:** A variant axis describing the chemistry of the produced paint. Current values: **Oil-based** and **Water-based**. A paint can support one or both.
* **Ink Series:** A variant axis describing the optical/finish series. Current values: **LCS**, **STD**, **OPQ/JS**. A paint can support one or more.
* **Variant:** A specific sellable combination of `(paint × product classification × ink series)`. Formulas, finished-paint inventory, production runs, and orders are tracked at the **variant** level.
* **Formula:** A specific recipe/formulation that defines the resources and quantities (in kg) required to produce a standard amount of a given **variant**.
* **Resource:** A raw material used in a formula — pigments, chemicals, binders, solvents, additives, etc.
* **Pack:** A packaged unit of finished paint (of a specific variant) of a defined weight in kg. Inventory is tracked as `weight × units` (e.g., `1 kg × 4 units`).
* **Stash:** Leftover finished paint from a production run that didn't fit a configured pack size, held per variant for use in the next run or for repacking into a smaller pack.
* **Production Run:** A single manufacturing batch for a given variant and formula, with a unique **batch number** for traceability.
* **Post-Mix Adjustment (Dilution):** A sub-step of a production run where the Operator adds resources (e.g., reducer) to the just-produced batch before packing, to hit target consistency. Shares the production run's batch number.
* **Production Request:** A request to produce a specific variant/pack configuration, triggered either by a customer order or by the dashboard's demand suggestion for pre-preparation.
* **Variance:** Difference between expected (per formula) and actual resource consumption or output during a production run.
* **Wastage:** Quantity of finished product lost during a production run, computed from the gap between expected and actual output.
* **Cost-to-Build:** The computed cost to produce a given variant/pack-size/quantity, derived from the variant's default formula and current weighted-average resource costs. Shown to Sales/Manager when drafting orders so they can negotiate price.
* **Customer Order:** A request from a customer (placed by Sales on their behalf) for one or more variant × pack-size × quantity line items, with per-line **negotiated prices**.
* **Order Confirmation:** The customer-facing PDF generated from a Customer Order, containing customer details, line items, negotiated prices, totals, and currency.
* **Payment Terms:** How a customer is expected to pay for an order — `Prepaid`, `Pay on delivery (COD)`, or `Pay later (Net X days)`. Set on the order; determines the sale's due date.
* **Payment:** A record of money received from a customer against a sale. A single sale may have multiple Payments (e.g., advance + on-delivery + settlement).
* **Refund:** A record of money returned to a customer against a return. Refunds have their own status workflow (`Pending Approval` → `Approved` → `Paid out`, or `Rejected` / `N/A`).
* **Purchase Order (PO):** The **supplier-facing** document we send to a supplier when buying resources or imported finished paint. (Not used for any customer-facing document.)
* **Customer (Client):** A buyer of finished paint. Stored as a **data entity** only — not a login user.
* **Supplier:** A vendor of raw materials (and, optionally, ready packages of finished paint). Stored as a **data entity** only — not a login user.

**2. User Roles**

The application has three user roles:

* **Manager (Admin):** Full access to all features. A Manager is a **superset** of the Operator and Sales Team Member roles — they can perform **every action** those roles can perform, in addition to Manager-only capabilities. Manager-only capabilities include: adding new paint colors, defining formulas, managing resources and supplier POs, viewing all reports (including production and financial irregularity reports), managing user accounts, **resetting user passwords**, approving customer orders, **approving refunds and recording refund payouts**, approving new-device login attempts, configuring thresholds for irregularity flagging, configuring default pack sizes, viewing the audit trail, and editing/archiving records.
* **Operator:** Day-to-day production staff. Operators can:
  * View production requests (from customer orders or dashboard demand suggestions).
  * Select the **variant** to be produced and the specific formula to be used (default formula prefilled per §3.1).
  * Log a production run (actual paint produced and actual resources consumed).
  * Record **post-mix adjustments (dilution)** during a production run.
  * Divide finished paint into packs as per the production request, and route any leftover residue to **stash** or a smaller configured pack size (Operator's choice).
  * Prepare packages for shipping (mark packs as ready for shipment).
  * Log waste.
* **Sales Team Member:** Sales-facing staff. Sales team members can:
  * Manage customers and suppliers (as data entities).
  * Place customer orders on behalf of customers, specifying variant, pack size, and quantity.
  * View the **cost-to-build** for a draft order and enter a **negotiated per-pack price** for each line.
  * Log shipping information — mark packages prepared by Operators as shipped, or record that they have been shipped.
  * Log sales transactions (with the negotiated per-line price) and **record one or more Payments** against each sale (advance, on-delivery, settlement, etc. — see §3.4).
  * Log returns from customers (Manager completes the return form — see §3.5).
  * View **all** customer orders, but **financials (negotiated prices, line totals, money collected) only on orders they themselves placed**. Other reps' line totals and collection amounts are not visible to them. Managers see all financials on all orders.

**2.1. Data Entities (non-login)**

* **Customer (Client):** Recorded and managed by Sales. Fields: contact, primary address, multiple shipping addresses, **GST number (optional — typically blank for international customers)**, default transaction currency.
* **Supplier:** Vendor of raw materials, recorded by Manager or Sales for use in supplier POs.

**2.2. Access Control — New Device Approval**

Each browser/device that signs in is assigned a **randomly generated UUID** ("client ID") stored on the device. On every login the backend checks whether this client ID is already approved for the user:

* **Approved client ID** → login proceeds.
* **New (unapproved) client ID** → login is **blocked** and the user is shown a screen explaining that this is a login from a new device requiring **Manager approval**. Managers approve pending client IDs from the admin console; once approved, the next login from that device succeeds.

Client IDs identify devices, not IP addresses — this avoids spurious blocks when users move between mobile networks and warehouse Wi-Fi.

**3. Core Features**

**3.1. Paints, Variants & Formula Management**

This feature is the heart of the application, allowing the business to define products and how they are made.

* **Add & Manage Paints:** Create a digital catalog of all paints. Each paint is identified by an **HSN code** and **product code** (which remain constant across that paint's variants).
  * **Paint-level fields:** name, color swatch, notes, **HSN code**, **product code**, and **product tags** (free-form, e.g., "premium", "industrial").
* **Variant Axes — Product Classification & Ink Series:** Each paint declares which variant axes it supports:
  * **Product Classification (chemistry):** tick one or both of **Oil-based** and **Water-based**.
  * **Ink Series (finish):** tick one or more of **LCS**, **STD**, **OPQ/JS**.
  * The cross-product of the ticked options defines the paint's sellable **variants**.
* **Shelf Life (per classification):**
  * **Water-based variants** have a **1-year shelf life** and are produced **made-to-order**.
  * **Oil-based variants** do not have this restriction and may be pre-produced for inventory.
* **Multiple Formulas per Variant:** Each **variant** can have multiple saved formulas. The **most recently created formula** is the **default** for that variant (used to prefill production requests and to compute cost-to-build). Managers can explicitly set a different formula as the default per variant, and can **copy an existing formula** (including across variants) as a starting point for a new one.
* **Formula Composition:** Each formula details the specific resources (in **kg**) and exact quantities needed to produce a **standard amount** of that variant. This forms the "expected" baseline for production. The estimated cost of each formula is computed from current resource costs (see §3.7 Costing).
* **No "Standard Price" Field:** Pricing for customer orders is **negotiated per order**, informed by cost-to-build (§3.7). Paints and variants do **not** carry a price attribute.
* **Listing UX:** Paint, variant, and formula lists support **pagination, search, and filtering** (by HSN code, product code, classification, ink series, tag, etc.).

**3.2. Resource & Stock Management**

This module manages raw materials from purchase to consumption.

* **Resource Database:** A centralized list of all resources — pigments (shades), raw materials (chemicals like reducers), binders, solvents, and additives. Fields: name and aliases, import source, current on-hand quantity (kg), weighted-average cost per kg (see §3.7).
* **Resource Purchasing & Cost Tracking — Supplier Purchase Orders (POs):**
  * **Create POs:** Managers create and track POs sent to suppliers. Each PO line records the resource, quantity ordered (kg), and the **landed cost per kg for that specific order** (purchase price + shipping/import costs).
  * **Track Order Status:** "Ordered," "Shipped," "Received."
  * **Automatic Stock Updates:** When a PO is marked "Received," the system adds the received quantity to the resource's on-hand stock and updates the weighted-average cost (§3.7).
  * **Supplier POs by Email/PDF:** POs can be exported as PDFs and emailed to suppliers directly from the app.
* **Real-time Stock Tracking:** Current stock level of each resource is shown in real time.
* **Low-Stock Alerts:** The system notifies Managers when a resource's stock falls below a **Manager-configured threshold** (per resource, with a sensible default).
* **Imported / Supplier-Supplied Finished Paint:** Suppliers may also provide **ready packages of paint**. These are recorded against an **existing variant** in the catalog and added directly to that variant's finished-paint inventory (see §3.4), with **supplier**, **location**, and **cost-of-acquisition per kg (purchase price + shipping)** stored. They bypass production but participate in normal sales, shipping, and returns workflows. The cost-of-acquisition is used for §3.7 cost-to-build on supplier-supplied stock.
* **Listing UX:** Resource and PO lists support **pagination, search, and filtering**.

**3.3. Production, Waste, Dilution & Integrity Tracking**

This feature is critical for monitoring the manufacturing process and identifying discrepancies.

* **Production Requests:** Operators see a queue of production requests, generated from:
  * **Customer orders** placed by Sales (and approved per §3.4).
  * **Dashboard demand suggestions** for pre-preparing packs against expected demand.
* **Record Production Run:** When starting a batch, the Operator selects the **variant** to be produced and the specific formula. The default formula for that variant is preselected (see §3.1). Each production run is assigned a unique **batch number** for traceability.
* **Log Actuals vs. Expectations:** The Operator inputs:
  * The **actual amount of paint produced** (kg).
  * The **actual amount of each resource consumed** (kg) per formula resource.
* **Post-Mix Adjustments (Dilution):** After the formula resources have been mixed, and before packing, the Operator may record **one or more** post-mix adjustment rows — typically adding a reducer to hit target consistency. Each adjustment row records: **resource**, **kg added**, optional **note**. Adjustment additions:
  * **Deduct from raw inventory** like any other consumption.
  * Are **recorded separately** from formula resource consumption — they do **not** contribute to the resource-variance check below (so the formula-vs-actual comparison stays clean).
  * Have their own optional irregularity threshold (see Irregularity Flagging).
  * Are part of the same production run and share its batch number — no separate batch is created.
* **Automatic Comparison & Variance Calculation:** The system computes two checks against the chosen formula:
  * **Wastage %:** `(expected output − actual output) / expected output`.
  * **Resource variance % (per formula resource):** `(actual consumed − expected consumed) / expected consumed`.
* **Irregularity Flagging — three independent checks:**

  | Check | Direction | Default threshold |
  |---|---|---|
  | Wastage | symmetric (over- or under-production both flag) | 5% |
  | Resource variance (per resource) | **asymmetric — over-consumption only** | 10% |
  | Dilution total (`Σ dilution kg / actual output kg`) | symmetric | 10% |

  All three are **Manager-configurable**. Each has a **global setting** and an optional **per-formula override**. Threshold resolution order: **per-formula override (if set) → global setting (if set) → system default**.

* **Packaging Management:** After production (and any dilution), the Operator divides finished paint into packs. Default pack sizes: 0.5 kg, 1 kg, 5 kg, 6 kg, 25 kg, 30 kg, 35 kg, 50 kg — **configurable by Managers**. Inventory tracks packs as **`weight × units`**. **Partial packs are not allowed.** Any leftover residue (e.g., 0.3 kg left after filling four 1 kg packs) is, at the **Operator's choice**:
  * Held as **stash** (per-variant leftover bucket) for use in the next production run of that variant, or
  * Repackaged into a **smaller configured pack size** if one fits.
* **Batch / Lot Traceability:** Each pack is linked to its production run (batch number). Traceability flows from sale → pack → batch → formula → resource lots consumed → dilution adjustments (if any), supporting quality investigations and recalls.
* **Prepare for Shipping:** Operators mark packs as **ready for shipment** when packaged and labeled for a specific production request.

**3.4. Sales, Orders & Shipping**

This module covers customer orders, sales logging, and shipping.

* **Customer & Supplier Management:** Sales create and maintain customer and supplier records (data entities — see §2.1).
* **Order Management & Approval:**
  * **Order line selection flow.** When a customer places an order (via Sales), each line item is built by drilling down through the variant axes in this order:
    1. **Paint** — select by HSN code and product code (or by name/swatch).
    2. **Product Classification** — choose **Oil-based** or **Water-based** (only options the paint supports are shown).
    3. **Ink Series** — choose **LCS**, **STD**, or **OPQ/JS** (only options the paint supports are shown).
    4. **Pack size** — choose from the pack sizes configured for that variant.
    5. **Quantity** — number of packs.
  * Orders may contain multiple line items across different variants.
  * **Cost-to-build per line is shown to Sales** (and Manager) as the order is drafted, computed using the variant's default formula and current weighted-average resource costs (§3.7). Sales then enters the **negotiated per-pack price** for each line. There is no stored "standard price."
  * **Payment Terms.** Sales selects one of `Prepaid`, `Pay on delivery (COD)`, or `Pay later (Net X days)` when drafting the order. This determines the sale's **due date** (immediate for Prepaid; the scheduled shipping date for COD; order date + N days for Net X). Payment terms and due date appear on the Order Confirmation.
  * Orders require **Manager approval** before fulfillment.
  * **Order Changes & Cancellations:**
    * Anytime **before production starts** for an order, Sales may freely modify or cancel any line.
    * **Once production has started** for any line in the order, **any change requires Manager approval**.
  * Integration with an **email service** (provider TBD — selected based on cost and reliability) for order confirmations, status updates, and approval notifications.
* **Generate & Share Order Confirmation:** From any customer order, the system can generate a formatted **Order Confirmation document (PDF)** containing the customer details (including shipping address and GST number if present), all line items (paint, classification, ink series, pack size, quantity, negotiated unit price, line total), totals, and the transaction currency.
  * The document can be **emailed to the customer** directly from the app (optional — Sales decides per order).
  * The document can be **exported / downloaded as a PDF** for printing or sharing through other channels.
  * Order Confirmations are versioned: if the order is changed after a confirmation is generated, a new version is produced (older versions remain in the audit trail).
  * Naming: **"Order Confirmation"** is the customer-facing document. **"Purchase Order"** in this app refers exclusively to documents we send to **suppliers** (see §3.2).
* **Shipping:**
  * Operators mark packs as ready for shipment (see §3.3).
  * Sales log shipping information — that ready packages have been shipped (or are about to ship) to the customer.
* **Log Sales:**
  * When recording a sale, Sales specify the **variant** (paint → classification → ink series), **pack size**, and **quantity** — using the same drill-down flow as order entry.
  * The system defaults to the **negotiated per-pack price** from the originating order; Sales may further adjust the per-line price at the time of sale if needed.
  * Sales of imported / supplier-supplied finished paints are logged the same way.
  * Money collected against a sale is captured via one or more **Payment records** (see below) — not as a single field on the sale.
* **Record Payments:** Each sale can have **one or more Payment records** (e.g., advance + on-delivery + final settlement). Each Payment records:
  * **Amount** in the transaction currency.
  * **Date received.**
  * **Method:** cash / bank transfer / UPI / cheque / card / other.
  * **Reference number** (UPI txn ID, cheque #, bank slip #, etc.) — optional.
  * **Receiving account** (which of our bank accounts received the money) — optional.
  * **Attachment** (e.g., photo of cheque, screenshot of UPI confirmation) — optional.
  * Note: customer bank/card details (account numbers, card numbers) are **not stored** in the app.
* **Payment Status (derived per sale):**
  * `Unpaid` — no Payments recorded.
  * `Partially Paid` — sum of Payments < billed amount (beyond §3.6 tolerance).
  * `Paid` — sum of Payments ≈ billed amount (within tolerance).
  * `Overpaid` — sum of Payments > billed amount (beyond tolerance — flagged per §3.6).
* **Overdue Detection:** A sale where the **due date** has passed and Payment Status is `Unpaid` or `Partially Paid` is flagged as **Overdue**. Overdue sales appear on the dashboard for the responsible Sales rep and for Managers, and trigger a notification on the day they first go overdue.
* **Finished Paint Inventory:** A real-time inventory of finished paint products is maintained per variant — tracked by **packs** (weight × units) and by **stash** (residual kg). Inventory is automatically deducted when a sale is logged.
* **Sales Visibility (financials):** All Sales reps can see all customer orders and shipment statuses. **Financial fields (negotiated prices, line totals, money collected) on a given order are visible only to the Sales rep who placed that order, and to Managers.** Other reps see the order's line items but not its money figures.
* **Listing UX:** Order, sales, customer, and supplier lists support **pagination, search, and filtering**.

**3.5. Post-Sale: Returns**

* **Returns:** Customers may return goods (managed against the original sale). The **Manager** completes a **Return Form** for each returned pack, recording:
  * Link to the original sale and pack(s).
  * Condition assessment (e.g., good / damaged / expired).
  * **Disposition decision** — for packs the Manager judges to be still good, the pack is **added back to the ready-for-shipment inventory** of its variant and can be sold to another customer. Packs judged not good are recorded as lost and are **not** re-added to inventory.
  * **Refund (optional):** If a refund/credit is owed to the customer, the Manager records the refund amount and currency on the Return Form. This creates a **Refund record** with status `Pending Approval`. Returns with no refund owed get status `N/A`.

* **Refund Approval & Payout Workflow:**
  * Each pending Refund is reviewed by a Manager and either **Approved** (status → `Approved`) or **Rejected** (status → `Rejected`). Approval is a deliberate second step, distinct from filling out the Return Form, even when the same Manager performs both.
  * Once approved, the Manager records the **payout** — amount, date, method, reference number, our paying account, optional attachment (same fields as a sale Payment, §3.4). Status → `Paid out`. A refund may be paid out in **multiple installments** if needed; status becomes `Paid out` once the sum of payout records matches the approved amount within the §3.6 tolerance.
  * Refund status (`Pending Approval` / `Approved` / `Rejected` / `Paid out` / `N/A`) is visible on:
    * The **original sale** record (linked).
    * The **customer profile** (full refund history per customer).
    * The dedicated **Refunds Report** (§3.9).
* **Shelf-Life Note:** **Water-based variants** have a 1-year shelf life and are produced **made-to-order**; returned water-based packs near or past their shelf life should be declined for re-inventory.

(Post-production dilution is part of the production run — see §3.3.)

**3.6. Financial Integrity Tracking**

* **Automatic Financial Comparison — Sales:** For each sale, the system computes:
  * **Billed amount:** negotiated per-pack price × quantity (per line, summed).
  * **Money collected:** sum of all **Payments** (§3.4) recorded against the sale.
  * Every difference between **billed amount** and **money collected** is **recorded** on the sale.
  * A difference is **flagged as an irregularity** only when its magnitude exceeds a **Manager-configured tolerance** (per-transaction, configurable; sensible default applies). Small rounding differences within tolerance are recorded but not flagged. Both **underpayment** (collected < billed) and **overpayment** (collected > billed) beyond tolerance are flagged.
* **Automatic Financial Comparison — Refunds:** For each Refund (§3.5), the system compares the **approved refund amount** vs. the **sum of payout records** for that refund. Differences are recorded and flagged using the same tolerance model.
* **Cost-to-Build vs. Negotiated Price:** Because pricing is ad hoc, the system does **not** automatically flag low-margin sales. Managers can review cost-to-build vs. negotiated price in dashboards and reports.
* **Inventory & Financial Analysis:** Managers can compare sales data against production and inventory records to spot further anomalies.

**3.7. Costing**

* **Resource Cost Method:** Resource cost is computed using a **weighted average of the current stock's purchase prices, including shipping/import costs** (weighted-average cost of inventory). Imported supplier-supplied finished paints contribute their **cost-of-acquisition per kg (purchase price + shipping)** rather than a formula-based cost.
* **Cost to Build a Pack:**
  * **In-house variants:** `cost-to-build per kg = Σ (formula resource kg per kg of output × resource weighted-average cost per kg)`. Pack cost = cost per kg × pack weight in kg.
  * **Supplier-supplied stock of the same variant:** the **cost-of-acquisition per kg** is used directly.
* **Use:** Costing is used for dashboard insights, for the cost-to-build figure shown during order drafting (§3.4), and for cost-vs-collected analyses. It is **not** used for statutory financial accounting.

**3.8. Units & Measurement**

* **All weights — finished paint, packs, production output, resources, formula inputs, dilution additions, and stash — are measured and displayed in kilograms (kg).** Smaller amounts are shown as kg with decimal places (e.g., `0.000001 kg`). There is no separate gram mode.
* **Currency:**
  * **Default: INR.** Local (domestic) customers pay in INR in the vast majority of cases.
  * **International customers** may pay in **other currencies**. Sales can select the transaction currency when logging an order or sale.
  * The **actual money collected** is recorded in the same currency as the transaction. Financial-integrity comparisons (§3.6) are performed **within a single currency** — no FX conversion is applied automatically.
  * Each sale, order, and payment record stores its currency code (ISO 4217, e.g., `INR`, `USD`, `EUR`).
  * Reports may be filtered by currency. Cross-currency aggregation/conversion in reports is **out of scope** for the current deliverable (see §6 Phase 2).

**3.9. Reporting & Audit Trail**

* **Audit Trail:** Every important action is logged with a **timestamped, immutable** entry recording the user and the action — including customer order placement, Manager approval of orders and order changes, formula additions/edits, production logging (including dilution adjustments), sales logging, **payment recording**, returns, **refund creation, approval/rejection, and payouts**, shipping updates, archive/restore events, and new-device approvals. Audit logs are **viewable only by Managers (admins)** and cannot be edited or deleted.
* **Production Irregularity Report:** Lists all flagged production runs — expected vs. actual values, wastage, resource variances, dilution totals, date, operator, and batch number. Each flagged check (wastage / resource variance / dilution) is shown distinctly.
* **Sales & Financial Irregularity Report:** Lists all sales transactions where actual money collected differs from the billed amount by more than the configured tolerance. **Sales Team Members** see only their own logged sales (and only their own financials, per §3.4); **Managers** see all.
* **Resource Purchase History Report:** Complete history of all supplier POs — order date, resource, quantity, landed cost per kg (purchase + shipping), and status.
* **Refunds Report:** Lists all refunds with status (`Pending Approval` / `Approved` / `Rejected` / `Paid out` / `N/A`), customer, linked original sale, refund amount, currency, created date, approving Manager, paid-out date, and payout details (method, reference). **Sales Team Members** see refunds tied to their own sales only; **Managers** see all.
* **Overdue Sales Report:** Lists sales whose due date has passed with Payment Status `Unpaid` or `Partially Paid`. Columns include customer, billed amount, paid so far, days overdue, payment terms, and responsible Sales rep. **Sales Team Members** see their own sales only; **Managers** see all.
* **All reports support pagination, search, and filtering.**

**3.10. Edit, Archive & Restore Permissions**

To preserve data integrity, **only Managers** can edit or archive production runs, sales records, orders, formulas, and resource records. Operators and Sales Team Members can create records and update statuses within their workflow, but cannot retroactively modify or archive submitted records.

* **Soft delete only:** Deletes are **archival** — records are marked archived and excluded from default lists, but their data is retained for traceability and audit. Archived records can be **restored** by Managers.
* **Cascade with warning:** When archiving a record that has dependent records (e.g., a formula tied to past production runs, a sale tied to packs), the system shows the Manager a **warning listing the dependents** that will also be archived. The Manager confirms; all dependents are archived together. Restoration brings the set back together.
* **Audit trail is never archived or edited.** Archive and restore events themselves are recorded in the audit trail.

**3.11. Offline / Connectivity Behavior**

The application is expected to operate on tablets in warehouse and shop-floor environments where connectivity may be unreliable. The app supports **graceful degradation**:

* Connectivity status is clearly indicated in the UI at all times.
* Forms may be **drafted offline**. On submit, if the network call fails, the user is shown a message asking them to **reconnect to the internet**, and a **Retry** button.
* No automatic background retry — the user explicitly retries when they confirm connectivity is restored.
* Destructive actions (e.g., archiving) are disabled when offline.

Full offline mode (background sync, conflict resolution) is **not** in scope.

**4. Acceptance Criteria & Success Metrics**

Measurable targets defining the success of the first release:

* **Data Accuracy:** ≥ 99% match between system inventory and physical stock counts during periodic audits.
* **Irregularity Detection:** All production runs exceeding configured wastage / resource-variance / dilution thresholds are flagged in < 1 second after the production log is submitted.
* **Adoption:** ≥ 90% of production runs and ≥ 90% of sales transactions logged in the system within 30 days of rollout (vs. via paper).
* **Auditability:** 100% of mutating actions (create / update / status-change / archive / restore) appear in the audit trail with user + timestamp.
* **Performance:** Listing pages (colors, orders, sales, resources) load in < 2 seconds on a tablet over standard broadband.
* **Access Control:** New-device login approval flow blocks 100% of unapproved-device logins.

**5. Technical Details (in simple terms)**

* **Technology:** Web application, accessible from any device with a web browser; mobile-first responsive design.
* **Data Storage:** All data (colors, formulas, inventory, customer orders, etc.) is stored securely in a cloud-hosted database with regular backups.
* **Authentication:**
  * **Manager (Admin):** sign in with **username/email + password** or **Google sign-in**.
  * **Operator and Sales Team Member:** sign in with **username + password** only (no Google sign-in).
  * **New users** are created by a Manager.
  * **Password reset:** only a Manager can trigger a reset. A reset **clears the user's stored password**. On the user's next login attempt, the backend signals the frontend to require the user to **set a new password** before access continues.
  * **Device approval:** every device gets a client-side UUID; first login from a new device is blocked pending Manager approval (see §2.2).
* **Email Provider:** TBD — selected based on cost and reliability for transactional email (order confirmations, status updates, approval notifications, low-stock alerts).

**6. Phase 2 (Out of Scope for Current Deliverable)**

Recognized requirements deferred to a later phase:

* **GST, tax handling, and invoice generation** for sales transactions. (Current scope produces **Order Confirmations**, not tax invoices.)
* **Cross-currency aggregation and FX conversion** in reports (per-transaction multi-currency is in scope; consolidating revenue across currencies into a single base currency is not).
* **Full offline mode** with background sync and conflict resolution (current scope is graceful degradation with manual retry only).
* **Additional dilution workflows** beyond post-production fixes — e.g., aged-stock recovery, customer-specific dilution requests, stash repackaging via dilution. Current scope covers only post-production dilution by the Operator within a production run (§3.3).
* **Standard pricing / price lists / catalogue prices** for variants. Current scope is fully ad-hoc per-order negotiation informed by cost-to-build.
