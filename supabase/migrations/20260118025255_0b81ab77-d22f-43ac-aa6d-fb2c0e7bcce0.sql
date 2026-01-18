-- Harden SECURITY DEFINER helper functions by binding checks to the caller (auth.uid())
-- and reduce unnecessary SECURITY DEFINER usage.

BEGIN;

-- 1) Remove unnecessary SECURITY DEFINER (pure function; no DB access)
CREATE OR REPLACE FUNCTION public.calculate_customer_tier(
  p_lifetime_points integer,
  p_bronze_min integer,
  p_silver_min integer,
  p_gold_min integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_lifetime_points >= p_gold_min THEN
    RETURN 'gold';
  ELSIF p_lifetime_points >= p_silver_min THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$function$;

-- 2) Bind role/ownership helper checks to the authenticated caller.
--    This prevents using these functions as an oracle for other users.

CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN NULL
    WHEN auth.uid() IS NULL THEN NULL
    WHEN _user_id <> auth.uid() THEN NULL
    ELSE (
      SELECT store_id
      FROM public.profiles
      WHERE id = _user_id
      LIMIT 1
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.is_store_owner(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL OR _store_id IS NULL THEN false
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id <> auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id
        AND store_id = _store_id
        AND is_owner = true
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL OR _role IS NULL THEN false
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id <> auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id <> auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'super_admin'
    )
  END
$function$;

-- 3) Trigger functions should not be directly callable by clients.
--    Revoke default PUBLIC execute privileges.
REVOKE ALL ON FUNCTION public.award_loyalty_points() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_order_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_table_status_on_order() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_customer_from_order() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_inventory_on_order_accepted() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_stock_on_order_finalized() FROM PUBLIC;

COMMIT;