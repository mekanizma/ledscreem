-- Promote a user to admin after creating them in Auth
-- Replace the email with your admin account

update public.profiles
set role = 'admin',
    full_name = coalesce(full_name, 'Sistem Yöneticisi')
where email = 'admin@example.com';
