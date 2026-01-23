-- Fix mood-photos bucket to be private (currently public=true which bypasses RLS)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'mood-photos';

-- For app_updates table, we explicitly deny all writes from clients
-- by not having any INSERT/UPDATE/DELETE policies (RLS is already enabled)
-- This is the safest approach since the table only needs to be read by authenticated users
-- and writes should only happen via service role from admin/backend

-- Add explicit deny-all policies for clarity (though not strictly necessary with RLS enabled and no permissive policies)
-- These act as documentation that writes are intentionally blocked
COMMENT ON TABLE public.app_updates IS 'App update announcements. Read-only for clients - writes only via service role/admin.';
