-- Keep database storage bounded even if a request bypasses application validation.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_curiosity_profile_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_curiosity_profile_length
  CHECK (
    char_length(curiosity_profile) >= 50
    AND char_length(curiosity_profile) <= 2000
  );
