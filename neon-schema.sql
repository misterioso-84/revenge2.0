-- ====================================================================
-- CASINO REVENGE - NEON DATABASE SCHEMA SQL SCRIPT
-- ====================================================================
-- This SQL script creates the tables and structure required for your Neon Postgres database.
-- 
-- Note on Architecture: 
-- The application uses an optimized "single-document state" inside the `app_state` table 
-- to manage the complex real-time database state. 
-- 
-- Below is the DDL for the core system.
-- ====================================================================

-- Core State Store
CREATE TABLE IF NOT EXISTS public.app_state (
  id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual structural tables (reference schema for direct SQL querying and analysis)

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_tier') THEN
    CREATE TYPE public.membership_tier AS ENUM ('standard', 'exclusive', 'elite');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_billing') THEN
    CREATE TYPE public.service_billing AS ENUM ('per_night', 'one_time', 'recurring');
  END IF;
END $$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Built-in User Roles (admin / staff)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Custom Roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Custom Roles
CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  UNIQUE (user_id, custom_role_id)
);

-- Citizens
CREATE TABLE IF NOT EXISTS public.citizens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  nickname TEXT,
  faction TEXT,
  membership public.membership_tier NOT NULL DEFAULT 'standard',
  membership_since DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe Boxes
CREATE TABLE IF NOT EXISTS public.safe_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number INT NOT NULL UNIQUE,
  citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
  activated_at DATE,
  expires_at DATE,
  active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

-- Badge Weeks
CREATE TABLE IF NOT EXISTS public.badge_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Badge Sessions (Badge Clock-ins)
CREATE TABLE IF NOT EXISTS public.badge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_id UUID NOT NULL REFERENCES public.badge_weeks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  billing public.service_billing NOT NULL DEFAULT 'per_night',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nights
CREATE TABLE IF NOT EXISTS public.nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  night_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversions Settings
CREATE TABLE IF NOT EXISTS public.conversion_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  max_dobloni_per_day INT NOT NULL DEFAULT 10000,
  max_eur_per_day INT NOT NULL DEFAULT 2000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = true)
);

-- Conversions Log
CREATE TABLE IF NOT EXISTS public.conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  night_id UUID NOT NULL REFERENCES public.nights(id) ON DELETE CASCADE,
  direction VARCHAR(50) NOT NULL, -- 'cash_to_dobloni' or 'dobloni_to_cash'
  eur_amount NUMERIC(12,2) NOT NULL,
  dobloni_amount INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversion Resets
CREATE TABLE IF NOT EXISTS public.conversion_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  night_id UUID NOT NULL REFERENCES public.nights(id) ON DELETE CASCADE,
  direction VARCHAR(50) NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stables
CREATE TABLE IF NOT EXISTS public.stables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_citizen_id UUID REFERENCES public.citizens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Horses
CREATE TABLE IF NOT EXISTS public.horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stable_id UUID REFERENCES public.stables(id) ON DELETE SET NULL,
  sponsor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchased Services
CREATE TABLE IF NOT EXISTS public.purchased_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  night_id UUID NOT NULL REFERENCES public.nights(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sanctions
CREATE TABLE IF NOT EXISTS public.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'warning' or 'suspension'
  reason TEXT NOT NULL,
  duration_days INT, -- for suspension
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance Settings
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  is_maintenance BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
