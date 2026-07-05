-- SQL Script untuk membuat tabel di Supabase (PostgreSQL)
-- Salin dan jalankan script ini di SQL Editor Supabase Anda.

-- 1. Tabel users
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT NOT NULL,
    visit_type TEXT NOT NULL,
    check_in_date TEXT NOT NULL,
    check_out_date TEXT,
    num_nights INTEGER,
    num_people INTEGER NOT NULL,
    num_motorcycles INTEGER NOT NULL,
    num_cars INTEGER NOT NULL,
    rentals JSONB,
    payment_method TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    booking_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    payment_status TEXT DEFAULT 'Belum Bayar'
);

-- 3. Tabel feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY,
    name TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 4. Tabel admin_settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    youtube_url TEXT NOT NULL,
    whatsapp_url TEXT NOT NULL,
    facebook_url TEXT NOT NULL,
    instagram_url TEXT NOT NULL,
    tiktok_url TEXT NOT NULL,
    google_maps_url TEXT NOT NULL,
    ticket_info_image TEXT NOT NULL,
    camping_image TEXT NOT NULL,
    payment_image TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    price_camping_person INTEGER NOT NULL,
    price_camping_motorcycle INTEGER NOT NULL,
    price_camping_car INTEGER NOT NULL,
    price_visit_person INTEGER NOT NULL,
    price_visit_motorcycle INTEGER NOT NULL,
    price_visit_car INTEGER NOT NULL,
    rental_prices JSONB NOT NULL,
    e_ticket_active BOOLEAN DEFAULT true,
    disable_supabase_sync BOOLEAN DEFAULT false,
    gmail_auto_reply_active BOOLEAN DEFAULT false,
    gmail_token TEXT,
    rental_items JSONB,
    form_fields JSONB,
    content_texts JSONB NOT NULL
);

-- 5. Tabel visitor_stats
CREATE TABLE IF NOT EXISTS public.visitor_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    views_count JSONB NOT NULL,
    total_views INTEGER DEFAULT 0 NOT NULL,
    total_bookings INTEGER DEFAULT 0 NOT NULL,
    total_revenue INTEGER DEFAULT 0 NOT NULL
);

-- Aktifkan Row Level Security (RLS) atau pastikan tabel dapat diakses jika RLS dinonaktifkan
-- Untuk kemudahan, kita nonaktifkan RLS di tabel-tabel ini agar API key publik dapat mengaksesnya,
-- atau buat kebijakan akses anonim jika RLS diaktifkan.

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_stats DISABLE ROW LEVEL SECURITY;

-- Insert data awal (seeding) jika tabel admin_settings kosong
INSERT INTO public.admin_settings (
    id, youtube_url, whatsapp_url, facebook_url, instagram_url, tiktok_url, google_maps_url,
    ticket_info_image, camping_image, payment_image, logo_url,
    price_camping_person, price_camping_motorcycle, price_camping_car,
    price_visit_person, price_visit_motorcycle, price_visit_car,
    rental_prices, e_ticket_active, disable_supabase_sync, gmail_auto_reply_active, content_texts
) VALUES (
    1,
    'https://www.youtube.com/embed/tM03S3S8-b8',
    'https://wa.me/6287864455512',
    'https://facebook.com/wisatagoalawah',
    'https://instagram.com/pokdarwis_goalawah',
    'https://tiktok.com/@wisatagoalawah',
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3945.3908252277494!2d116.2415177!3d-8.5583647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dcd99f18fe888bb%3A0xe54e6015fccc4ac9!2sLebah%20Sempage!5e0!3m2!1sen!2sid!4v1718500000000!5m2!1sen!2sid',
    '/src/assets/images/ticket_flyer_1781677879257.jpg',
    '/src/assets/images/camping_rental_1781677897755.jpg',
    '/src/assets/images/qris_payment_1781677862360.jpg',
    '/src/assets/images/goa_lawah_logo_1781677843742.jpg',
    10000, 5000, 10000,
    5000, 0, 0,
    '{"tent": 50000, "sleepingBag": 10000, "matras": 5000, "firewood": 10000}'::jsonb,
    true, false, false,
    '{"heroTitle": "Biolink Resmi", "heroSubtitle": "Desa Wisata Goa Lawah", "description": "Selamat datang di surga tersembunyi Narmada. Destinasi Wisata Alam Goa Lawah menyajikan panorama tebing eksotis, koloni kelelawar alami, aliran air pegunungan yang jernih, dan petualangan camping ground terbaik di tengah kesejukan hutan lebat.", "destinationName": "Wisata Alam Goa Lawah", "villageName": "Desa Wisata Lebah Sempage - Narmada", "footerText": "2026 dikelola oleh Pokdarwis Goa Lawah-Narmada"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert data awal visitor_stats jika kosong
INSERT INTO public.visitor_stats (id, views_count, total_views, total_bookings, total_revenue)
VALUES (1, '{}'::jsonb, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
