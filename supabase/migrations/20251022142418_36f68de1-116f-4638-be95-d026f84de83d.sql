-- 1. 建立車輛類型 ENUM
CREATE TYPE public.vehicle_type AS ENUM ('human_driver', 'autonomous', 'no_preference');

-- 2. 在 bookings 表新增欄位
ALTER TABLE public.bookings 
ADD COLUMN preferred_vehicle_type public.vehicle_type DEFAULT 'no_preference',
ADD COLUMN actual_vehicle_type public.vehicle_type,
ADD COLUMN vehicle_type_notes TEXT;

-- 3. 建立索引以提升查詢效能
CREATE INDEX idx_bookings_preferred_vehicle_type ON public.bookings(preferred_vehicle_type);
CREATE INDEX idx_bookings_actual_vehicle_type ON public.bookings(actual_vehicle_type);

-- 4. 新增註解
COMMENT ON COLUMN public.bookings.preferred_vehicle_type IS '使用者偏好的車輛類型';
COMMENT ON COLUMN public.bookings.actual_vehicle_type IS '實際派遣的車輛類型';
COMMENT ON COLUMN public.bookings.vehicle_type_notes IS '車輛類型備註（如改派原因）';