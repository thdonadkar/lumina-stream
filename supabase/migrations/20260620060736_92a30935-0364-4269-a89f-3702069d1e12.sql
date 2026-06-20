-- 1. Order item integrity: prevent price/qty tampering at the DB layer.
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_unit_price_nonneg CHECK (unit_price >= 0),
  ADD CONSTRAINT order_items_qty_positive CHECK (qty > 0);

-- 2. product-images bucket: tighten writes to sellers only.
DROP POLICY IF EXISTS product_images_authed_write ON storage.objects;
DROP POLICY IF EXISTS product_images_authed_update ON storage.objects;
DROP POLICY IF EXISTS product_images_authed_delete ON storage.objects;

CREATE POLICY product_images_seller_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'seller'::public.app_role)
  );

CREATE POLICY product_images_seller_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'seller'::public.app_role)
  );

CREATE POLICY product_images_seller_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'seller'::public.app_role)
  );

-- Admins keep full access for moderation.
CREATE POLICY product_images_admin_all
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );