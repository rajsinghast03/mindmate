-- Profile timezone: derived from country/city selection, used by the matching
-- re-ranker for timezone-overlap scoring (replaces parsing "UTC+X" from labels).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iana_timezone TEXT;
