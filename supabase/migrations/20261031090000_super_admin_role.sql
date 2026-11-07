-- RUN THIS FILE BY ITSELF FIRST. Commit the enum value before step 2.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
