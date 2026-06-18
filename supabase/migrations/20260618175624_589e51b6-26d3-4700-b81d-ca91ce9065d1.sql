
-- Fix infinite recursion between orders and order_items policies.
-- orders.policy referenced order_items, and order_items.policy referenced orders.
-- Break the cycle with SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.is_order_seller(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id AND p.seller_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_order_owner(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id AND o.user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_order_seller(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_order_owner(uuid, uuid) TO authenticated, anon;

-- Rewrite orders policies
DROP POLICY IF EXISTS orders_self_read ON public.orders;
DROP POLICY IF EXISTS orders_update ON public.orders;

CREATE POLICY orders_self_read ON public.orders
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_order_seller(auth.uid(), id)
);

CREATE POLICY orders_update ON public.orders
FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_order_seller(auth.uid(), id)
);

-- Rewrite order_items SELECT policy to avoid querying orders directly
DROP POLICY IF EXISTS oi_read ON public.order_items;

CREATE POLICY oi_read ON public.order_items
FOR SELECT
USING (
  public.is_order_owner(auth.uid(), order_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = order_items.product_id AND p.seller_id = auth.uid()
  )
);
