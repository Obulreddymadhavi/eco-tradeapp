
-- Roles
CREATE TYPE public.app_role AS ENUM ('customer', 'vendor', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  address TEXT,
  avatar_url TEXT,
  company_name TEXT,
  vehicle_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Vendors can see customer profile fields needed for an accepted pickup (RLS via pickup table read instead)
-- For simplicity expose minimal profile read for vendors via a view-free policy: allow read of profile if same auth user, else require explicit pickup link handled in queries.

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, address, company_name, vehicle_info)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'vehicle_info'
  );
  IF (NEW.raw_user_meta_data->>'role') IN ('customer','vendor') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Pickup status enum
CREATE TYPE public.pickup_status AS ENUM
  ('pending','accepted','on_the_way','arrived','collected','cash_paid','completed','rejected','cancelled');

CREATE TYPE public.waste_category AS ENUM
  ('plastic','paper','metal','glass','e_waste','organic','mixed','other');

CREATE TABLE public.pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category public.waste_category NOT NULL,
  description TEXT,
  estimated_weight_kg NUMERIC(10,2) NOT NULL,
  final_weight_kg NUMERIC(10,2),
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status public.pickup_status NOT NULL DEFAULT 'pending',
  estimated_amount NUMERIC(10,2),
  final_amount NUMERIC(10,2),
  payment_status TEXT NOT NULL DEFAULT 'pending',
  customer_snapshot JSONB,
  vendor_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pickups TO authenticated;
GRANT ALL ON public.pickups TO service_role;
ALTER TABLE public.pickups DISABLE ROW LEVEL SECURITY;

-- Customers: their own
CREATE POLICY "Customer reads own pickups" ON public.pickups
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Customer creates pickups" ON public.pickups
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = customer_id
  );
CREATE POLICY "Customer updates own pickup (cancel)" ON public.pickups
  FOR UPDATE TO authenticated USING (auth.uid() = customer_id);

-- Vendors: see unassigned pending pickups + ones they accepted
CREATE POLICY "Vendor reads open or own pickups" ON public.pickups
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'vendor') AND (vendor_id IS NULL OR vendor_id = auth.uid())
  );
CREATE POLICY "Vendor accepts/updates pickups" ON public.pickups
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'vendor') AND (vendor_id IS NULL OR vendor_id = auth.uid())
  );

-- Admin all
CREATE POLICY "Admin all pickups" ON public.pickups
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pickups_touch BEFORE UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX pickups_status_idx ON public.pickups (status);
CREATE INDEX pickups_customer_idx ON public.pickups (customer_id);
CREATE INDEX pickups_vendor_idx ON public.pickups (vendor_id);

-- Eco points ledger
CREATE TABLE public.eco_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.eco_points TO authenticated;
GRANT ALL ON public.eco_points TO service_role;
ALTER TABLE public.eco_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own points" ON public.eco_points
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User inserts own redemption" ON public.eco_points
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Rewards catalog
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cost_points INTEGER NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated, anon;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active rewards" ON public.rewards
  FOR SELECT USING (active = TRUE);
CREATE POLICY "Admin manages rewards" ON public.rewards
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.rewards (title, description, cost_points, category) VALUES
  ('Amazon Voucher ₹100', '₹100 Amazon shopping voucher', 500, 'voucher'),
  ('Grocery Coupon ₹200', '₹200 off at partner grocery stores', 900, 'coupon'),
  ('Plant Sapling', 'Get a sapling delivered to your home', 200, 'sapling'),
  ('Eco Bamboo Toothbrush', 'Sustainable bamboo toothbrush', 350, 'product'),
  ('Reusable Steel Bottle', '750ml insulated steel bottle', 1200, 'product'),
  ('Movie Ticket Gift Card', '1x movie ticket gift card', 700, 'gift_card');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eco_points;
