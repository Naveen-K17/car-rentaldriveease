
-- ============================================================
-- Vehicle Rental Management System - Schema
-- ============================================================

-- Roles enum + table (prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles (customer info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  license_no TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Auto-create profile + default customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vehicles
CREATE TYPE public.vehicle_status AS ENUM ('available', 'booked', 'maintenance');
CREATE TYPE public.vehicle_type AS ENUM ('car', 'bike', 'suv', 'truck', 'van');

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  type public.vehicle_type NOT NULL,
  registration_no TEXT NOT NULL UNIQUE,
  year INT NOT NULL CHECK (year BETWEEN 1980 AND 2100),
  seats INT NOT NULL DEFAULT 4 CHECK (seats > 0),
  price_per_day NUMERIC(10,2) NOT NULL CHECK (price_per_day > 0),
  image_url TEXT,
  status public.vehicle_status NOT NULL DEFAULT 'available',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TYPE public.booking_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL CHECK (total_days > 0),
  total_cost NUMERIC(10,2) NOT NULL CHECK (total_cost >= 0),
  status public.booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create own bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers update own bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete bookings" ON public.bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Payments
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
CREATE TYPE public.payment_method AS ENUM ('card', 'upi', 'cash', 'netbanking');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method public.payment_method NOT NULL DEFAULT 'card',
  status public.payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View payments for own bookings" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Create payments for own bookings" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));
CREATE POLICY "Admins update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Returns
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_condition TEXT NOT NULL DEFAULT 'good',
  late_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
  damage_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (damage_fee >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View returns for own bookings" ON public.returns FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Create returns for own bookings" ON public.returns FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Admins manage returns" ON public.returns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: when a return is created, mark booking completed + vehicle available
CREATE OR REPLACE FUNCTION public.handle_vehicle_return()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  SELECT vehicle_id INTO v_id FROM public.bookings WHERE id = NEW.booking_id;
  UPDATE public.bookings SET status = 'completed', updated_at = now() WHERE id = NEW.booking_id;
  UPDATE public.vehicles SET status = 'available', updated_at = now() WHERE id = v_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_return_created AFTER INSERT ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.handle_vehicle_return();

-- Trigger: when booking is created with active status, mark vehicle booked
CREATE OR REPLACE FUNCTION public.handle_booking_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.vehicles SET status = 'booked', updated_at = now() WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_booking_status_change AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_vehicles BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_bookings BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sample vehicles
INSERT INTO public.vehicles (name, brand, model, type, registration_no, year, seats, price_per_day, image_url, description) VALUES
('Swift Dzire', 'Maruti', 'Dzire VXi', 'car', 'KA01AB1234', 2022, 5, 1800, 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=800', 'Comfortable sedan, perfect for city rides.'),
('Innova Crysta', 'Toyota', 'Crysta ZX', 'suv', 'KA02CD5678', 2023, 7, 3500, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800', 'Spacious SUV for family trips.'),
('Royal Enfield Classic', 'Royal Enfield', 'Classic 350', 'bike', 'KA03EF9012', 2023, 2, 900, 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800', 'Iconic cruiser bike for road trips.'),
('Honda City', 'Honda', 'City ZX', 'car', 'KA04GH3456', 2022, 5, 2200, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800', 'Premium sedan with great mileage.'),
('Tata Nexon', 'Tata', 'Nexon EV', 'suv', 'KA05IJ7890', 2024, 5, 2800, 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800', 'Electric compact SUV.'),
('KTM Duke', 'KTM', 'Duke 390', 'bike', 'KA06KL2345', 2023, 2, 1200, 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800', 'Sport bike for thrill seekers.'),
('Mahindra Bolero', 'Mahindra', 'Bolero B6', 'suv', 'KA07MN6789', 2021, 7, 2500, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800', 'Rugged off-road SUV.'),
('Tempo Traveller', 'Force', 'Traveller 17', 'van', 'KA08OP0123', 2022, 17, 5000, 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', 'Large group travel van.');
