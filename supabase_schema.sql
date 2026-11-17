-- ============================================================================
-- SUPABASE DATABASE SCHEMA: เทศกาลท่องเที่ยวเมืองพร้าว 2569 (Phrao Tourism Festival 2026)
-- Project Ref: mpsuumkyqweenvdkmwwf (https://mpsuumkyqweenvdkmwwf.supabase.co)
-- Developed by: S.Y. Interactive Development Limited
-- ============================================================================

-- 1. ตารางหลักเก็บรายการจองโคมลอย (24-25 พ.ย. 69) และบัตรมินิบอลลูน (20-21 พ.ย. 69)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,                              -- รหัสจอง เช่น KL24-0001, KL25-0001, MB20-0001, MB21-0001
    category TEXT NOT NULL CHECK (category IN ('lantern', 'balloon')),
    event_date TEXT NOT NULL,                         -- '2026-11-24', '2026-11-25', '2026-11-20', '2026-11-21'
    customer_name TEXT NOT NULL,                      -- ชื่อผู้จอง / ชื่อรายการขายหน้างาน
    phone TEXT NOT NULL,                              -- เบอร์โทรศัพท์ 10 หลัก (ใช้ค้นหาบัตร E-Ticket)
    quantity INTEGER NOT NULL CHECK (quantity > 0),   -- จำนวนโคม หรือ จำนวนบัตรมินิบอลลูน
    attendees INTEGER NOT NULL CHECK (attendees > 0), -- จำนวนผู้เข้าร่วม (โคมลอย = quantity * 2, มินิบอลลูน = quantity)
    unit_price INTEGER NOT NULL,                      -- 299 (โคมลอย) หรือ 100 (มินิบอลลูน)
    total_amount INTEGER NOT NULL,                    -- ยอดชำระเงินรวม (บาท)
    payment_method TEXT DEFAULT 'promptpay_qr',       -- 'promptpay_qr' หรือ 'cash'
    slip_data_url TEXT,                               -- รูปสลิปโอนเงิน (Base64 บีบอัดแล้ว หรือ Storage URL)
    slip_qr_ref TEXT,                                 -- รหัสอ้างอิงธุรกรรมที่สแกนได้จาก QR ในรูปสลิป (ป้องกันสลิปซ้ำ)
    slip_qr_raw TEXT,                                 -- ข้อมูลดิบจาก QR บนสลิปธนาคาร
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected')),
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,        -- สถานะเช็คอินรับโคมหน้างานเวลา 18.00 น.
    checked_in_at TIMESTAMPTZ,                        -- วัน-เวลาที่เช็คอินรับของ
    channel TEXT NOT NULL DEFAULT 'online' CHECK (channel IN ('online', 'walkin')),
    ticket_serial_range TEXT,                         -- ช่วงเลขตั๋วรถมินิบอลลูนกรณีบันทึกขายหน้างาน เช่น '0001-0050'
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- สร้าง Index เพื่อการค้นหาด้วยเบอร์โทรศัพท์และกรองตามวันอย่างรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings (phone);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings (event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_category ON public.bookings (category);

-- 2. ตารางเก็บการตั้งค่าระบบและโควตา (สำหรับ Admin)
CREATE TABLE IF NOT EXISTS public.festival_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ค่าเริ่มต้นโควตาและสถานะเปิดรับจอง
INSERT INTO public.festival_settings (key, value)
VALUES (
    'config',
    '{
      "quota_2026_11_24": 200,
      "quota_2026_11_25": 200,
      "open_2026_11_24": true,
      "open_2026_11_25": true,
      "open_2026_11_20": true,
      "open_2026_11_21": true
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 3. เปิดใช้งาน Row Level Security (RLS) และอนุญาตการเข้าถึงผ่าน Web App
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and insert bookings" ON public.bookings;
CREATE POLICY "Allow public read and insert bookings"
    ON public.bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and update settings" ON public.festival_settings;
CREATE POLICY "Allow public read and update settings"
    ON public.festival_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
