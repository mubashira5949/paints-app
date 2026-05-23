--
-- Paint Production & Inventory App — Database Schema
-- See doc/pr-1_spec.md for requirements.
--
-- All weights are in kilograms. All money values carry an ISO 4217 currency
-- code; cross-currency conversion is out of scope (spec §3.8, §6).
--

SET client_min_messages = warning;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

--
-- ============================================================
-- Enums
-- ============================================================
--

CREATE TYPE user_role            AS ENUM ('manager', 'operator', 'sales');
CREATE TYPE device_status        AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE paint_classification AS ENUM ('oil_based', 'water_based');
CREATE TYPE ink_series           AS ENUM ('LCS', 'STD', 'OPQ_JS');

CREATE TYPE po_status            AS ENUM ('draft', 'ordered', 'shipped', 'received', 'cancelled');
CREATE TYPE po_line_kind         AS ENUM ('resource', 'finished_paint');

CREATE TYPE order_status         AS ENUM (
	'draft',
	'pending_approval',
	'approved',
	'in_production',
	'ready_for_shipment',
	'shipped',
	'completed',
	'cancelled'
);
CREATE TYPE payment_terms        AS ENUM ('prepaid', 'cod', 'net');
CREATE TYPE payment_method       AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other');
CREATE TYPE refund_status        AS ENUM ('pending_approval', 'approved', 'rejected', 'paid_out', 'n_a');

CREATE TYPE production_request_origin AS ENUM ('customer_order', 'demand_suggestion');
CREATE TYPE production_request_status AS ENUM ('pending', 'in_production', 'completed', 'cancelled');
CREATE TYPE production_run_status     AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TYPE pack_source          AS ENUM ('produced', 'supplier');
CREATE TYPE pack_status          AS ENUM ('in_stock', 'ready_for_shipment', 'shipped', 'sold', 'lost', 'returned');

CREATE TYPE return_condition     AS ENUM ('good', 'damaged', 'expired', 'other');
CREATE TYPE return_disposition   AS ENUM ('re_inventory', 'lost');

CREATE TYPE resource_txn_type    AS ENUM (
	'po_receipt',
	'production_consumption',
	'dilution_consumption',
	'manual_adjustment'
);

CREATE TYPE stash_txn_action     AS ENUM ('added', 'consumed', 'repackaged', 'manual_adjustment');

--
-- ============================================================
-- Shared trigger functions
-- ============================================================
--

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	NEW.updated_at = CURRENT_TIMESTAMP;
	RETURN NEW;
END;
$$;

--
-- ============================================================
-- Users, roles, devices (§2, §2.2, §5)
-- ============================================================
--

CREATE TABLE users (
	id                     int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	username               varchar(100) NOT NULL UNIQUE,
	-- Email required for managers (used for email/Google sign-in); optional otherwise.
	email                  varchar(255) UNIQUE,
	google_sub             varchar(255) UNIQUE,
	-- NULL while a password reset is pending; user must set a new one on next login (§5).
	password_hash          text,
	password_reset_required boolean      NOT NULL DEFAULT false,
	role                   user_role    NOT NULL,
	is_active              boolean      NOT NULL DEFAULT true,
	last_login             timestamptz,
	created_at             timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at             timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT users_manager_has_email CHECK (role <> 'manager' OR email IS NOT NULL)
);

CREATE TRIGGER trg_users_updated_at
	BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_devices (
	id           int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	-- Random UUID generated client-side and stored on the device (spec §2.2).
	client_id    uuid         NOT NULL,
	status       device_status NOT NULL DEFAULT 'pending',
	label        varchar(255),
	user_agent   text,
	last_seen_ip inet,
	approved_by  int          REFERENCES users(id),
	approved_at  timestamptz,
	created_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (user_id, client_id)
);

CREATE INDEX idx_user_devices_user_status ON user_devices (user_id, status);

CREATE TRIGGER trg_user_devices_updated_at
	BEFORE UPDATE ON user_devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--
-- ============================================================
-- Audit trail (§3.9)
-- Immutable: enforced via trigger preventing UPDATE/DELETE.
-- ============================================================
--

CREATE TABLE audit_logs (
	id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id     int          REFERENCES users(id),
	action      varchar(100) NOT NULL,
	entity_type varchar(50)  NOT NULL,
	entity_id   bigint,
	before      jsonb,
	after       jsonb,
	metadata    jsonb,
	created_at  timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION audit_logs_block_mutations() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
	FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutations();

--
-- ============================================================
-- App settings (thresholds, defaults) (§3.3, §3.6, §3.4)
-- ============================================================
--

CREATE TABLE app_settings (
	key        varchar(100) PRIMARY KEY,
	value      jsonb        NOT NULL,
	updated_by int          REFERENCES users(id),
	updated_at timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_app_settings_updated_at
	BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Configurable default pack sizes (kg). Managers manage the active list (§3.3).
CREATE TABLE pack_sizes (
	pack_size_kg numeric(10,4) PRIMARY KEY CHECK (pack_size_kg > 0),
	is_active    boolean       NOT NULL DEFAULT true,
	created_at   timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--
-- ============================================================
-- Paints, variants, formulas (§3.1)
-- ============================================================
--

-- A paint is the product. HSN code + product code are constant across variants.
CREATE TABLE paints (
	id            int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name          varchar(255) NOT NULL UNIQUE,
	swatch        varchar(50),       -- e.g. hex color or asset URL
	notes         text,
	hsn_code      varchar(50),
	product_code  varchar(50) UNIQUE,
	tags          jsonb        NOT NULL DEFAULT '[]'::jsonb,
	archived_at   timestamptz,
	archived_by   int          REFERENCES users(id),
	created_by    int          REFERENCES users(id),
	created_at    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_paints_hsn_code     ON paints (hsn_code);
CREATE INDEX idx_paints_product_code ON paints (product_code);
CREATE INDEX idx_paints_tags         ON paints USING gin (tags);

CREATE TRIGGER trg_paints_updated_at
	BEFORE UPDATE ON paints FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sellable variants = paint × classification × ink_series (spec §3.1).
-- Water-based variants are made-to-order with a 1-year shelf life (encoded in app logic).
CREATE TABLE paint_variants (
	id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	paint_id       int NOT NULL REFERENCES paints(id) ON DELETE CASCADE,
	classification paint_classification NOT NULL,
	ink_series     ink_series           NOT NULL,
	archived_at    timestamptz,
	archived_by    int          REFERENCES users(id),
	created_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (paint_id, classification, ink_series)
);

CREATE INDEX idx_paint_variants_paint ON paint_variants (paint_id);

CREATE TRIGGER trg_paint_variants_updated_at
	BEFORE UPDATE ON paint_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A formula is a recipe to produce one variant. Multiple per variant allowed;
-- most-recent or explicitly-flagged formula is the default (§3.1).
CREATE TABLE formulas (
	id                       int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	variant_id               int          NOT NULL REFERENCES paint_variants(id) ON DELETE CASCADE,
	name                     varchar(255) NOT NULL,
	notes                    text,
	standard_output_kg       numeric(14,6) NOT NULL CHECK (standard_output_kg > 0),
	is_default               boolean      NOT NULL DEFAULT false,
	-- Per-formula irregularity overrides; NULL means fall back to global app_settings (§3.3).
	wastage_threshold_pct           numeric(6,3),
	resource_variance_threshold_pct numeric(6,3),
	dilution_threshold_pct          numeric(6,3),
	archived_at  timestamptz,
	archived_by  int          REFERENCES users(id),
	created_by   int          REFERENCES users(id),
	created_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_formulas_variant ON formulas (variant_id);
-- At most one default formula per variant.
CREATE UNIQUE INDEX idx_formulas_one_default_per_variant
	ON formulas (variant_id) WHERE is_default;

CREATE TRIGGER trg_formulas_updated_at
	BEFORE UPDATE ON formulas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--
-- ============================================================
-- Resources, supplier POs, stock (§3.2, §3.7)
-- ============================================================
--

CREATE TABLE resources (
	id                       int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name                     varchar(255) NOT NULL UNIQUE,
	description              text,
	aliases                  jsonb        NOT NULL DEFAULT '[]'::jsonb,
	import_source            varchar(255),
	-- Maintained by trigger on resource_stock_transactions.
	current_stock_kg         numeric(16,6) NOT NULL DEFAULT 0 CHECK (current_stock_kg >= 0),
	weighted_avg_cost_per_kg numeric(14,4) NOT NULL DEFAULT 0 CHECK (weighted_avg_cost_per_kg >= 0),
	-- Per-resource low-stock threshold (kg); NULL falls back to global setting (§3.2).
	low_stock_threshold_kg   numeric(16,6),
	archived_at  timestamptz,
	archived_by  int          REFERENCES users(id),
	created_by   int          REFERENCES users(id),
	created_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_aliases ON resources USING gin (aliases);

CREATE TRIGGER trg_resources_updated_at
	BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE suppliers (
	id              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name            varchar(255) NOT NULL UNIQUE,
	contact_name    varchar(255),
	email           varchar(255),
	phone           varchar(50),
	address         text,
	website         varchar(255),
	gst_number      varchar(20),
	pocs            jsonb        NOT NULL DEFAULT '[]'::jsonb,
	notes           text,
	archived_at     timestamptz,
	archived_by     int          REFERENCES users(id),
	created_by      int          REFERENCES users(id),
	created_at      timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at      timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_suppliers_updated_at
	BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supplier-facing Purchase Order document (§3.2). Distinct from a customer order.
CREATE TABLE purchase_orders (
	id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	supplier_id int          NOT NULL REFERENCES suppliers(id),
	status      po_status    NOT NULL DEFAULT 'draft',
	currency    char(3)      NOT NULL DEFAULT 'INR',
	notes       text,
	share_token uuid         NOT NULL DEFAULT gen_random_uuid(),
	ordered_at  timestamptz,
	shipped_at  timestamptz,
	received_at timestamptz,
	archived_at timestamptz,
	archived_by int          REFERENCES users(id),
	created_by  int          REFERENCES users(id),
	created_at  timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at  timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders (supplier_id);
CREATE INDEX idx_purchase_orders_status   ON purchase_orders (status);

CREATE TRIGGER trg_purchase_orders_updated_at
	BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A PO line is EITHER a raw resource OR supplier-supplied finished paint of an existing variant (§3.2).
CREATE TABLE purchase_order_items (
	id                  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	purchase_order_id   int NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
	kind                po_line_kind NOT NULL,
	resource_id         int          REFERENCES resources(id),
	variant_id          int          REFERENCES paint_variants(id),
	pack_size_kg        numeric(10,4),
	quantity_kg         numeric(16,6),    -- used for resource lines and supplier-supplied bulk
	quantity_packs      int,              -- used for supplier-supplied packs
	-- Landed cost per kg (purchase price + shipping/import) — §3.2 / §3.7.
	landed_cost_per_kg  numeric(14,4) NOT NULL CHECK (landed_cost_per_kg >= 0),
	received_quantity_kg numeric(16,6) NOT NULL DEFAULT 0,
	received_packs       int           NOT NULL DEFAULT 0,
	created_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT po_item_kind_resource CHECK (
		kind <> 'resource' OR (resource_id IS NOT NULL AND quantity_kg IS NOT NULL AND quantity_kg > 0)
	),
	CONSTRAINT po_item_kind_finished CHECK (
		kind <> 'finished_paint' OR (
			variant_id IS NOT NULL AND pack_size_kg IS NOT NULL AND pack_size_kg > 0
			AND quantity_packs IS NOT NULL AND quantity_packs > 0
		)
	)
);

CREATE INDEX idx_po_items_po       ON purchase_order_items (purchase_order_id);
CREATE INDEX idx_po_items_resource ON purchase_order_items (resource_id);
CREATE INDEX idx_po_items_variant  ON purchase_order_items (variant_id);

CREATE TRIGGER trg_po_items_updated_at
	BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only ledger of all stock movements for resources. Maintains
-- resources.current_stock_kg and weighted_avg_cost_per_kg via trigger.
CREATE TABLE resource_stock_transactions (
	id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	resource_id     int          NOT NULL REFERENCES resources(id),
	txn_type        resource_txn_type NOT NULL,
	-- Signed: positive for receipts, negative for consumption.
	quantity_kg     numeric(16,6) NOT NULL CHECK (quantity_kg <> 0),
	-- Required for receipts (txn_type = 'po_receipt') to update weighted average.
	unit_cost_per_kg numeric(14,4),
	reference_type  varchar(50),
	reference_id    bigint,
	notes           text,
	created_by      int          REFERENCES users(id),
	created_at      timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rst_resource ON resource_stock_transactions (resource_id, created_at DESC);
CREATE INDEX idx_rst_ref      ON resource_stock_transactions (reference_type, reference_id);

CREATE OR REPLACE FUNCTION apply_resource_stock_txn() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	old_stock numeric(16,6);
	old_cost  numeric(14,4);
	new_stock numeric(16,6);
	new_cost  numeric(14,4);
BEGIN
	SELECT current_stock_kg, weighted_avg_cost_per_kg
	  INTO old_stock, old_cost
	  FROM resources WHERE id = NEW.resource_id FOR UPDATE;

	new_stock := old_stock + NEW.quantity_kg;
	IF new_stock < 0 THEN
		RAISE EXCEPTION 'Resource % stock would become negative (% + % = %)',
			NEW.resource_id, old_stock, NEW.quantity_kg, new_stock;
	END IF;

	-- Weighted average updates on receipts only; consumption keeps the prior average.
	IF NEW.txn_type = 'po_receipt' AND NEW.quantity_kg > 0 AND NEW.unit_cost_per_kg IS NOT NULL THEN
		IF new_stock = 0 THEN
			new_cost := NEW.unit_cost_per_kg;
		ELSE
			new_cost := ((old_stock * old_cost) + (NEW.quantity_kg * NEW.unit_cost_per_kg)) / new_stock;
		END IF;
	ELSE
		new_cost := old_cost;
	END IF;

	UPDATE resources
	   SET current_stock_kg = new_stock,
	       weighted_avg_cost_per_kg = new_cost,
	       updated_at = CURRENT_TIMESTAMP
	 WHERE id = NEW.resource_id;

	RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_resource_stock_txn
	AFTER INSERT ON resource_stock_transactions
	FOR EACH ROW EXECUTE FUNCTION apply_resource_stock_txn();

CREATE TABLE formula_resources (
	id                int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	formula_id        int NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
	resource_id       int NOT NULL REFERENCES resources(id),
	quantity_kg       numeric(16,6) NOT NULL CHECK (quantity_kg > 0),
	UNIQUE (formula_id, resource_id)
);

CREATE INDEX idx_formula_resources_formula  ON formula_resources (formula_id);
CREATE INDEX idx_formula_resources_resource ON formula_resources (resource_id);

--
-- ============================================================
-- Customers (§2.1)
-- ============================================================
--

CREATE TABLE customers (
	id               int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name             varchar(255) NOT NULL,
	contact_name     varchar(255),
	contact_phone    varchar(50),
	contact_email    varchar(255),
	billing_address  text,
	-- GST is optional (typically blank for international customers — spec §2.1).
	gst_number       varchar(20) UNIQUE,
	default_currency char(3) NOT NULL DEFAULT 'INR',
	notes            text,
	archived_at      timestamptz,
	archived_by      int      REFERENCES users(id),
	created_by       int      REFERENCES users(id),
	created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_customers_updated_at
	BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE customer_shipping_addresses (
	id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	customer_id int      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
	label       varchar(100) NOT NULL,
	address     text         NOT NULL,
	is_default  boolean      NOT NULL DEFAULT false
);

CREATE INDEX idx_customer_addresses_customer ON customer_shipping_addresses (customer_id);

--
-- ============================================================
-- Customer orders, order confirmations (§3.4)
-- ============================================================
--

CREATE TABLE customer_orders (
	id                   int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	customer_id          int          NOT NULL REFERENCES customers(id),
	shipping_address_id  int          REFERENCES customer_shipping_addresses(id),
	status               order_status NOT NULL DEFAULT 'draft',
	currency             char(3)      NOT NULL DEFAULT 'INR',
	payment_terms        payment_terms NOT NULL DEFAULT 'prepaid',
	-- Required when payment_terms = 'net'; otherwise NULL.
	payment_net_days     int          CHECK (payment_net_days IS NULL OR payment_net_days >= 0),
	order_date           timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	scheduled_ship_date  date,
	due_date             date,
	notes                text,
	-- Sales rep who placed this order; financials are visible only to them + Managers (§3.4).
	created_by           int          NOT NULL REFERENCES users(id),
	approved_by          int          REFERENCES users(id),
	approved_at          timestamptz,
	shipped_at           timestamptz,
	completed_at         timestamptz,
	cancelled_at         timestamptz,
	archived_at          timestamptz,
	archived_by          int          REFERENCES users(id),
	created_at           timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at           timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT customer_orders_net_days CHECK (
		(payment_terms = 'net') = (payment_net_days IS NOT NULL)
	)
);

CREATE INDEX idx_customer_orders_customer  ON customer_orders (customer_id);
CREATE INDEX idx_customer_orders_status    ON customer_orders (status);
CREATE INDEX idx_customer_orders_created_by ON customer_orders (created_by);
CREATE INDEX idx_customer_orders_due_date  ON customer_orders (due_date);

CREATE TRIGGER trg_customer_orders_updated_at
	BEFORE UPDATE ON customer_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE customer_order_items (
	id                          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	order_id                    int NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
	variant_id                  int NOT NULL REFERENCES paint_variants(id),
	pack_size_kg                numeric(10,4) NOT NULL CHECK (pack_size_kg > 0),
	quantity                    int           NOT NULL CHECK (quantity > 0),
	-- Per-pack negotiated price (§3.4). No stored "standard price".
	negotiated_price_per_pack   numeric(14,4) NOT NULL CHECK (negotiated_price_per_pack >= 0),
	-- Cost-to-build snapshot at the moment the order was drafted (§3.7).
	cost_to_build_per_pack      numeric(14,4),
	created_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_order_items_order   ON customer_order_items (order_id);
CREATE INDEX idx_customer_order_items_variant ON customer_order_items (variant_id);

-- Order Confirmations are versioned (§3.4).
CREATE TABLE order_confirmations (
	id           int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	order_id     int          NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
	version      int          NOT NULL,
	pdf_url      text,
	payload      jsonb        NOT NULL,
	emailed_to   varchar(255),
	emailed_at   timestamptz,
	generated_by int          REFERENCES users(id),
	created_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (order_id, version)
);

--
-- ============================================================
-- Production: requests, runs, dilution, packs, stash (§3.3)
-- ============================================================
--

CREATE TABLE production_requests (
	id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	variant_id     int          NOT NULL REFERENCES paint_variants(id),
	pack_size_kg   numeric(10,4) NOT NULL CHECK (pack_size_kg > 0),
	quantity_packs int          NOT NULL CHECK (quantity_packs > 0),
	origin         production_request_origin NOT NULL,
	order_item_id  int          REFERENCES customer_order_items(id),
	status         production_request_status NOT NULL DEFAULT 'pending',
	notes          text,
	created_by     int          REFERENCES users(id),
	created_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT production_requests_order_link CHECK (
		(origin = 'customer_order') = (order_item_id IS NOT NULL)
	)
);

CREATE INDEX idx_production_requests_status  ON production_requests (status);
CREATE INDEX idx_production_requests_variant ON production_requests (variant_id);

CREATE TRIGGER trg_production_requests_updated_at
	BEFORE UPDATE ON production_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE production_runs (
	id                  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	-- Human-readable, unique traceability key (§3.3).
	batch_number        varchar(50) NOT NULL UNIQUE,
	request_id          int         REFERENCES production_requests(id),
	variant_id          int         NOT NULL REFERENCES paint_variants(id),
	formula_id          int         NOT NULL REFERENCES formulas(id),
	status              production_run_status NOT NULL DEFAULT 'planned',
	expected_output_kg  numeric(16,6) NOT NULL CHECK (expected_output_kg > 0),
	actual_output_kg    numeric(16,6),
	-- Computed when actuals are logged. Symmetric flag per §3.3.
	wastage_pct         numeric(8,4),
	wastage_flagged     boolean      NOT NULL DEFAULT false,
	dilution_total_kg   numeric(16,6) NOT NULL DEFAULT 0,
	dilution_flagged    boolean      NOT NULL DEFAULT false,
	started_at          timestamptz,
	completed_at        timestamptz,
	notes               text,
	archived_at         timestamptz,
	archived_by         int          REFERENCES users(id),
	created_by          int          NOT NULL REFERENCES users(id),
	created_at          timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at          timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_runs_variant   ON production_runs (variant_id);
CREATE INDEX idx_production_runs_formula   ON production_runs (formula_id);
CREATE INDEX idx_production_runs_request   ON production_runs (request_id);
CREATE INDEX idx_production_runs_status    ON production_runs (status);

CREATE TRIGGER trg_production_runs_updated_at
	BEFORE UPDATE ON production_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-resource actuals for a run. Variance is asymmetric — over-consumption flags only (§3.3).
CREATE TABLE production_resource_actuals (
	id                int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	production_run_id int NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
	resource_id       int NOT NULL REFERENCES resources(id),
	expected_kg       numeric(16,6) NOT NULL,
	actual_kg         numeric(16,6) NOT NULL,
	variance_pct      numeric(8,4),
	flagged           boolean       NOT NULL DEFAULT false,
	created_at        timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (production_run_id, resource_id)
);

CREATE INDEX idx_production_resource_actuals_run ON production_resource_actuals (production_run_id);

-- Post-mix adjustments (dilution) — recorded separately from formula consumption (§3.3).
CREATE TABLE production_dilution_adjustments (
	id                int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	production_run_id int NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
	resource_id       int NOT NULL REFERENCES resources(id),
	kg_added          numeric(16,6) NOT NULL CHECK (kg_added > 0),
	notes             text,
	created_at        timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dilution_adjustments_run ON production_dilution_adjustments (production_run_id);

-- Per-variant leftover bucket from production (§3.3).
CREATE TABLE paint_variant_stash (
	variant_id    int PRIMARY KEY REFERENCES paint_variants(id) ON DELETE CASCADE,
	kg_remaining  numeric(16,6) NOT NULL DEFAULT 0 CHECK (kg_remaining >= 0),
	updated_at    timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stash_transactions (
	id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	variant_id        int NOT NULL REFERENCES paint_variants(id),
	delta_kg          numeric(16,6) NOT NULL CHECK (delta_kg <> 0),
	action            stash_txn_action NOT NULL,
	production_run_id int           REFERENCES production_runs(id),
	notes             text,
	created_by        int           REFERENCES users(id),
	created_at        timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stash_txn_variant ON stash_transactions (variant_id, created_at DESC);

CREATE OR REPLACE FUNCTION apply_stash_txn() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO paint_variant_stash (variant_id, kg_remaining, updated_at)
	VALUES (NEW.variant_id, NEW.delta_kg, CURRENT_TIMESTAMP)
	ON CONFLICT (variant_id) DO UPDATE
	   SET kg_remaining = paint_variant_stash.kg_remaining + EXCLUDED.kg_remaining,
	       updated_at   = CURRENT_TIMESTAMP;
	RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_stash_txn
	AFTER INSERT ON stash_transactions
	FOR EACH ROW EXECUTE FUNCTION apply_stash_txn();

-- One row per physical pack — enables full batch traceability (§3.3).
CREATE TABLE finished_paint_packs (
	id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	variant_id          int           NOT NULL REFERENCES paint_variants(id),
	pack_size_kg        numeric(10,4) NOT NULL CHECK (pack_size_kg > 0),
	source              pack_source   NOT NULL,
	production_run_id   int           REFERENCES production_runs(id),
	po_item_id          int           REFERENCES purchase_order_items(id),
	-- Cost per kg at the moment the pack entered inventory (§3.7).
	cost_per_kg         numeric(14,4) NOT NULL CHECK (cost_per_kg >= 0),
	status              pack_status   NOT NULL DEFAULT 'in_stock',
	location            varchar(255),
	created_at          timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at          timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT packs_source_produced CHECK (
		source <> 'produced' OR production_run_id IS NOT NULL
	),
	CONSTRAINT packs_source_supplier CHECK (
		source <> 'supplier' OR po_item_id IS NOT NULL
	)
);

CREATE INDEX idx_packs_variant_status ON finished_paint_packs (variant_id, status);
CREATE INDEX idx_packs_pack_size      ON finished_paint_packs (variant_id, pack_size_kg);
CREATE INDEX idx_packs_run            ON finished_paint_packs (production_run_id);

CREATE TRIGGER trg_packs_updated_at
	BEFORE UPDATE ON finished_paint_packs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--
-- ============================================================
-- Shipping, sales, payments (§3.4)
-- ============================================================
--

CREATE TABLE shipments (
	id            int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	order_id      int          NOT NULL REFERENCES customer_orders(id),
	carrier       varchar(255),
	tracking_no   varchar(255),
	shipped_at    timestamptz,
	delivered_at  timestamptz,
	notes         text,
	created_by    int          REFERENCES users(id),
	created_at    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_order ON shipments (order_id);

CREATE TRIGGER trg_shipments_updated_at
	BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE shipment_packs (
	shipment_id int    NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	pack_id     bigint NOT NULL REFERENCES finished_paint_packs(id),
	PRIMARY KEY (shipment_id, pack_id)
);

CREATE TABLE sales (
	id           int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	order_id     int          NOT NULL REFERENCES customer_orders(id),
	customer_id  int          NOT NULL REFERENCES customers(id),
	currency     char(3)      NOT NULL DEFAULT 'INR',
	sale_date    timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	due_date     date,
	notes        text,
	-- Sales rep who logged this sale; financials visible only to them + Managers (§3.4).
	created_by   int          NOT NULL REFERENCES users(id),
	archived_at  timestamptz,
	archived_by  int          REFERENCES users(id),
	created_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at   timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_order      ON sales (order_id);
CREATE INDEX idx_sales_customer   ON sales (customer_id);
CREATE INDEX idx_sales_created_by ON sales (created_by);
CREATE INDEX idx_sales_due_date   ON sales (due_date);

CREATE TRIGGER trg_sales_updated_at
	BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sale_items (
	id                  int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	sale_id             int NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
	order_item_id       int REFERENCES customer_order_items(id),
	variant_id          int NOT NULL REFERENCES paint_variants(id),
	pack_size_kg        numeric(10,4) NOT NULL CHECK (pack_size_kg > 0),
	quantity            int           NOT NULL CHECK (quantity > 0),
	price_per_pack      numeric(14,4) NOT NULL CHECK (price_per_pack >= 0),
	-- Cost snapshot at sale time (§3.7).
	cost_per_pack       numeric(14,4),
	created_at          timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale       ON sale_items (sale_id);
CREATE INDEX idx_sale_items_variant    ON sale_items (variant_id);
CREATE INDEX idx_sale_items_order_item ON sale_items (order_item_id);

-- Links a sold pack to its sale line (for batch traceability sale→pack→run).
CREATE TABLE sale_item_packs (
	sale_item_id int    NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
	pack_id      bigint NOT NULL REFERENCES finished_paint_packs(id),
	PRIMARY KEY (sale_item_id, pack_id),
	UNIQUE (pack_id)
);

-- Money received against a sale. Multiple per sale: advance, on-delivery, settlement, etc. (§3.4).
CREATE TABLE payments (
	id                int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	sale_id           int           NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
	amount            numeric(14,4) NOT NULL CHECK (amount > 0),
	currency          char(3)       NOT NULL,
	date_received     date          NOT NULL,
	method            payment_method NOT NULL,
	reference_number  varchar(255),
	receiving_account varchar(255),
	attachment_url    text,
	notes             text,
	created_by        int           REFERENCES users(id),
	created_at        timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at        timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_sale ON payments (sale_id);

CREATE TRIGGER trg_payments_updated_at
	BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--
-- ============================================================
-- Returns & refunds (§3.5)
-- ============================================================
--

CREATE TABLE returns (
	id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	sale_id        int NOT NULL REFERENCES sales(id),
	customer_id    int NOT NULL REFERENCES customers(id),
	return_date    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	notes          text,
	-- Manager completes the Return Form (§3.5).
	completed_by   int          NOT NULL REFERENCES users(id),
	created_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_returns_sale     ON returns (sale_id);
CREATE INDEX idx_returns_customer ON returns (customer_id);

CREATE TRIGGER trg_returns_updated_at
	BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE return_items (
	id           int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	return_id    int NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
	sale_item_id int NOT NULL REFERENCES sale_items(id),
	pack_id      bigint REFERENCES finished_paint_packs(id),
	condition    return_condition   NOT NULL,
	disposition  return_disposition NOT NULL,
	notes        text,
	created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_items_return    ON return_items (return_id);
CREATE INDEX idx_return_items_sale_item ON return_items (sale_item_id);

CREATE TABLE refunds (
	id              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	return_id       int NOT NULL UNIQUE REFERENCES returns(id) ON DELETE CASCADE,
	amount          numeric(14,4) NOT NULL CHECK (amount >= 0),
	currency        char(3) NOT NULL,
	status          refund_status NOT NULL DEFAULT 'pending_approval',
	approved_by     int           REFERENCES users(id),
	approved_at     timestamptz,
	rejected_reason text,
	created_by      int           REFERENCES users(id),
	created_at      timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at      timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refunds_status ON refunds (status);

CREATE TRIGGER trg_refunds_updated_at
	BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A refund may be paid out in multiple installments (§3.5).
CREATE TABLE refund_payouts (
	id                int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	refund_id         int           NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
	amount            numeric(14,4) NOT NULL CHECK (amount > 0),
	currency          char(3)       NOT NULL,
	date_paid         date          NOT NULL,
	method            payment_method NOT NULL,
	reference_number  varchar(255),
	paying_account    varchar(255),
	attachment_url    text,
	notes             text,
	created_by        int           REFERENCES users(id),
	created_at        timestamptz   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refund_payouts_refund ON refund_payouts (refund_id);

--
-- ============================================================
-- Seed data
-- ============================================================
--

-- Default admin user. Password is reset on first login (§5).
INSERT INTO users (username, email, role, password_hash, password_reset_required)
VALUES ('admin', 'admin@example.com', 'manager', NULL, true);

-- Default pack sizes (kg) — Managers may add/remove (§3.3).
INSERT INTO pack_sizes (pack_size_kg) VALUES
	(0.5), (1), (5), (6), (25), (30), (35), (50);

-- Global threshold and tolerance defaults (§3.3, §3.6).
INSERT INTO app_settings (key, value) VALUES
	('production.wastage_threshold_pct',           '5'::jsonb),
	('production.resource_variance_threshold_pct', '10'::jsonb),
	('production.dilution_threshold_pct',          '10'::jsonb),
	('inventory.low_stock_threshold_kg',           '20'::jsonb),
	('finance.payment_tolerance',                  '1'::jsonb),
	('finance.refund_tolerance',                   '1'::jsonb);
