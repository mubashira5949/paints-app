--
-- PostgreSQL database dump
--

\restrict 4bHFzg8sVcME48fxqjIkMBzSZiO5n0Y8gmKZPeOiLHliiEr0zUbmMYoqyfcvSl9

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: loss_item_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loss_item_type AS ENUM (
    'finished_good',
    'raw_material'
);


ALTER TYPE public.loss_item_type OWNER TO postgres;

--
-- Name: update_resource_stock_from_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_resource_stock_from_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE resources
    SET current_stock = current_stock + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.resource_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_resource_stock_from_transaction() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(255) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: client_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_order_items (
    id integer NOT NULL,
    order_id integer,
    color_id integer NOT NULL,
    pack_size_kg numeric(5,2) NOT NULL,
    quantity integer NOT NULL
);


ALTER TABLE public.client_order_items OWNER TO postgres;

--
-- Name: client_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_order_items_id_seq OWNER TO postgres;

--
-- Name: client_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_order_items_id_seq OWNED BY public.client_order_items.id;


--
-- Name: client_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_orders (
    id integer NOT NULL,
    client_id integer,
    client_name character varying(255) NOT NULL,
    shipping_address_id integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    shipping_status character varying(50) DEFAULT 'pending'::character varying,
    payment_method character varying(50),
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    return_status character varying(50),
    refund_status character varying(50)
);


ALTER TABLE public.client_orders OWNER TO postgres;

--
-- Name: client_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_orders_id_seq OWNER TO postgres;

--
-- Name: client_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_orders_id_seq OWNED BY public.client_orders.id;


--
-- Name: client_shipping_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_shipping_addresses (
    id integer NOT NULL,
    client_id integer NOT NULL,
    label character varying(100) NOT NULL,
    address text NOT NULL,
    is_default boolean DEFAULT false
);


ALTER TABLE public.client_shipping_addresses OWNER TO postgres;

--
-- Name: client_shipping_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_shipping_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_shipping_addresses_id_seq OWNER TO postgres;

--
-- Name: client_shipping_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_shipping_addresses_id_seq OWNED BY public.client_shipping_addresses.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    gst_number character varying(20),
    contact_name character varying(255),
    contact_phone character varying(30),
    contact_email character varying(255),
    billing_address text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: color_ink_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.color_ink_grades (
    color_id integer NOT NULL,
    grade_id integer NOT NULL
);


ALTER TABLE public.color_ink_grades OWNER TO postgres;

--
-- Name: color_product_series; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.color_product_series (
    color_id integer NOT NULL,
    series_id integer NOT NULL
);


ALTER TABLE public.color_product_series OWNER TO postgres;

--
-- Name: color_product_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.color_product_types (
    color_id integer NOT NULL,
    type_id integer NOT NULL
);


ALTER TABLE public.color_product_types OWNER TO postgres;

--
-- Name: colors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.colors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    color_code character varying(50),
    business_code character varying(50),
    series character varying(100),
    min_threshold_kg numeric(12,4) DEFAULT 0,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approval_status character varying(20) DEFAULT 'approved'::character varying,
    requested_by integer,
    available_lcs boolean DEFAULT true NOT NULL,
    available_std boolean DEFAULT true NOT NULL,
    available_opq_js boolean DEFAULT true NOT NULL,
    ink_series character varying(50),
    hsn_code character varying(50),
    tags jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.colors OWNER TO postgres;

--
-- Name: colors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.colors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.colors_id_seq OWNER TO postgres;

--
-- Name: colors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.colors_id_seq OWNED BY public.colors.id;


--
-- Name: device_enrollment_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_enrollment_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    device character varying(255) NOT NULL,
    location character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.device_enrollment_requests OWNER TO postgres;

--
-- Name: device_enrollment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_enrollment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_enrollment_requests_id_seq OWNER TO postgres;

--
-- Name: device_enrollment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_enrollment_requests_id_seq OWNED BY public.device_enrollment_requests.id;


--
-- Name: finished_stock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.finished_stock (
    id integer NOT NULL,
    color_id integer NOT NULL,
    pack_size_kg numeric(5,2) NOT NULL,
    quantity_units integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.finished_stock OWNER TO postgres;

--
-- Name: finished_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.finished_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.finished_stock_id_seq OWNER TO postgres;

--
-- Name: finished_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.finished_stock_id_seq OWNED BY public.finished_stock.id;


--
-- Name: finished_stock_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.finished_stock_transactions (
    id integer NOT NULL,
    color_id integer NOT NULL,
    pack_size_kg numeric(5,2) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    quantity_units integer NOT NULL,
    quantity_kg numeric(12,4) NOT NULL,
    reference_id integer,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.finished_stock_transactions OWNER TO postgres;

--
-- Name: finished_stock_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.finished_stock_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.finished_stock_transactions_id_seq OWNER TO postgres;

--
-- Name: finished_stock_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.finished_stock_transactions_id_seq OWNED BY public.finished_stock_transactions.id;


--
-- Name: formula_resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formula_resources (
    id integer NOT NULL,
    formula_id integer NOT NULL,
    resource_id integer NOT NULL,
    quantity_required numeric(12,4) NOT NULL
);


ALTER TABLE public.formula_resources OWNER TO postgres;

--
-- Name: formula_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formula_resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formula_resources_id_seq OWNER TO postgres;

--
-- Name: formula_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formula_resources_id_seq OWNED BY public.formula_resources.id;


--
-- Name: formulas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formulas (
    id integer NOT NULL,
    color_id integer NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(20) DEFAULT '1.0.0'::character varying,
    batch_size_kg numeric(12,4) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.formulas OWNER TO postgres;

--
-- Name: formulas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formulas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formulas_id_seq OWNER TO postgres;

--
-- Name: formulas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formulas_id_seq OWNED BY public.formulas.id;


--
-- Name: ink_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ink_grades (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ink_grades OWNER TO postgres;

--
-- Name: ink_grades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ink_grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ink_grades_id_seq OWNER TO postgres;

--
-- Name: ink_grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ink_grades_id_seq OWNED BY public.ink_grades.id;


--
-- Name: loss_reasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loss_reasons (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.loss_reasons OWNER TO postgres;

--
-- Name: loss_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loss_reasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loss_reasons_id_seq OWNER TO postgres;

--
-- Name: loss_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loss_reasons_id_seq OWNED BY public.loss_reasons.id;


--
-- Name: material_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_requests (
    id integer NOT NULL,
    resource_id integer NOT NULL,
    requested_by integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.material_requests OWNER TO postgres;

--
-- Name: material_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_requests_id_seq OWNER TO postgres;

--
-- Name: material_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_requests_id_seq OWNED BY public.material_requests.id;


--
-- Name: order_return_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_return_items (
    id integer NOT NULL,
    return_id integer,
    order_item_id integer,
    quantity integer NOT NULL,
    qc_status character varying(50) DEFAULT 'pending_inspection'::character varying
);


ALTER TABLE public.order_return_items OWNER TO postgres;

--
-- Name: order_return_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_return_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_return_items_id_seq OWNER TO postgres;

--
-- Name: order_return_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_return_items_id_seq OWNED BY public.order_return_items.id;


--
-- Name: order_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_returns (
    id integer NOT NULL,
    order_id integer,
    status character varying(50) DEFAULT 'initiated'::character varying,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone
);


ALTER TABLE public.order_returns OWNER TO postgres;

--
-- Name: order_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_returns_id_seq OWNER TO postgres;

--
-- Name: order_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_returns_id_seq OWNED BY public.order_returns.id;


--
-- Name: product_losses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_losses (
    id integer NOT NULL,
    item_type public.loss_item_type NOT NULL,
    color_id integer,
    resource_id integer,
    pack_size_kg numeric(12,4),
    quantity_units integer,
    quantity_kg numeric(12,4) NOT NULL,
    reason_id integer NOT NULL,
    notes text,
    documented_by integer NOT NULL,
    documented_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reference_type character varying(50),
    reference_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.product_losses OWNER TO postgres;

--
-- Name: product_losses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_losses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_losses_id_seq OWNER TO postgres;

--
-- Name: product_losses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_losses_id_seq OWNED BY public.product_losses.id;


--
-- Name: product_series_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_series_categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.product_series_categories OWNER TO postgres;

--
-- Name: product_series_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_series_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_series_categories_id_seq OWNER TO postgres;

--
-- Name: product_series_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_series_categories_id_seq OWNED BY public.product_series_categories.id;


--
-- Name: product_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.product_types OWNER TO postgres;

--
-- Name: product_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_types_id_seq OWNER TO postgres;

--
-- Name: product_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_types_id_seq OWNED BY public.product_types.id;


--
-- Name: production_resource_actuals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_resource_actuals (
    id integer NOT NULL,
    production_run_id integer NOT NULL,
    resource_id integer NOT NULL,
    actual_quantity_used numeric(12,4) NOT NULL,
    expected_quantity numeric(12,4),
    variance numeric(12,4),
    variance_flag boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.production_resource_actuals OWNER TO postgres;

--
-- Name: production_resource_actuals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_resource_actuals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_resource_actuals_id_seq OWNER TO postgres;

--
-- Name: production_resource_actuals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_resource_actuals_id_seq OWNED BY public.production_resource_actuals.id;


--
-- Name: production_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_runs (
    id integer NOT NULL,
    formula_id integer NOT NULL,
    status character varying(50) DEFAULT 'planned'::character varying,
    planned_quantity_kg numeric(12,4) NOT NULL,
    actual_quantity_kg numeric(12,4),
    waste_kg numeric(12,4) DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    loss_reason text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    order_id integer,
    client_name character varying(255),
    order_date timestamp with time zone,
    ink_series character varying(20)
);


ALTER TABLE public.production_runs OWNER TO postgres;

--
-- Name: production_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_runs_id_seq OWNER TO postgres;

--
-- Name: production_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_runs_id_seq OWNED BY public.production_runs.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_order_id integer,
    resource_id integer,
    quantity numeric(12,4) NOT NULL,
    unit character varying(20) NOT NULL,
    unit_price numeric(12,2) DEFAULT 0,
    received_quantity numeric(12,4) DEFAULT 0,
    refunded_quantity numeric(12,4) DEFAULT 0,
    refund_status character varying(50) DEFAULT 'none'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_order_items_refund_status_check CHECK (((refund_status)::text = ANY ((ARRAY['none'::character varying, 'pending'::character varying, 'completed'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_items_id_seq OWNER TO postgres;

--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    supplier_id integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    notes text,
    share_token uuid DEFAULT gen_random_uuid(),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'ordered'::character varying, 'received'::character varying, 'partially_received'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: resource_stock_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource_stock_transactions (
    id integer NOT NULL,
    resource_id integer NOT NULL,
    transaction_type character varying(50) NOT NULL,
    quantity numeric(12,4) NOT NULL,
    reference_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.resource_stock_transactions OWNER TO postgres;

--
-- Name: resource_stock_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resource_stock_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resource_stock_transactions_id_seq OWNER TO postgres;

--
-- Name: resource_stock_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resource_stock_transactions_id_seq OWNED BY public.resource_stock_transactions.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    unit character varying(20) NOT NULL,
    current_stock numeric(12,4) DEFAULT 0,
    reorder_level numeric(12,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    supplier_id integer,
    color character varying(100),
    feel character varying(100),
    CONSTRAINT resources_current_stock_check CHECK ((current_stock >= (0)::numeric))
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    address text DEFAULT 'No recorded address'::text NOT NULL,
    website character varying(255),
    notes text,
    gst_number character varying(20),
    regulatory_info text,
    pocs jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role_id integer,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: client_order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_order_items ALTER COLUMN id SET DEFAULT nextval('public.client_order_items_id_seq'::regclass);


--
-- Name: client_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_orders ALTER COLUMN id SET DEFAULT nextval('public.client_orders_id_seq'::regclass);


--
-- Name: client_shipping_addresses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_shipping_addresses ALTER COLUMN id SET DEFAULT nextval('public.client_shipping_addresses_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: colors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors ALTER COLUMN id SET DEFAULT nextval('public.colors_id_seq'::regclass);


--
-- Name: device_enrollment_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_enrollment_requests ALTER COLUMN id SET DEFAULT nextval('public.device_enrollment_requests_id_seq'::regclass);


--
-- Name: finished_stock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock ALTER COLUMN id SET DEFAULT nextval('public.finished_stock_id_seq'::regclass);


--
-- Name: finished_stock_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock_transactions ALTER COLUMN id SET DEFAULT nextval('public.finished_stock_transactions_id_seq'::regclass);


--
-- Name: formula_resources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formula_resources ALTER COLUMN id SET DEFAULT nextval('public.formula_resources_id_seq'::regclass);


--
-- Name: formulas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulas ALTER COLUMN id SET DEFAULT nextval('public.formulas_id_seq'::regclass);


--
-- Name: ink_grades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ink_grades ALTER COLUMN id SET DEFAULT nextval('public.ink_grades_id_seq'::regclass);


--
-- Name: loss_reasons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loss_reasons ALTER COLUMN id SET DEFAULT nextval('public.loss_reasons_id_seq'::regclass);


--
-- Name: material_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_requests ALTER COLUMN id SET DEFAULT nextval('public.material_requests_id_seq'::regclass);


--
-- Name: order_return_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_return_items ALTER COLUMN id SET DEFAULT nextval('public.order_return_items_id_seq'::regclass);


--
-- Name: order_returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_returns ALTER COLUMN id SET DEFAULT nextval('public.order_returns_id_seq'::regclass);


--
-- Name: product_losses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_losses ALTER COLUMN id SET DEFAULT nextval('public.product_losses_id_seq'::regclass);


--
-- Name: product_series_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_series_categories ALTER COLUMN id SET DEFAULT nextval('public.product_series_categories_id_seq'::regclass);


--
-- Name: product_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_types ALTER COLUMN id SET DEFAULT nextval('public.product_types_id_seq'::regclass);


--
-- Name: production_resource_actuals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_resource_actuals ALTER COLUMN id SET DEFAULT nextval('public.production_resource_actuals_id_seq'::regclass);


--
-- Name: production_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_runs ALTER COLUMN id SET DEFAULT nextval('public.production_runs_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: resource_stock_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_stock_transactions ALTER COLUMN id SET DEFAULT nextval('public.resource_stock_transactions_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (key, value, updated_at) FROM stdin;
low_stock_threshold	20	2026-05-05 10:53:05.984661+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, created_at) FROM stdin;
\.


--
-- Data for Name: client_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_order_items (id, order_id, color_id, pack_size_kg, quantity) FROM stdin;
\.


--
-- Data for Name: client_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_orders (id, client_id, client_name, shipping_address_id, status, notes, created_by, created_at, updated_at, shipping_status, payment_method, payment_status, return_status, refund_status) FROM stdin;
\.


--
-- Data for Name: client_shipping_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_shipping_addresses (id, client_id, label, address, is_default) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, name, gst_number, contact_name, contact_phone, contact_email, billing_address, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: color_ink_grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.color_ink_grades (color_id, grade_id) FROM stdin;
1	1
1	2
1	3
2	1
2	2
2	3
3	1
3	2
3	3
4	1
4	2
4	3
5	1
5	2
5	3
6	1
6	2
6	3
7	1
7	2
7	3
8	1
8	2
8	3
9	1
9	2
9	3
10	1
10	2
10	3
11	2
11	3
12	2
12	3
13	2
13	3
14	2
14	3
15	2
15	3
16	2
16	3
17	3
18	2
19	1
20	3
21	3
22	3
23	3
24	3
25	3
26	3
27	3
28	2
29	3
30	2
\.


--
-- Data for Name: color_product_series; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.color_product_series (color_id, series_id) FROM stdin;
\.


--
-- Data for Name: color_product_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.color_product_types (color_id, type_id) FROM stdin;
\.


--
-- Data for Name: colors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.colors (id, name, color_code, business_code, series, min_threshold_kg, description, created_at, updated_at, approval_status, requested_by, available_lcs, available_std, available_opq_js, ink_series, hsn_code, tags) FROM stdin;
1	BLACK	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
2	LEMON YELLOW	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
3	GOLDEN YELLOW	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
4	BLUE ROYAL	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
5	BLUE NAVY	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
6	ALPHA GREEN	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
7	DALLAS GREEN	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
8	DMP	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
9	ORANGE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
10	BRITE BLUE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
11	SPICY BROWN	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
12	VIOLET	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
13	TEE BLUE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
14	TURQUOISE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
15	RED SUPER	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
16	RED SCARLET	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
17	KHAKI	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
18	RAMA GREEN	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
19	DARK SUPER RED	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
20	STEEL GREY	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
21	FLT YGT	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
22	FLT PINK	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
23	FLT GREEN	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
24	FLT ORANGE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
25	FLT MAGENTA	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
26	FLT NEON	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
27	FLT GOLDEN YELLOW	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
28	BRITE GREEN	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
29	FOAN BUFF	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
30	SKY BLUE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
31	HIGH DENSITY (HD / SC)	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
32	NEW HD	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
33	NEW PUFF	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
34	PUFF ADDITIVE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
35	NEW EMBOSS GELL	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
36	CLEAR GELL 505	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
37	WHITE G-5	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
38	WHITE S-5	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
39	SUPER WHITE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
40	CD 300 WHITE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
41	POLAR WHITE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
42	1 STROKE WHITE	\N	\N	\N	0.0000	\N	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00	approved	\N	t	t	t	\N	\N	[]
\.


--
-- Data for Name: device_enrollment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_enrollment_requests (id, user_id, device, location, status, requested_at, updated_at) FROM stdin;
1	1	Chrome	Initial	approved	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00
2	1	Safari	Initial	approved	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00
3	1	Firefox	Initial	approved	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00
4	1	Edge	Initial	approved	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00
6	1	Chrome on Android	Mumbai, India	approved	2026-05-05 11:03:18.69815+00	2026-05-05 11:03:18.69815+00
5	1	Chrome on macOS	Mumbai, India	approved	2026-05-05 10:54:33.997613+00	2026-05-05 10:54:33.997613+00
\.


--
-- Data for Name: finished_stock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.finished_stock (id, color_id, pack_size_kg, quantity_units, updated_at) FROM stdin;
\.


--
-- Data for Name: finished_stock_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.finished_stock_transactions (id, color_id, pack_size_kg, transaction_type, quantity_units, quantity_kg, reference_id, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: formula_resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formula_resources (id, formula_id, resource_id, quantity_required) FROM stdin;
\.


--
-- Data for Name: formulas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formulas (id, color_id, name, version, batch_size_kg, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ink_grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ink_grades (id, name, created_at) FROM stdin;
1	LCS	2026-05-05 10:53:05.984661+00
2	STD	2026-05-05 10:53:05.984661+00
3	OPQ/JS	2026-05-05 10:53:05.984661+00
\.


--
-- Data for Name: loss_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loss_reasons (id, name, description) FROM stdin;
1	Damaged	Product physically damaged in warehouse or transit
2	Expired	Product exceeded shelf life
3	Spillage	Accidental release or spillage
4	QC Failure	Quality control check failed
5	Shipping Loss	Lost during delivery to customer
6	Customer Return	Returned by customer in unsellable condition
7	Other	Miscellaneous documentation
\.


--
-- Data for Name: material_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.material_requests (id, resource_id, requested_by, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: order_return_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_return_items (id, return_id, order_item_id, quantity, qc_status) FROM stdin;
\.


--
-- Data for Name: order_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_returns (id, order_id, status, notes, created_by, created_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: product_losses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_losses (id, item_type, color_id, resource_id, pack_size_kg, quantity_units, quantity_kg, reason_id, notes, documented_by, documented_at, reference_type, reference_id, created_at) FROM stdin;
\.


--
-- Data for Name: product_series_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_series_categories (id, name, created_at) FROM stdin;
\.


--
-- Data for Name: product_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_types (id, name, created_at) FROM stdin;
1	Water Based Ink	2026-05-05 10:53:05.984661+00
2	Oil Based Ink	2026-05-05 10:53:05.984661+00
\.


--
-- Data for Name: production_resource_actuals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_resource_actuals (id, production_run_id, resource_id, actual_quantity_used, expected_quantity, variance, variance_flag, created_at) FROM stdin;
\.


--
-- Data for Name: production_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_runs (id, formula_id, status, planned_quantity_kg, actual_quantity_kg, waste_kg, started_at, completed_at, loss_reason, created_by, created_at, updated_at, order_id, client_name, order_date, ink_series) FROM stdin;
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_items (id, purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity, refunded_quantity, refund_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, supplier_id, status, notes, share_token, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: resource_stock_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resource_stock_transactions (id, resource_id, transaction_type, quantity, reference_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resources (id, name, description, unit, current_stock, reorder_level, created_at, updated_at, supplier_id, color, feel) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at) FROM stdin;
1	admin	Super Administrator with full access	2026-05-05 10:53:04.025554+00
2	manager	Production and Inventory Manager	2026-05-05 10:53:04.025554+00
3	operator	Production floor operator	2026-05-05 10:53:04.025554+00
4	sales	Sales and order management	2026-05-05 10:53:04.025554+00
5	client	External client access	2026-05-05 10:53:04.025554+00
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, contact_person, email, phone, address, website, notes, gst_number, regulatory_info, pocs, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role_id, is_active, last_login, created_at, updated_at) FROM stdin;
1	admin	admin@example.com	$2b$10$fz.XHZD.JHYD7HoNFBY41uYMMhjDJnJBj12oh9kyfL03GIVFp5CMG	1	t	2026-05-05 11:03:18.565686+00	2026-05-05 10:53:05.984661+00	2026-05-05 10:53:05.984661+00
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: client_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_order_items_id_seq', 1, false);


--
-- Name: client_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_orders_id_seq', 1, false);


--
-- Name: client_shipping_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_shipping_addresses_id_seq', 1, false);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, false);


--
-- Name: colors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.colors_id_seq', 42, true);


--
-- Name: device_enrollment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_enrollment_requests_id_seq', 6, true);


--
-- Name: finished_stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.finished_stock_id_seq', 1, false);


--
-- Name: finished_stock_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.finished_stock_transactions_id_seq', 1, false);


--
-- Name: formula_resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formula_resources_id_seq', 1, false);


--
-- Name: formulas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formulas_id_seq', 1, false);


--
-- Name: ink_grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ink_grades_id_seq', 3, true);


--
-- Name: loss_reasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loss_reasons_id_seq', 14, true);


--
-- Name: material_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.material_requests_id_seq', 1, false);


--
-- Name: order_return_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_return_items_id_seq', 1, false);


--
-- Name: order_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_returns_id_seq', 1, false);


--
-- Name: product_losses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_losses_id_seq', 1, false);


--
-- Name: product_series_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_series_categories_id_seq', 1, false);


--
-- Name: product_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_types_id_seq', 2, true);


--
-- Name: production_resource_actuals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_resource_actuals_id_seq', 1, false);


--
-- Name: production_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_runs_id_seq', 1, false);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_order_items_id_seq', 1, false);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, false);


--
-- Name: resource_stock_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resource_stock_transactions_id_seq', 1, false);


--
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resources_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 10, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: client_order_items client_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_order_items
    ADD CONSTRAINT client_order_items_pkey PRIMARY KEY (id);


--
-- Name: client_orders client_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_pkey PRIMARY KEY (id);


--
-- Name: client_shipping_addresses client_shipping_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_shipping_addresses
    ADD CONSTRAINT client_shipping_addresses_pkey PRIMARY KEY (id);


--
-- Name: clients clients_gst_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_gst_number_key UNIQUE (gst_number);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: color_ink_grades color_ink_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_ink_grades
    ADD CONSTRAINT color_ink_grades_pkey PRIMARY KEY (color_id, grade_id);


--
-- Name: color_product_series color_product_series_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_product_series
    ADD CONSTRAINT color_product_series_pkey PRIMARY KEY (color_id, series_id);


--
-- Name: color_product_types color_product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_product_types
    ADD CONSTRAINT color_product_types_pkey PRIMARY KEY (color_id, type_id);


--
-- Name: colors colors_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_name_key UNIQUE (name);


--
-- Name: colors colors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY (id);


--
-- Name: device_enrollment_requests device_enrollment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_enrollment_requests
    ADD CONSTRAINT device_enrollment_requests_pkey PRIMARY KEY (id);


--
-- Name: device_enrollment_requests device_enrollment_requests_user_id_device_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_enrollment_requests
    ADD CONSTRAINT device_enrollment_requests_user_id_device_key UNIQUE (user_id, device);


--
-- Name: finished_stock finished_stock_color_id_pack_size_kg_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock
    ADD CONSTRAINT finished_stock_color_id_pack_size_kg_key UNIQUE (color_id, pack_size_kg);


--
-- Name: finished_stock finished_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock
    ADD CONSTRAINT finished_stock_pkey PRIMARY KEY (id);


--
-- Name: finished_stock_transactions finished_stock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock_transactions
    ADD CONSTRAINT finished_stock_transactions_pkey PRIMARY KEY (id);


--
-- Name: formula_resources formula_resources_formula_id_resource_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formula_resources
    ADD CONSTRAINT formula_resources_formula_id_resource_id_key UNIQUE (formula_id, resource_id);


--
-- Name: formula_resources formula_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formula_resources
    ADD CONSTRAINT formula_resources_pkey PRIMARY KEY (id);


--
-- Name: formulas formulas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulas
    ADD CONSTRAINT formulas_pkey PRIMARY KEY (id);


--
-- Name: ink_grades ink_grades_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ink_grades
    ADD CONSTRAINT ink_grades_name_key UNIQUE (name);


--
-- Name: ink_grades ink_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ink_grades
    ADD CONSTRAINT ink_grades_pkey PRIMARY KEY (id);


--
-- Name: loss_reasons loss_reasons_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loss_reasons
    ADD CONSTRAINT loss_reasons_name_key UNIQUE (name);


--
-- Name: loss_reasons loss_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loss_reasons
    ADD CONSTRAINT loss_reasons_pkey PRIMARY KEY (id);


--
-- Name: material_requests material_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT material_requests_pkey PRIMARY KEY (id);


--
-- Name: order_return_items order_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_return_items
    ADD CONSTRAINT order_return_items_pkey PRIMARY KEY (id);


--
-- Name: order_returns order_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_pkey PRIMARY KEY (id);


--
-- Name: product_losses product_losses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_losses
    ADD CONSTRAINT product_losses_pkey PRIMARY KEY (id);


--
-- Name: product_series_categories product_series_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_series_categories
    ADD CONSTRAINT product_series_categories_name_key UNIQUE (name);


--
-- Name: product_series_categories product_series_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_series_categories
    ADD CONSTRAINT product_series_categories_pkey PRIMARY KEY (id);


--
-- Name: product_types product_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_name_key UNIQUE (name);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (id);


--
-- Name: production_resource_actuals production_resource_actuals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_resource_actuals
    ADD CONSTRAINT production_resource_actuals_pkey PRIMARY KEY (id);


--
-- Name: production_resource_actuals production_resource_actuals_production_run_id_resource_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_resource_actuals
    ADD CONSTRAINT production_resource_actuals_production_run_id_resource_id_key UNIQUE (production_run_id, resource_id);


--
-- Name: production_runs production_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: resource_stock_transactions resource_stock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_stock_transactions
    ADD CONSTRAINT resource_stock_transactions_pkey PRIMARY KEY (id);


--
-- Name: resources resources_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_name_key UNIQUE (name);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_gst_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_gst_number_key UNIQUE (gst_number);


--
-- Name: suppliers suppliers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_key UNIQUE (name);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: production_resource_actuals unique_production_run_resource; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_resource_actuals
    ADD CONSTRAINT unique_production_run_resource UNIQUE (production_run_id, resource_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_po_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_supplier_id ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_poi_po_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_poi_po_id ON public.purchase_order_items USING btree (purchase_order_id);


--
-- Name: idx_product_losses_color_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_losses_color_id ON public.product_losses USING btree (color_id);


--
-- Name: idx_product_losses_resource_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_losses_resource_id ON public.product_losses USING btree (resource_id);


--
-- Name: idx_resources_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resources_supplier_id ON public.resources USING btree (supplier_id);


--
-- Name: resource_stock_transactions trg_resource_stock_audit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_resource_stock_audit AFTER INSERT ON public.resource_stock_transactions FOR EACH ROW EXECUTE FUNCTION public.update_resource_stock_from_transaction();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: client_order_items client_order_items_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_order_items
    ADD CONSTRAINT client_order_items_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id);


--
-- Name: client_order_items client_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_order_items
    ADD CONSTRAINT client_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.client_orders(id) ON DELETE CASCADE;


--
-- Name: client_orders client_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_orders client_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: client_orders client_orders_shipping_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT client_orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.client_shipping_addresses(id);


--
-- Name: client_shipping_addresses client_shipping_addresses_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_shipping_addresses
    ADD CONSTRAINT client_shipping_addresses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clients clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: color_ink_grades color_ink_grades_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_ink_grades
    ADD CONSTRAINT color_ink_grades_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;


--
-- Name: color_ink_grades color_ink_grades_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_ink_grades
    ADD CONSTRAINT color_ink_grades_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.ink_grades(id) ON DELETE CASCADE;


--
-- Name: color_product_series color_product_series_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_product_series
    ADD CONSTRAINT color_product_series_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;


--
-- Name: color_product_series color_product_series_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_product_series
    ADD CONSTRAINT color_product_series_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.product_series_categories(id) ON DELETE CASCADE;


--
-- Name: color_product_types color_product_types_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_product_types
    ADD CONSTRAINT color_product_types_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;


--
-- Name: color_product_types color_product_types_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_product_types
    ADD CONSTRAINT color_product_types_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.product_types(id) ON DELETE CASCADE;


--
-- Name: colors colors_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: device_enrollment_requests device_enrollment_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_enrollment_requests
    ADD CONSTRAINT device_enrollment_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: finished_stock finished_stock_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock
    ADD CONSTRAINT finished_stock_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id);


--
-- Name: finished_stock_transactions finished_stock_transactions_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock_transactions
    ADD CONSTRAINT finished_stock_transactions_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id);


--
-- Name: finished_stock_transactions finished_stock_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finished_stock_transactions
    ADD CONSTRAINT finished_stock_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: formula_resources formula_resources_formula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formula_resources
    ADD CONSTRAINT formula_resources_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES public.formulas(id) ON DELETE CASCADE;


--
-- Name: formula_resources formula_resources_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formula_resources
    ADD CONSTRAINT formula_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: formulas formulas_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulas
    ADD CONSTRAINT formulas_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id);


--
-- Name: material_requests material_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT material_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: material_requests material_requests_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT material_requests_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: order_return_items order_return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_return_items
    ADD CONSTRAINT order_return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.client_order_items(id) ON DELETE CASCADE;


--
-- Name: order_return_items order_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_return_items
    ADD CONSTRAINT order_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.order_returns(id) ON DELETE CASCADE;


--
-- Name: order_returns order_returns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: order_returns order_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_returns
    ADD CONSTRAINT order_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.client_orders(id) ON DELETE CASCADE;


--
-- Name: product_losses product_losses_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_losses
    ADD CONSTRAINT product_losses_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id);


--
-- Name: product_losses product_losses_documented_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_losses
    ADD CONSTRAINT product_losses_documented_by_fkey FOREIGN KEY (documented_by) REFERENCES public.users(id);


--
-- Name: product_losses product_losses_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_losses
    ADD CONSTRAINT product_losses_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.loss_reasons(id);


--
-- Name: product_losses product_losses_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_losses
    ADD CONSTRAINT product_losses_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: production_resource_actuals production_resource_actuals_production_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_resource_actuals
    ADD CONSTRAINT production_resource_actuals_production_run_id_fkey FOREIGN KEY (production_run_id) REFERENCES public.production_runs(id) ON DELETE CASCADE;


--
-- Name: production_resource_actuals production_resource_actuals_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_resource_actuals
    ADD CONSTRAINT production_resource_actuals_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: production_runs production_runs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: production_runs production_runs_formula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES public.formulas(id);


--
-- Name: production_runs production_runs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_runs
    ADD CONSTRAINT production_runs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.client_orders(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: resource_stock_transactions resource_stock_transactions_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_stock_transactions
    ADD CONSTRAINT resource_stock_transactions_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: resources resources_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 4bHFzg8sVcME48fxqjIkMBzSZiO5n0Y8gmKZPeOiLHliiEr0zUbmMYoqyfcvSl9

