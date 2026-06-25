
-- Extend payment_status enum (must commit before use)
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'not_applicable';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'authorized';

COMMIT;

-- Backfill: cancelled orders that were never paid
UPDATE public.orders
SET payment_status = 'not_applicable'::payment_status,
    refund_status  = 'none'::refund_status
WHERE status = 'cancelled'
  AND payment_status IN ('pending');

-- Backfill: COD orders cancelled (any state) without capture -> no refund record
UPDATE public.orders
SET refund_status = 'none'::refund_status
WHERE status = 'cancelled'
  AND payment_method = 'cod'
  AND payment_status <> 'paid'::payment_status;

-- Backfill: COD delivered = paid (cash collected at delivery)
UPDATE public.orders
SET payment_status = 'paid'::payment_status
WHERE payment_method = 'cod'
  AND status IN ('delivered','return_requested','returned','refunded')
  AND payment_status = 'pending';
