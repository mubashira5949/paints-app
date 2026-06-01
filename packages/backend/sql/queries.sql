














/* @name GetUserByUsernameOrEmail */
SELECT id, username, email, password_hash, role, password_reset_required
  FROM users
 WHERE (LOWER(email) = LOWER(:upn) OR LOWER(username) = LOWER(:upn))
   AND is_active = TRUE
 LIMIT 1;

/*
  Sets a new password on the user *only* when the row is in the
  "must reset" state (password_hash IS NULL or password_reset_required).
  Atomically clears the flag. Returns 0 rows if the user isn't eligible —
  which the handler turns into a 409 (no plain "set password" while a real
  password is set; that path goes through Manager-reset first).
*/
/* @name SetUserPasswordIfReset */
UPDATE users
   SET password_hash = :password_hash!,
       password_reset_required = false,
       updated_at = CURRENT_TIMESTAMP
 WHERE id = :id!
   AND is_active = TRUE
   AND (password_hash IS NULL OR password_reset_required = TRUE)
 RETURNING id;

/* @name ResetUserPassword */
UPDATE users
   SET password_hash = NULL,
       password_reset_required = TRUE,
       updated_at = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id, username;

/* @name GetDeviceStatus */
SELECT status FROM user_devices WHERE user_id = :user_id! AND client_id = :client_id!;

/* @name InsertPendingDevice */
INSERT INTO user_devices (user_id, client_id, status, label, user_agent, last_seen_ip)
VALUES (:user_id!, :client_id!, 'pending', :label, :user_agent, :last_seen_ip);

/*
  Manager bypass for the device-approval gate (spec §2.2 protects operator/sales
  sign-ins; managers must still be able to recover from a new device themselves —
  otherwise no one would be able to approve them). Inserts as 'approved' on
  first sight, or flips an existing 'pending'/'rejected' row to 'approved'.
*/
/* @name UpsertApprovedDevice */
INSERT INTO user_devices (user_id, client_id, status, label, user_agent, last_seen_ip, approved_at, approved_by)
VALUES (:user_id!, :client_id!, 'approved', :label, :user_agent, :last_seen_ip, CURRENT_TIMESTAMP, :user_id!)
ON CONFLICT (user_id, client_id) DO UPDATE
   SET status       = 'approved',
       approved_at  = CURRENT_TIMESTAMP,
       approved_by  = EXCLUDED.approved_by,
       label        = COALESCE(EXCLUDED.label,        user_devices.label),
       user_agent   = COALESCE(EXCLUDED.user_agent,   user_devices.user_agent),
       last_seen_ip = COALESCE(EXCLUDED.last_seen_ip, user_devices.last_seen_ip);

/* @name UpdateDeviceLastSeen */
UPDATE user_devices SET last_seen_ip = :last_seen_ip
 WHERE user_id = :user_id! AND client_id = :client_id!;

/* @name UpdateUserLastLogin */
UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :user_id!;




/* @name InsertUser */
INSERT INTO users (username, email, password_hash, role, is_active)
VALUES (:username!, :email, :password_hash, :role!::user_role, FALSE)
RETURNING id, username, email, role, is_active, created_at;

/* @name ListUsers */
SELECT id, username, email, is_active, last_login, created_at, role
  FROM users
 ORDER BY id DESC;

/* @name UsersSummary */
SELECT
    count(*)                                       AS total_users,
    count(*) filter (where role = 'manager')       AS managers,
    count(*) filter (where role = 'operator')      AS operators,
    count(*) filter (where role = 'sales')         AS sales
  FROM users;

/* @name ListRoles */
SELECT unnest(enum_range(NULL::user_role))::text AS name;

/* @name PatchUser */
UPDATE users
   SET username      = COALESCE(:username, username),
       email         = COALESCE(:email, email),
       role          = COALESCE(:role::user_role, role),
       password_hash = COALESCE(:password_hash, password_hash),
       is_active     = COALESCE(:is_active, is_active),
       updated_at    = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id, username, email, role, is_active;

/* @name DeleteUser */
DELETE FROM users WHERE id = :id! RETURNING id, username;

/* @name ListPendingDeviceRequests */
SELECT d.id,
       u.username     AS "user",
       d.label        AS device,
       d.last_seen_ip,
       d.created_at   AS requested_at,
       d.status::text AS status
  FROM user_devices d
  JOIN users u ON u.id = d.user_id
 WHERE d.status = 'pending'
 ORDER BY d.created_at DESC;

/* @name ApproveDevice */
UPDATE user_devices
   SET status      = 'approved',
       approved_by = :approver_id!,
       approved_at = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING user_id;

/* @name RejectDevice */
UPDATE user_devices SET status = 'rejected' WHERE id = :id! RETURNING id;




/* @name ListPaints */
SELECT p.id, p.name, p.swatch, p.notes, p.hsn_code, p.product_code, p.tags,
       p.archived_at, p.created_at, p.updated_at,
       COALESCE(jsonb_agg(DISTINCT v.classification::text) FILTER (WHERE v.archived_at IS NULL), '[]'::jsonb) AS classifications,
       COALESCE(jsonb_agg(DISTINCT v.ink_series::text)     FILTER (WHERE v.archived_at IS NULL), '[]'::jsonb) AS ink_series,
       COUNT(v.id) FILTER (WHERE v.archived_at IS NULL)    AS variant_count,
       COUNT(*) OVER ()                                    AS _total
  FROM paints p
  LEFT JOIN paint_variants v ON v.paint_id = p.id
 WHERE (:include_archived::bool OR p.archived_at IS NULL)
   AND (:search::text       IS NULL OR p.name ILIKE :search OR p.hsn_code ILIKE :search OR p.product_code ILIKE :search)
   AND (:hsn_code::text     IS NULL OR p.hsn_code = :hsn_code)
   AND (:product_code::text IS NULL OR p.product_code = :product_code)
   AND (:tag::text          IS NULL OR p.tags @> to_jsonb(ARRAY[:tag::text]))
   AND (:classification::paint_classification IS NULL
        OR EXISTS (SELECT 1 FROM paint_variants v2 WHERE v2.paint_id = p.id AND v2.classification = :classification AND v2.archived_at IS NULL))
   AND (:ink_series::ink_series IS NULL
        OR EXISTS (SELECT 1 FROM paint_variants v3 WHERE v3.paint_id = p.id AND v3.ink_series = :ink_series AND v3.archived_at IS NULL))
 GROUP BY p.id
 ORDER BY p.name ASC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetPaint */
SELECT p.id, p.name, p.swatch, p.notes, p.hsn_code, p.product_code, p.tags,
       p.archived_at, p.created_at, p.updated_at,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id', v.id,
               'classification', v.classification,
               'ink_series', v.ink_series,
               'archived_at', v.archived_at
           ) ORDER BY v.classification, v.ink_series)
           FROM paint_variants v WHERE v.paint_id = p.id
       ), '[]'::jsonb) AS variants
  FROM paints p WHERE p.id = :id!;

/* @name InsertPaint */
INSERT INTO paints (name, swatch, notes, hsn_code, product_code, tags, created_by)
VALUES (:name!, :swatch, :notes, :hsn_code, :product_code,
        COALESCE(:tags::jsonb, '[]'::jsonb), :created_by!)
RETURNING id;

/* @name PatchPaint */
UPDATE paints
   SET name         = COALESCE(:name,         name),
       swatch       = COALESCE(:swatch,       swatch),
       notes        = COALESCE(:notes,        notes),
       hsn_code     = COALESCE(:hsn_code,     hsn_code),
       product_code = COALESCE(:product_code, product_code),
       tags         = COALESCE(:tags::jsonb,  tags),
       updated_at   = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name ArchivePaint */
UPDATE paints SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE id = :id! AND archived_at IS NULL RETURNING id;

/* @name RestorePaint */
UPDATE paints SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;

/* @name ArchivePaintVariants */
UPDATE paint_variants SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE paint_id = :paint_id! AND archived_at IS NULL;

/* @name RestorePaintVariants */
UPDATE paint_variants SET archived_at = NULL, archived_by = NULL WHERE paint_id = :paint_id!;

/* @name PaintExists */
SELECT 1 AS one FROM paints WHERE id = :id!;

/* @name UpsertPaintVariant */
INSERT INTO paint_variants (paint_id, classification, ink_series)
VALUES (:paint_id!, :classification!::paint_classification, :ink_series!::ink_series)
ON CONFLICT (paint_id, classification, ink_series)
DO UPDATE SET archived_at = NULL, archived_by = NULL;

/* @name GetVariant */
SELECT v.id, v.paint_id, v.classification, v.ink_series, v.archived_at,
       p.name AS paint_name, p.hsn_code, p.product_code, p.swatch
  FROM paint_variants v
  JOIN paints p ON p.id = v.paint_id
 WHERE v.id = :id!;

/* @name ArchiveVariant */
UPDATE paint_variants SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE id = :id! AND archived_at IS NULL RETURNING id;

/* @name RestoreVariant */
UPDATE paint_variants SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;




/* @name ListFormulas */
SELECT f.id, f.variant_id, f.name, f.standard_output_kg, f.is_default,
       f.notes, f.wastage_threshold_pct, f.resource_variance_threshold_pct,
       f.dilution_threshold_pct, f.archived_at, f.created_at, f.updated_at,
       p.id AS paint_id, p.name AS paint_name,
       v.classification, v.ink_series,
       COUNT(*) OVER () AS _total
  FROM formulas f
  JOIN paint_variants v ON v.id = f.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE (:include_archived::bool OR f.archived_at IS NULL)
   AND (:search::text  IS NULL OR f.name ILIKE :search OR p.name ILIKE :search)
   AND (:variant_id::int IS NULL OR f.variant_id = :variant_id)
 ORDER BY p.name ASC, f.is_default DESC, f.created_at DESC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name ListFormulasByVariant */
SELECT id, name, standard_output_kg, is_default, archived_at, created_at
  FROM formulas
 WHERE variant_id = :variant_id! AND archived_at IS NULL
 ORDER BY is_default DESC, created_at DESC;

/* @name GetFormula */
SELECT f.id, f.variant_id, f.name, f.notes, f.standard_output_kg, f.is_default,
       f.wastage_threshold_pct, f.resource_variance_threshold_pct, f.dilution_threshold_pct,
       f.archived_at, f.created_at, f.updated_at,
       v.classification, v.ink_series,
       p.id AS paint_id, p.name AS paint_name,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'resource_id', fr.resource_id,
               'resource_name', r.name,
               'quantity_kg', fr.quantity_kg
           ) ORDER BY r.name)
           FROM formula_resources fr
           JOIN resources r ON r.id = fr.resource_id
           WHERE fr.formula_id = f.id
       ), '[]'::jsonb) AS ingredients
  FROM formulas f
  JOIN paint_variants v ON v.id = f.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE f.id = :id!;

/* @name ClearDefaultFormulaForVariant */
UPDATE formulas SET is_default = false WHERE variant_id = :variant_id! AND is_default;

/* @name InsertFormula */
INSERT INTO formulas
    (variant_id, name, notes, standard_output_kg, is_default,
     wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct,
     created_by)
VALUES (:variant_id!, :name!, :notes, :standard_output_kg!, COALESCE(:is_default, false),
        :wastage_threshold_pct, :resource_variance_threshold_pct, :dilution_threshold_pct,
        :created_by!)
RETURNING id;

/* @name GetFormulaForCopy */
SELECT variant_id, name, notes, standard_output_kg,
       wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct
  FROM formulas WHERE id = :id! AND archived_at IS NULL;

/* @name InsertFormulaCopy */
INSERT INTO formulas
    (variant_id, name, notes, standard_output_kg, is_default,
     wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct,
     created_by)
VALUES (:variant_id!, :name!, :notes, :standard_output_kg!, false,
        :wastage_threshold_pct, :resource_variance_threshold_pct, :dilution_threshold_pct,
        :created_by!)
RETURNING id;

/* @name CopyFormulaIngredients */
INSERT INTO formula_resources (formula_id, resource_id, quantity_kg)
SELECT :new_id!, resource_id, quantity_kg FROM formula_resources WHERE formula_id = :source_id!;

/* @name PatchFormula */
UPDATE formulas
   SET name                            = COALESCE(:name, name),
       notes                           = COALESCE(:notes, notes),
       standard_output_kg              = COALESCE(:standard_output_kg, standard_output_kg),
       wastage_threshold_pct           = CASE WHEN :clear_wastage::bool    THEN NULL ELSE COALESCE(:wastage_threshold_pct,           wastage_threshold_pct)           END,
       resource_variance_threshold_pct = CASE WHEN :clear_variance::bool   THEN NULL ELSE COALESCE(:resource_variance_threshold_pct, resource_variance_threshold_pct) END,
       dilution_threshold_pct          = CASE WHEN :clear_dilution::bool   THEN NULL ELSE COALESCE(:dilution_threshold_pct,          dilution_threshold_pct)          END,
       updated_at                      = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name DeleteFormulaIngredients */
DELETE FROM formula_resources WHERE formula_id = :formula_id!;

/* @name InsertFormulaIngredient */
INSERT INTO formula_resources (formula_id, resource_id, quantity_kg)
VALUES (:formula_id!, :resource_id!, :quantity_kg!);

/* @name FormulaExists */
SELECT 1 AS one FROM formulas WHERE id = :id!;

/* @name GetFormulaVariant */
SELECT variant_id FROM formulas WHERE id = :id! AND archived_at IS NULL;

/* @name SetFormulaDefault */
UPDATE formulas SET is_default = true WHERE id = :id!;

/* @name ArchiveFormula */
UPDATE formulas
   SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!, is_default = false
 WHERE id = :id! AND archived_at IS NULL
 RETURNING id;

/* @name RestoreFormula */
UPDATE formulas SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;




/* @name ListResources */
SELECT r.id, r.name, r.description, r.aliases, r.import_source,
       r.current_stock_kg, r.weighted_avg_cost_per_kg,
       r.low_stock_threshold_kg, r.archived_at, r.created_at, r.updated_at,
       COUNT(*) OVER () AS _total
  FROM resources r
 WHERE (:include_archived::bool OR r.archived_at IS NULL)
   AND (:search::text IS NULL OR r.name ILIKE :search OR r.aliases @> to_jsonb(ARRAY[:search_exact::text]))
   AND (NOT :low_stock_only::bool OR r.current_stock_kg < COALESCE(
            r.low_stock_threshold_kg,
            (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
            0
       ))
 ORDER BY r.name ASC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetResource */
SELECT id, name, description, aliases, import_source,
       current_stock_kg, weighted_avg_cost_per_kg,
       low_stock_threshold_kg, archived_at, created_at, updated_at
  FROM resources WHERE id = :id!;

/* @name ListResourceTransactionsRecent */
SELECT id, txn_type::text AS txn_type, quantity_kg, unit_cost_per_kg,
       reference_type, reference_id, notes, created_at
  FROM resource_stock_transactions
 WHERE resource_id = :resource_id!
 ORDER BY created_at DESC
 LIMIT 20;

/* @name InsertResource */
INSERT INTO resources (name, description, aliases, import_source, low_stock_threshold_kg, created_by)
VALUES (:name!, :description, COALESCE(:aliases::jsonb, '[]'::jsonb), :import_source, :low_stock_threshold_kg, :created_by!)
RETURNING id;

/* @name PatchResource */
UPDATE resources
   SET name                   = COALESCE(:name, name),
       description            = COALESCE(:description, description),
       aliases                = COALESCE(:aliases::jsonb, aliases),
       import_source          = COALESCE(:import_source, import_source),
       low_stock_threshold_kg = CASE WHEN :clear_threshold::bool THEN NULL ELSE COALESCE(:low_stock_threshold_kg, low_stock_threshold_kg) END,
       updated_at             = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name ArchiveResource */
UPDATE resources SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE id = :id! AND archived_at IS NULL RETURNING id;

/* @name RestoreResource */
UPDATE resources SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;




/* @name ListCustomers */
SELECT c.id, c.name, c.contact_name, c.contact_phone, c.contact_email,
       c.gst_number, c.default_currency, c.archived_at, c.created_at,
       COUNT(*) OVER () AS _total
  FROM customers c
 WHERE (:include_archived::bool OR c.archived_at IS NULL)
   AND (:search::text IS NULL OR c.name ILIKE :search OR c.contact_email ILIKE :search OR c.gst_number ILIKE :search)
 ORDER BY c.name ASC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetCustomer */
SELECT c.id, c.name, c.contact_name, c.contact_phone, c.contact_email,
       c.billing_address, c.gst_number, c.default_currency, c.notes,
       c.archived_at, c.created_at, c.updated_at,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id', sa.id, 'label', sa.label, 'address', sa.address, 'is_default', sa.is_default
           ) ORDER BY sa.is_default DESC, sa.label)
           FROM customer_shipping_addresses sa WHERE sa.customer_id = c.id
       ), '[]'::jsonb) AS shipping_addresses
  FROM customers c WHERE c.id = :id!;

/* @name InsertCustomer */
INSERT INTO customers (name, contact_name, contact_phone, contact_email,
                       billing_address, gst_number, default_currency, notes, created_by)
VALUES (:name!, :contact_name, :contact_phone, :contact_email,
        :billing_address, :gst_number, COALESCE(:default_currency, 'INR'), :notes, :created_by!)
RETURNING id;

/* @name PatchCustomer */
UPDATE customers
   SET name             = COALESCE(:name, name),
       contact_name     = COALESCE(:contact_name, contact_name),
       contact_phone    = COALESCE(:contact_phone, contact_phone),
       contact_email    = COALESCE(:contact_email, contact_email),
       billing_address  = COALESCE(:billing_address, billing_address),
       gst_number       = CASE WHEN :clear_gst::bool THEN NULL ELSE COALESCE(:gst_number, gst_number) END,
       default_currency = COALESCE(:default_currency, default_currency),
       notes            = COALESCE(:notes, notes),
       updated_at       = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name ArchiveCustomer */
UPDATE customers SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE id = :id! AND archived_at IS NULL RETURNING id;

/* @name RestoreCustomer */
UPDATE customers SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;

/* @name CustomerExists */
SELECT 1 AS one FROM customers WHERE id = :id!;

/* @name ClearDefaultShippingAddress */
UPDATE customer_shipping_addresses SET is_default = false WHERE customer_id = :customer_id!;

/* @name InsertShippingAddress */
INSERT INTO customer_shipping_addresses (customer_id, label, address, is_default)
VALUES (:customer_id!, :label!, :address!, COALESCE(:is_default, false))
RETURNING id;

/* @name GetShippingAddressCustomer */
SELECT customer_id FROM customer_shipping_addresses WHERE id = :id!;

/* @name PatchShippingAddress */
UPDATE customer_shipping_addresses
   SET label      = COALESCE(:label, label),
       address    = COALESCE(:address, address),
       is_default = COALESCE(:is_default, is_default)
 WHERE id = :id!;

/* @name DeleteShippingAddress */
DELETE FROM customer_shipping_addresses WHERE id = :id! RETURNING id;




/* @name ListSuppliers */
SELECT s.id, s.name, s.contact_name, s.email, s.phone, s.gst_number,
       s.archived_at, s.created_at,
       COUNT(*) OVER () AS _total
  FROM suppliers s
 WHERE (:include_archived::bool OR s.archived_at IS NULL)
   AND (:search::text IS NULL OR s.name ILIKE :search OR s.email ILIKE :search OR s.gst_number ILIKE :search)
 ORDER BY s.name ASC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetSupplier */
SELECT id, name, contact_name, email, phone, address, website, gst_number,
       pocs, notes, archived_at, created_at, updated_at
  FROM suppliers WHERE id = :id!;

/* @name InsertSupplier */
INSERT INTO suppliers (name, contact_name, email, phone, address, website, gst_number, pocs, notes, created_by)
VALUES (:name!, :contact_name, :email, :phone, :address, :website, :gst_number,
        COALESCE(:pocs::jsonb, '[]'::jsonb), :notes, :created_by!)
RETURNING id;

/* @name PatchSupplier */
UPDATE suppliers
   SET name         = COALESCE(:name, name),
       contact_name = COALESCE(:contact_name, contact_name),
       email        = COALESCE(:email, email),
       phone        = COALESCE(:phone, phone),
       address      = COALESCE(:address, address),
       website      = COALESCE(:website, website),
       gst_number   = COALESCE(:gst_number, gst_number),
       pocs         = COALESCE(:pocs::jsonb, pocs),
       notes        = COALESCE(:notes, notes),
       updated_at   = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name ArchiveSupplier */
UPDATE suppliers SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE id = :id! AND archived_at IS NULL RETURNING id;

/* @name RestoreSupplier */
UPDATE suppliers SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;




/* @name ListAppSettings */
SELECT key, value, updated_at, updated_by FROM app_settings;

/* @name GetAppSetting */
SELECT value, updated_at, updated_by FROM app_settings WHERE key = :key!;

/* @name UpsertAppSetting */
INSERT INTO app_settings (key, value, updated_by)
VALUES (:key!, :value!::jsonb, :user_id!)
ON CONFLICT (key) DO UPDATE
   SET value      = EXCLUDED.value,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP;

/* @name DeleteAppSetting */
DELETE FROM app_settings WHERE key = :key!;

/* @name ListPackSizes */
SELECT pack_size_kg, is_active, created_at FROM pack_sizes WHERE is_active ORDER BY pack_size_kg ASC;

/* @name UpsertPackSize */
INSERT INTO pack_sizes (pack_size_kg, is_active) VALUES (:pack_size_kg!, true)
ON CONFLICT (pack_size_kg) DO UPDATE SET is_active = true;

/* @name DisablePackSize */
UPDATE pack_sizes SET is_active = false
 WHERE pack_size_kg = :pack_size_kg! AND is_active
 RETURNING pack_size_kg;




/* @name ListPurchaseOrders */
SELECT po.id, po.supplier_id, s.name AS supplier_name,
       po.status::text AS status, po.currency, po.notes,
       po.ordered_at, po.shipped_at, po.received_at,
       po.archived_at, po.created_at,
       COALESCE(SUM(
           CASE WHEN poi.kind = 'resource'
                THEN poi.quantity_kg * poi.landed_cost_per_kg
                ELSE poi.quantity_packs * poi.pack_size_kg * poi.landed_cost_per_kg
           END), 0) AS total_cost,
       COUNT(poi.id) AS item_count,
       COUNT(*) OVER () AS _total
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.supplier_id
  LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
 WHERE (:include_archived::bool OR po.archived_at IS NULL)
   AND (:status::po_status IS NULL OR po.status = :status)
   AND (:supplier_id::int  IS NULL OR po.supplier_id = :supplier_id)
 GROUP BY po.id, s.name
 ORDER BY po.created_at DESC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetPurchaseOrder */
SELECT po.id, po.supplier_id, s.name AS supplier_name,
       po.status::text AS status, po.currency, po.notes, po.share_token,
       po.ordered_at, po.shipped_at, po.received_at,
       po.archived_at, po.created_at, po.updated_at,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id',                  i.id,
               'kind',                i.kind,
               'resource_id',         i.resource_id,
               'resource_name',       r.name,
               'variant_id',          i.variant_id,
               'paint_name',          p.name,
               'classification',      v.classification,
               'ink_series',          v.ink_series,
               'pack_size_kg',        i.pack_size_kg,
               'quantity_kg',         i.quantity_kg,
               'quantity_packs',      i.quantity_packs,
               'landed_cost_per_kg',  i.landed_cost_per_kg,
               'received_quantity_kg', i.received_quantity_kg,
               'received_packs',      i.received_packs
           ) ORDER BY i.id)
           FROM purchase_order_items i
           LEFT JOIN resources r ON r.id = i.resource_id
           LEFT JOIN paint_variants v ON v.id = i.variant_id
           LEFT JOIN paints p ON p.id = v.paint_id
           WHERE i.purchase_order_id = po.id
       ), '[]'::jsonb) AS items
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.supplier_id
 WHERE po.id = :id!;

/* @name InsertPurchaseOrder */
INSERT INTO purchase_orders (supplier_id, currency, notes, created_by)
VALUES (:supplier_id!, COALESCE(:currency, 'INR'), :notes, :user_id!)
RETURNING id;

/* @name InsertPurchaseOrderItem */
INSERT INTO purchase_order_items
    (purchase_order_id, kind, resource_id, variant_id,
     pack_size_kg, quantity_kg, quantity_packs, landed_cost_per_kg)
VALUES (:po_id!, :kind!::po_line_kind, :resource_id, :variant_id,
        :pack_size_kg, :quantity_kg, :quantity_packs, :landed_cost_per_kg!)
RETURNING id;

/* @name PatchPurchaseOrder */
UPDATE purchase_orders
   SET currency   = COALESCE(:currency, currency),
       notes      = COALESCE(:notes, notes),
       updated_at = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name GetPOItemForEdit */
SELECT poi.id, po.status::text AS po_status
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
 WHERE poi.id = :id!;

/* @name PatchPurchaseOrderItem */
UPDATE purchase_order_items
   SET pack_size_kg       = COALESCE(:pack_size_kg, pack_size_kg),
       quantity_kg        = COALESCE(:quantity_kg, quantity_kg),
       quantity_packs     = COALESCE(:quantity_packs, quantity_packs),
       landed_cost_per_kg = COALESCE(:landed_cost_per_kg, landed_cost_per_kg),
       updated_at         = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name DeletePurchaseOrderItem */
DELETE FROM purchase_order_items WHERE id = :id!;

/* @name GetPurchaseOrderStatus */
SELECT status::text AS status FROM purchase_orders WHERE id = :id!;

/* @name SetPurchaseOrderStatus */
UPDATE purchase_orders
   SET status      = :status!::po_status,
       ordered_at  = CASE WHEN :stamp_ordered::bool THEN CURRENT_TIMESTAMP ELSE ordered_at END,
       shipped_at  = CASE WHEN :stamp_shipped::bool THEN CURRENT_TIMESTAMP ELSE shipped_at END,
       received_at = CASE WHEN :stamp_received::bool THEN CURRENT_TIMESTAMP ELSE received_at END,
       updated_at  = CURRENT_TIMESTAMP
 WHERE id = :id!;

/* @name LockPurchaseOrderForReceive */
SELECT status::text AS status, currency FROM purchase_orders WHERE id = :id! FOR UPDATE;

/* @name LockPOItemForReceive */
SELECT kind::text AS kind, resource_id, variant_id, pack_size_kg,
       quantity_kg, quantity_packs, landed_cost_per_kg,
       received_quantity_kg, received_packs
  FROM purchase_order_items
 WHERE id = :id! AND purchase_order_id = :po_id!
 FOR UPDATE;

/* @name InsertResourceReceipt */
INSERT INTO resource_stock_transactions
    (resource_id, txn_type, quantity_kg, unit_cost_per_kg,
     reference_type, reference_id, notes, created_by)
VALUES (:resource_id!, 'po_receipt', :quantity_kg!, :unit_cost_per_kg!,
        'purchase_order_item', :po_item_id!, NULL, :user_id!);

/* @name BumpReceivedQuantityKg */
UPDATE purchase_order_items
   SET received_quantity_kg = received_quantity_kg + :delta!,
       updated_at = CURRENT_TIMESTAMP
 WHERE id = :id!;

/* @name InsertSupplierFinishedPack */
INSERT INTO finished_paint_packs
    (variant_id, pack_size_kg, source, po_item_id, cost_per_kg, status)
VALUES (:variant_id!, :pack_size_kg!, 'supplier', :po_item_id!, :cost_per_kg!, 'in_stock');

/* @name BumpReceivedPacks */
UPDATE purchase_order_items
   SET received_packs = received_packs + :delta!,
       updated_at = CURRENT_TIMESTAMP
 WHERE id = :id!;

/* @name CountPendingPOItems */
SELECT COUNT(*) AS pending
  FROM purchase_order_items
 WHERE purchase_order_id = :po_id!
   AND ((kind = 'resource'       AND received_quantity_kg < quantity_kg)
     OR (kind = 'finished_paint' AND received_packs       < quantity_packs));

/* @name MarkPurchaseOrderReceived */
UPDATE purchase_orders
   SET status = 'received', received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id!;

/* @name ArchivePurchaseOrder */
UPDATE purchase_orders SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 WHERE id = :id! AND archived_at IS NULL RETURNING id;

/* @name RestorePurchaseOrder */
UPDATE purchase_orders SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id;




/* @name ListProductionRequests */
SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,
       pr.origin::text AS origin, pr.order_item_id,
       pr.status::text AS status, pr.notes, pr.created_at,
       p.name AS paint_name, v.classification, v.ink_series
  FROM production_requests pr
  JOIN paint_variants v ON v.id = pr.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE pr.status = :status!::production_request_status
 ORDER BY pr.created_at ASC
 LIMIT 200;

/* @name GetProductionRequest */
SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,
       pr.origin::text AS origin, pr.order_item_id,
       pr.status::text AS status, pr.notes, pr.created_at, pr.updated_at,
       p.name AS paint_name, v.classification, v.ink_series
  FROM production_requests pr
  JOIN paint_variants v ON v.id = pr.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE pr.id = :id!;

/* @name InsertProductionRequest */
INSERT INTO production_requests
    (variant_id, pack_size_kg, quantity_packs, origin, status, notes, created_by)
VALUES (:variant_id!, :pack_size_kg!, :quantity_packs!, 'demand_suggestion', 'pending', :notes, :user_id!)
RETURNING id;

/* @name CancelProductionRequest */
UPDATE production_requests
   SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status IN ('pending', 'in_production')
 RETURNING id;

/* @name MarkRequestInProduction */
UPDATE production_requests SET status = 'in_production', updated_at = CURRENT_TIMESTAMP WHERE id = :id!;

/* @name MarkRequestCompleted */
UPDATE production_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = :id!;

/* @name ListProductionRuns */
SELECT r.id, r.batch_number, r.variant_id, r.formula_id,
       r.status::text AS status,
       r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,
       r.dilution_total_kg, r.dilution_flagged,
       r.started_at, r.completed_at, r.created_at,
       u.username AS operator, p.name AS paint_name,
       v.classification, v.ink_series,
       COUNT(*) OVER () AS _total
  FROM production_runs r
  JOIN users u ON u.id = r.created_by
  JOIN paint_variants v ON v.id = r.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE r.archived_at IS NULL
   AND (:status::production_run_status IS NULL OR r.status = :status)
   AND (:variant_id::int  IS NULL OR r.variant_id = :variant_id)
   AND (:operator_id::int IS NULL OR r.created_by = :operator_id)
 ORDER BY r.created_at DESC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetProductionRun */
SELECT r.id, r.batch_number, r.request_id, r.variant_id, r.formula_id,
       r.status::text AS status,
       r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,
       r.dilution_total_kg, r.dilution_flagged,
       r.started_at, r.completed_at, r.notes,
       r.archived_at, r.archived_by, r.created_by, r.created_at, r.updated_at,
       u.username AS operator,
       p.name AS paint_name, v.classification, v.ink_series,
       f.name AS formula_name, f.standard_output_kg,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'resource_id',   a.resource_id,
               'resource_name', res.name,
               'expected_kg',   a.expected_kg,
               'actual_kg',     a.actual_kg,
               'variance_pct',  a.variance_pct,
               'flagged',       a.flagged
           ) ORDER BY res.name)
           FROM production_resource_actuals a
           JOIN resources res ON res.id = a.resource_id
           WHERE a.production_run_id = r.id
       ), '[]'::jsonb) AS actuals,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id',            d.id,
               'resource_id',   d.resource_id,
               'resource_name', res.name,
               'kg_added',      d.kg_added,
               'notes',         d.notes,
               'created_at',    d.created_at
           ) ORDER BY d.id)
           FROM production_dilution_adjustments d
           JOIN resources res ON res.id = d.resource_id
           WHERE d.production_run_id = r.id
       ), '[]'::jsonb) AS dilution,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id', fp.id, 'pack_size_kg', fp.pack_size_kg,
               'status', fp.status, 'cost_per_kg', fp.cost_per_kg
           ) ORDER BY fp.id)
           FROM finished_paint_packs fp WHERE fp.production_run_id = r.id
       ), '[]'::jsonb) AS packs
  FROM production_runs r
  JOIN users u ON u.id = r.created_by
  JOIN paint_variants v ON v.id = r.variant_id
  JOIN paints p ON p.id = v.paint_id
  JOIN formulas f ON f.id = r.formula_id
 WHERE r.id = :id!;

/* @name PickDefaultFormulaForVariant */
SELECT id FROM formulas
 WHERE variant_id = :variant_id! AND archived_at IS NULL
 ORDER BY is_default DESC, created_at DESC LIMIT 1;

/* @name InsertProductionRun */
INSERT INTO production_runs
    (batch_number, request_id, variant_id, formula_id, status,
     expected_output_kg, notes, created_by)
VALUES (:batch_number!, :request_id, :variant_id!, :formula_id!, 'planned',
        :expected_output_kg!, :notes, :user_id!)
RETURNING id;

/* @name StartProductionRun */
UPDATE production_runs
   SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status = 'planned'
 RETURNING id;

/* @name LockRunForActuals */
SELECT r.status::text AS status, r.formula_id, r.variant_id, r.expected_output_kg,
       f.standard_output_kg, f.wastage_threshold_pct, f.resource_variance_threshold_pct
  FROM production_runs r
  JOIN formulas f ON f.id = r.formula_id
 WHERE r.id = :id!
 FOR UPDATE OF r;

/* @name GetFormulaResources */
SELECT resource_id, quantity_kg FROM formula_resources WHERE formula_id = :formula_id!;

/* @name DeleteRunActuals */
DELETE FROM production_resource_actuals WHERE production_run_id = :run_id!;

/* @name InsertRunActual */
INSERT INTO production_resource_actuals
    (production_run_id, resource_id, expected_kg, actual_kg, variance_pct, flagged)
VALUES (:run_id!, :resource_id!, :expected_kg!, :actual_kg!, :variance_pct, :flagged!);

/* @name InsertConsumptionTxn */
INSERT INTO resource_stock_transactions
    (resource_id, txn_type, quantity_kg, reference_type, reference_id, notes, created_by)
VALUES (:resource_id!, 'production_consumption', :quantity_kg!, 'production_run', :run_id!, NULL, :user_id!);

/* @name UpdateRunActualsHeader */
UPDATE production_runs
   SET actual_output_kg = :actual_output_kg!,
       wastage_pct      = :wastage_pct!,
       wastage_flagged  = :wastage_flagged!,
       status           = CASE WHEN status = 'planned' THEN 'in_progress'::production_run_status ELSE status END,
       started_at       = COALESCE(started_at, CURRENT_TIMESTAMP),
       updated_at       = CURRENT_TIMESTAMP
 WHERE id = :id!;

/* @name LockRunForDilution */
SELECT r.status::text AS status, r.actual_output_kg, f.dilution_threshold_pct
  FROM production_runs r
  JOIN formulas f ON f.id = r.formula_id
 WHERE r.id = :id!
 FOR UPDATE OF r;

/* @name InsertDilutionRow */
INSERT INTO production_dilution_adjustments (production_run_id, resource_id, kg_added, notes)
VALUES (:run_id!, :resource_id!, :kg_added!, :notes);

/* @name InsertDilutionConsumptionTxn */
INSERT INTO resource_stock_transactions
    (resource_id, txn_type, quantity_kg, reference_type, reference_id, notes, created_by)
VALUES (:resource_id!, 'dilution_consumption', :quantity_kg!, 'production_run', :run_id!, :notes, :user_id!);

/* @name SumDilutionForRun */
SELECT COALESCE(SUM(kg_added), 0) AS total FROM production_dilution_adjustments WHERE production_run_id = :run_id!;

/* @name UpdateRunDilutionTotals */
UPDATE production_runs
   SET dilution_total_kg = :total!,
       dilution_flagged  = :flagged!,
       updated_at        = CURRENT_TIMESTAMP
 WHERE id = :id!;

/* @name LockRunForPackaging */
SELECT variant_id, actual_output_kg, dilution_total_kg, status::text AS status, formula_id
  FROM production_runs WHERE id = :id! FOR UPDATE;

/* @name ActivePackSizesIn */
SELECT pack_size_kg FROM pack_sizes WHERE is_active AND pack_size_kg = ANY(:sizes!::numeric[]);

/* @name FormulaCostBaseline */
SELECT COALESCE(SUM(fr.quantity_kg * r.weighted_avg_cost_per_kg), 0) AS total_cost,
       f.standard_output_kg
  FROM formulas f
  JOIN formula_resources fr ON fr.formula_id = f.id
  JOIN resources r ON r.id = fr.resource_id
 WHERE f.id = :formula_id!
 GROUP BY f.standard_output_kg;

/* @name InsertProducedPack */
INSERT INTO finished_paint_packs
    (variant_id, pack_size_kg, source, production_run_id, cost_per_kg, status, location)
VALUES (:variant_id!, :pack_size_kg!, 'produced', :run_id!, :cost_per_kg!, 'in_stock', :location);

/* @name InsertStashTxn */
INSERT INTO stash_transactions
    (variant_id, delta_kg, action, production_run_id, notes, created_by)
VALUES (:variant_id!, :delta_kg!, :action!::stash_txn_action, :run_id, :notes, :user_id!);

/* @name CompleteRun */
UPDATE production_runs
   SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status IN ('planned', 'in_progress')
 RETURNING request_id;

/* @name CancelRun */
UPDATE production_runs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status IN ('planned', 'in_progress')
 RETURNING id;

/* @name MarkPackReady */
UPDATE finished_paint_packs
   SET status = 'ready_for_shipment', updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status = 'in_stock'
 RETURNING id;

/* @name LockStashForRepack */
SELECT kg_remaining FROM paint_variant_stash WHERE variant_id = :variant_id! FOR UPDATE;

/* @name ActivePackSizeExists */
SELECT 1 AS one FROM pack_sizes WHERE is_active AND pack_size_kg = :pack_size_kg!;

/* @name LatestProducedPackCost */
SELECT cost_per_kg FROM finished_paint_packs
 WHERE variant_id = :variant_id! AND source = 'produced'
 ORDER BY created_at DESC LIMIT 1;

/* @name LatestRunForVariant */
SELECT id FROM production_runs WHERE variant_id = :variant_id! ORDER BY created_at DESC LIMIT 1;

/* @name InsertProducedPackForRepack */
INSERT INTO finished_paint_packs
    (variant_id, pack_size_kg, source, production_run_id, cost_per_kg, status)
VALUES (:variant_id!, :pack_size_kg!, 'produced', :production_run_id, :cost_per_kg!, 'in_stock');

/* @name ProductionRunsByStatus */
SELECT status::text AS status, COUNT(*) AS count
  FROM production_runs WHERE archived_at IS NULL
 GROUP BY status;

/* @name FlaggedRunsLast30 */
SELECT COUNT(*) AS flagged_runs
  FROM production_runs
 WHERE completed_at >= NOW() - INTERVAL '30 days'
   AND (wastage_flagged OR dilution_flagged OR EXISTS (
        SELECT 1 FROM production_resource_actuals a
         WHERE a.production_run_id = production_runs.id AND a.flagged
   ));




/* @name ListCustomerOrders */
SELECT o.id, o.customer_id, c.name AS customer_name,
       o.status::text AS status, o.currency,
       o.payment_terms::text AS payment_terms, o.payment_net_days,
       o.order_date, o.scheduled_ship_date, o.due_date,
       o.created_by, o.approved_by, o.approved_at,
       u.username AS created_by_name,
       (SELECT COUNT(*) FROM customer_order_items WHERE order_id = o.id) AS item_count,
       COUNT(*) OVER () AS _total
  FROM customer_orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN users u ON u.id = o.created_by
 WHERE o.archived_at IS NULL
   AND (:status::order_status IS NULL OR o.status = :status)
   AND (:customer_id::int     IS NULL OR o.customer_id = :customer_id)
 ORDER BY o.created_at DESC
 LIMIT :page_size! OFFSET :page_offset!;

/* @name GetCustomerOrder */
SELECT o.id, o.customer_id, o.shipping_address_id,
       o.status::text AS status, o.currency,
       o.payment_terms::text AS payment_terms, o.payment_net_days,
       o.order_date, o.scheduled_ship_date, o.due_date, o.notes,
       o.created_by, o.approved_by, o.approved_at,
       o.shipped_at, o.completed_at, o.cancelled_at,
       o.archived_at, o.created_at, o.updated_at,
       c.name AS customer_name, c.gst_number,
       u.username AS created_by_name,
       sa.label AS shipping_label, sa.address AS shipping_address,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id',                        i.id,
               'variant_id',                i.variant_id,
               'paint_name',                p.name,
               'classification',            v.classification,
               'ink_series',                v.ink_series,
               'pack_size_kg',              i.pack_size_kg,
               'quantity',                  i.quantity,
               'negotiated_price_per_pack', i.negotiated_price_per_pack,
               'cost_to_build_per_pack',    i.cost_to_build_per_pack
           ) ORDER BY i.id)
           FROM customer_order_items i
           JOIN paint_variants v ON v.id = i.variant_id
           JOIN paints p ON p.id = v.paint_id
           WHERE i.order_id = o.id
       ), '[]'::jsonb) AS items
  FROM customer_orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN users u ON u.id = o.created_by
  LEFT JOIN customer_shipping_addresses sa ON sa.id = o.shipping_address_id
 WHERE o.id = :id!;

/* @name InsertCustomerOrder */
INSERT INTO customer_orders
    (customer_id, shipping_address_id, status, currency, payment_terms, payment_net_days,
     scheduled_ship_date, due_date, notes, created_by)
VALUES (:customer_id!, :shipping_address_id, 'draft',
        COALESCE(:currency, (SELECT default_currency FROM customers WHERE id = :customer_id!), 'INR'),
        COALESCE(:payment_terms::payment_terms, 'prepaid'), :payment_net_days,
        :scheduled_ship_date, :due_date, :notes, :user_id!)
RETURNING id, currency;

/* @name InsertCustomerOrderItem */
INSERT INTO customer_order_items
    (order_id, variant_id, pack_size_kg, quantity,
     negotiated_price_per_pack, cost_to_build_per_pack)
VALUES (:order_id!, :variant_id!, :pack_size_kg!, :quantity!, :negotiated_price_per_pack!, :cost_to_build_per_pack);

/* @name GetCustomerOrderStatus */
SELECT status::text AS status, created_by FROM customer_orders WHERE id = :id!;

/* @name PatchCustomerOrder */
UPDATE customer_orders
   SET shipping_address_id = COALESCE(:shipping_address_id, shipping_address_id),
       currency            = COALESCE(:currency, currency),
       payment_terms       = COALESCE(:payment_terms::payment_terms, payment_terms),
       payment_net_days    = CASE WHEN :clear_net_days::bool THEN NULL ELSE COALESCE(:payment_net_days, payment_net_days) END,
       scheduled_ship_date = CASE WHEN :clear_ship_date::bool THEN NULL ELSE COALESCE(:scheduled_ship_date, scheduled_ship_date) END,
       notes               = COALESCE(:notes, notes),
       updated_at          = CURRENT_TIMESTAMP
 WHERE id = :id!
 RETURNING id;

/* @name SubmitCustomerOrder */
UPDATE customer_orders SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status = 'draft' RETURNING id;

/* @name ApproveCustomerOrder */
UPDATE customer_orders
   SET status = 'approved', approved_by = :user_id!, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status = 'pending_approval'
 RETURNING id;

/* @name CancelCustomerOrder */
UPDATE customer_orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! RETURNING id;

/* @name GetOrderForConfirmation */
SELECT o.id, o.customer_id, o.shipping_address_id, o.currency,
       o.payment_terms::text AS payment_terms, o.payment_net_days,
       o.scheduled_ship_date, o.due_date,
       c.name AS customer_name, c.gst_number, c.contact_email,
       sa.label AS shipping_label, sa.address AS shipping_address
  FROM customer_orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN customer_shipping_addresses sa ON sa.id = o.shipping_address_id
 WHERE o.id = :id!;

/* @name GetOrderItemsForConfirmation */
SELECT i.id, i.variant_id, i.pack_size_kg, i.quantity, i.negotiated_price_per_pack,
       p.name AS paint_name, v.classification, v.ink_series, p.hsn_code, p.product_code
  FROM customer_order_items i
  JOIN paint_variants v ON v.id = i.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE i.order_id = :order_id!
 ORDER BY i.id;

/* @name NextConfirmationVersion */
SELECT COALESCE(MAX(version), 0) AS max FROM order_confirmations WHERE order_id = :order_id!;

/* @name InsertOrderConfirmation */
INSERT INTO order_confirmations (order_id, version, payload, generated_by)
VALUES (:order_id!, :version!, :payload!::jsonb, :user_id!)
RETURNING id, version, created_at;

/* @name ListOrderItemsForCost */
SELECT id, variant_id, pack_size_kg, quantity FROM customer_order_items WHERE order_id = :order_id!;

/* @name VariantCostBaseline */
SELECT f.standard_output_kg,
       COALESCE(SUM(fr.quantity_kg * r.weighted_avg_cost_per_kg), 0) AS total_cost
  FROM formulas f
  LEFT JOIN formula_resources fr ON fr.formula_id = f.id
  LEFT JOIN resources r ON r.id = fr.resource_id
 WHERE f.variant_id = :variant_id! AND f.archived_at IS NULL
 GROUP BY f.id, f.standard_output_kg
 ORDER BY f.is_default DESC, f.created_at DESC
 LIMIT 1;




/* @name LockCustomerOrderForSale */
SELECT id, customer_id, currency, due_date, status::text AS status, created_by
  FROM customer_orders WHERE id = :id! FOR UPDATE;

/* @name InsertSale */
INSERT INTO sales (order_id, customer_id, currency, due_date, notes, created_by)
VALUES (:order_id!, :customer_id!, :currency!, :due_date, :notes, :user_id!)
RETURNING id;

/* @name GetOrderItemForSale */
SELECT negotiated_price_per_pack, cost_to_build_per_pack, variant_id, pack_size_kg
  FROM customer_order_items WHERE id = :id! AND order_id = :order_id!;

/* @name InsertSaleItem */
INSERT INTO sale_items
    (sale_id, order_item_id, variant_id, pack_size_kg, quantity, price_per_pack, cost_per_pack)
VALUES (:sale_id!, :order_item_id!, :variant_id!, :pack_size_kg!, :quantity!, :price_per_pack!, :cost_per_pack)
RETURNING id;

/* @name ClaimPackForSale */
UPDATE finished_paint_packs
   SET status = 'sold', updated_at = CURRENT_TIMESTAMP
 WHERE id = :pack_id! AND variant_id = :variant_id! AND pack_size_kg = :pack_size_kg!
   AND status IN ('in_stock', 'ready_for_shipment', 'shipped')
 RETURNING id;

/* @name LinkPackToSaleItem */
INSERT INTO sale_item_packs (sale_item_id, pack_id) VALUES (:sale_item_id!, :pack_id!);

/* @name ListSales */
SELECT s.id, s.order_id, s.customer_id, c.name AS customer_name,
       s.currency, s.sale_date, s.due_date, s.created_by,
       (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,
       (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected
  FROM sales s
  JOIN customers c ON c.id = s.customer_id
 WHERE s.archived_at IS NULL
   AND (:owner_id::int IS NULL OR s.created_by = :owner_id)
 ORDER BY s.sale_date DESC
 LIMIT 200;

/* @name GetSale */
SELECT s.id, s.order_id, s.customer_id, s.currency, s.sale_date, s.due_date,
       s.notes, s.created_by, s.created_at, s.updated_at,
       c.name AS customer_name,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id', si.id, 'variant_id', si.variant_id, 'pack_size_kg', si.pack_size_kg,
               'quantity', si.quantity, 'price_per_pack', si.price_per_pack,
               'cost_per_pack', si.cost_per_pack,
               'paint_name', p.name, 'classification', v.classification, 'ink_series', v.ink_series
           ) ORDER BY si.id)
           FROM sale_items si
           JOIN paint_variants v ON v.id = si.variant_id
           JOIN paints p ON p.id = v.paint_id
           WHERE si.sale_id = s.id
       ), '[]'::jsonb) AS items,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'id', pay.id, 'amount', pay.amount, 'currency', pay.currency,
               'date_received', pay.date_received, 'method', pay.method,
               'reference_number', pay.reference_number
           ) ORDER BY pay.date_received)
           FROM payments pay WHERE pay.sale_id = s.id
       ), '[]'::jsonb) AS payments,
       (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,
       (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected
  FROM sales s
  JOIN customers c ON c.id = s.customer_id
 WHERE s.id = :id!;

/* @name InsertPayment */
INSERT INTO payments
    (sale_id, amount, currency, date_received, method, reference_number,
     receiving_account, attachment_url, notes, created_by)
VALUES (:sale_id!, :amount!, :currency!, :date_received!, :method!::payment_method,
        :reference_number, :receiving_account, :attachment_url, :notes, :user_id!)
RETURNING id;

/* @name GetSaleForReturn */
SELECT customer_id, currency FROM sales WHERE id = :id!;

/* @name InsertReturn */
INSERT INTO returns (sale_id, customer_id, notes, completed_by)
VALUES (:sale_id!, :customer_id!, :notes, :user_id!)
RETURNING id;

/* @name InsertReturnItem */
INSERT INTO return_items
    (return_id, sale_item_id, pack_id, condition, disposition, notes)
VALUES (:return_id!, :sale_item_id!, :pack_id, :condition!::return_condition, :disposition!::return_disposition, :notes);

/* @name SetPackReadyAfterReturn */
UPDATE finished_paint_packs SET status = 'ready_for_shipment', updated_at = CURRENT_TIMESTAMP WHERE id = :pack_id!;

/* @name SetPackLostAfterReturn */
UPDATE finished_paint_packs SET status = 'lost', updated_at = CURRENT_TIMESTAMP WHERE id = :pack_id!;

/* @name InsertRefund */
INSERT INTO refunds (return_id, amount, currency, created_by)
VALUES (:return_id!, :amount!, :currency!, :user_id!)
RETURNING id;

/* @name ApproveRefund */
UPDATE refunds
   SET status = 'approved', approved_by = :user_id!, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status = 'pending_approval'
 RETURNING id;

/* @name RejectRefund */
UPDATE refunds
   SET status = 'rejected', rejected_reason = :reason!, updated_at = CURRENT_TIMESTAMP
 WHERE id = :id! AND status = 'pending_approval'
 RETURNING id;

/* @name LockRefundForPayout */
SELECT amount, currency, status::text AS status FROM refunds WHERE id = :id! FOR UPDATE;

/* @name InsertRefundPayout */
INSERT INTO refund_payouts
    (refund_id, amount, currency, date_paid, method, reference_number,
     paying_account, attachment_url, notes, created_by)
VALUES (:refund_id!, :amount!, :currency!, :date_paid!, :method!::payment_method,
        :reference_number, :paying_account, :attachment_url, :notes, :user_id!);

/* @name SumRefundPayouts */
SELECT COALESCE(SUM(amount), 0) AS sum FROM refund_payouts WHERE refund_id = :refund_id!;

/* @name MarkRefundPaidOut */
UPDATE refunds SET status = 'paid_out', updated_at = CURRENT_TIMESTAMP WHERE id = :id!;




/* @name FinishedInventoryGrouped */
SELECT fp.variant_id,
       p.id   AS paint_id,
       p.name AS paint_name,
       v.classification, v.ink_series,
       fp.pack_size_kg,
       fp.status::text AS status,
       COUNT(*)                              AS units,
       SUM(fp.pack_size_kg)                  AS total_kg,
       AVG(fp.cost_per_kg)                   AS avg_cost_per_kg
  FROM finished_paint_packs fp
  JOIN paint_variants v ON v.id = fp.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE (:variant_id::int IS NULL OR fp.variant_id = :variant_id)
   AND (:status::pack_status IS NULL OR fp.status = :status)
 GROUP BY fp.variant_id, p.id, p.name, v.classification, v.ink_series,
          fp.pack_size_kg, fp.status
 ORDER BY p.name, v.classification, v.ink_series, fp.pack_size_kg, fp.status;

/* @name FinishedPacksByVariant */
SELECT fp.id, fp.pack_size_kg, fp.source::text AS source, fp.production_run_id, fp.po_item_id,
       fp.cost_per_kg, fp.status::text AS status, fp.location, fp.created_at
  FROM finished_paint_packs fp
 WHERE fp.variant_id = :variant_id!
 ORDER BY fp.created_at DESC
 LIMIT 500;

/* @name StashList */
SELECT s.variant_id, s.kg_remaining, s.updated_at,
       p.name AS paint_name, v.classification, v.ink_series
  FROM paint_variant_stash s
  JOIN paint_variants v ON v.id = s.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE s.kg_remaining > 0
 ORDER BY p.name, v.classification, v.ink_series;

/* @name ResourceInventory */
SELECT r.id, r.name, r.aliases, r.current_stock_kg, r.weighted_avg_cost_per_kg,
       r.low_stock_threshold_kg,
       COALESCE(
           r.low_stock_threshold_kg,
           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
           0
       ) AS effective_threshold_kg,
       r.current_stock_kg < COALESCE(
           r.low_stock_threshold_kg,
           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
           0
       ) AS is_low_stock
  FROM resources r
 WHERE r.archived_at IS NULL
 ORDER BY r.name;




/* @name DashboardCounts */
SELECT
    (SELECT COUNT(*) FROM paints          WHERE archived_at IS NULL) AS paints,
    (SELECT COUNT(*) FROM paint_variants  WHERE archived_at IS NULL) AS variants,
    (SELECT COUNT(*) FROM formulas        WHERE archived_at IS NULL) AS formulas,
    (SELECT COUNT(*) FROM resources       WHERE archived_at IS NULL) AS resources,
    (SELECT COUNT(*) FROM customers       WHERE archived_at IS NULL) AS customers,
    (SELECT COUNT(*) FROM suppliers       WHERE archived_at IS NULL) AS suppliers,
    (SELECT COUNT(*) FROM finished_paint_packs WHERE status = 'in_stock')           AS packs_in_stock,
    (SELECT COUNT(*) FROM finished_paint_packs WHERE status = 'ready_for_shipment') AS packs_ready_to_ship;

/* @name DashboardLowStock */
SELECT r.id, r.name, r.current_stock_kg,
       COALESCE(
           r.low_stock_threshold_kg,
           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
           0
       ) AS effective_threshold_kg
  FROM resources r
 WHERE r.archived_at IS NULL
   AND r.current_stock_kg < COALESCE(
           r.low_stock_threshold_kg,
           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
           0
       )
 ORDER BY r.current_stock_kg ASC
 LIMIT 10;

/* @name DashboardPendingRequests */
SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,
       pr.origin::text AS origin, pr.created_at,
       p.name AS paint_name, v.classification, v.ink_series
  FROM production_requests pr
  JOIN paint_variants v ON v.id = pr.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE pr.status = 'pending'
 ORDER BY pr.created_at ASC
 LIMIT 10;

/* @name DashboardOpenPOs */
SELECT po.id, po.supplier_id, s.name AS supplier_name,
       po.status::text AS status, po.created_at
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.supplier_id
 WHERE po.archived_at IS NULL
   AND po.status IN ('draft', 'ordered', 'shipped')
 ORDER BY po.created_at DESC
 LIMIT 10;

/* @name DashboardPendingDeviceApprovals */
SELECT d.id, u.username AS user_name, d.label AS device, d.created_at AS requested_at
  FROM user_devices d
  JOIN users u ON u.id = d.user_id
 WHERE d.status = 'pending'
 ORDER BY d.created_at DESC
 LIMIT 10;

/* @name DashboardFlaggedRunsLast30 */
SELECT r.id, r.batch_number, r.variant_id, p.name AS paint_name,
       v.classification, v.ink_series,
       r.wastage_pct, r.dilution_total_kg, r.completed_at
  FROM production_runs r
  JOIN paint_variants v ON v.id = r.variant_id
  JOIN paints p ON p.id = v.paint_id
 WHERE r.completed_at >= NOW() - INTERVAL '30 days'
   AND (r.wastage_flagged
        OR r.dilution_flagged
        OR EXISTS (SELECT 1 FROM production_resource_actuals a WHERE a.production_run_id = r.id AND a.flagged))
 ORDER BY r.completed_at DESC
 LIMIT 10;

/* @name DashboardOverdueSales */
SELECT s.id, s.order_id, s.customer_id, c.name AS customer_name,
       s.due_date, s.currency,
       (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,
       (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected
  FROM sales s
  JOIN customers c ON c.id = s.customer_id
 WHERE s.archived_at IS NULL
   AND s.due_date IS NOT NULL
   AND s.due_date < CURRENT_DATE
   AND (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = s.id)
       < (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id)
 ORDER BY s.due_date ASC
 LIMIT 10;




/* @name ProductionIrregularityReport */
SELECT r.id, r.batch_number, r.variant_id, r.formula_id,
       r.status::text AS status,
       r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,
       r.dilution_total_kg, r.dilution_flagged,
       r.started_at, r.completed_at,
       u.username AS operator,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'resource_id',   a.resource_id,
               'resource_name', res.name,
               'expected_kg',   a.expected_kg,
               'actual_kg',     a.actual_kg,
               'variance_pct',  a.variance_pct,
               'flagged',       a.flagged
           ) ORDER BY a.flagged DESC, a.variance_pct DESC NULLS LAST)
           FROM production_resource_actuals a
           JOIN resources res ON res.id = a.resource_id
           WHERE a.production_run_id = r.id
       ), '[]'::jsonb) AS resource_variances,
       COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
               'resource_id',   d.resource_id,
               'resource_name', res.name,
               'kg_added',      d.kg_added,
               'notes',         d.notes
           ) ORDER BY d.id)
           FROM production_dilution_adjustments d
           JOIN resources res ON res.id = d.resource_id
           WHERE d.production_run_id = r.id
       ), '[]'::jsonb) AS dilution_adjustments
  FROM production_runs r
  JOIN users u ON u.id = r.created_by
 WHERE (r.wastage_flagged
        OR r.dilution_flagged
        OR EXISTS (SELECT 1 FROM production_resource_actuals a WHERE a.production_run_id = r.id AND a.flagged))
   AND (:from_date::date IS NULL OR r.completed_at >= :from_date)
   AND (:to_date::date   IS NULL OR r.completed_at <  :to_date::date + INTERVAL '1 day')
   AND (:variant_id::int  IS NULL OR r.variant_id = :variant_id)
   AND (:operator_id::int IS NULL OR r.created_by = :operator_id)
 ORDER BY r.completed_at DESC NULLS LAST, r.id DESC
 LIMIT 200;

/* @name LossesOperatorSummary */
SELECT u.id        AS operator_id,
       u.username  AS operator,
       COUNT(*)    AS runs,
       COUNT(*) FILTER (WHERE r.wastage_flagged
                          OR r.dilution_flagged
                          OR EXISTS (
                              SELECT 1 FROM production_resource_actuals a
                               WHERE a.production_run_id = r.id AND a.flagged
                          )) AS flagged_runs,
       COALESCE(SUM(
           CASE WHEN r.actual_output_kg IS NOT NULL
                THEN GREATEST(r.expected_output_kg - r.actual_output_kg, 0)
                ELSE 0 END
       ), 0) AS wastage_kg
  FROM production_runs r
  JOIN users u ON u.id = r.created_by
 WHERE (:from_date::date IS NULL OR r.completed_at >= :from_date)
   AND (:to_date::date   IS NULL OR r.completed_at <  :to_date::date + INTERVAL '1 day')
 GROUP BY u.id, u.username
 ORDER BY wastage_kg DESC, flagged_runs DESC
 LIMIT 50;
