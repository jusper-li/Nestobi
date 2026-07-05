/*
  Add centralized email routing fields so the super admin can manage
  customer-support, booking, order, and system notification recipients in one place.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS support_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS booking_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS system_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_failed_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refund_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS member_notification_emails text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alert_notification_emails text NOT NULL DEFAULT '';

UPDATE site_settings
SET
  support_notification_emails = COALESCE(NULLIF(support_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  booking_notification_emails = COALESCE(NULLIF(booking_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  order_notification_emails = COALESCE(NULLIF(order_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  system_notification_emails = COALESCE(NULLIF(system_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  payment_failed_notification_emails = COALESCE(NULLIF(payment_failed_notification_emails, ''), NULLIF(system_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  refund_notification_emails = COALESCE(NULLIF(refund_notification_emails, ''), NULLIF(system_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  member_notification_emails = COALESCE(NULLIF(member_notification_emails, ''), NULLIF(system_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  alert_notification_emails = COALESCE(NULLIF(alert_notification_emails, ''), NULLIF(system_notification_emails, ''), NULLIF(contact_email, ''), 'service@dlalshop.com'),
  updated_at = now()
WHERE is_active = true;
