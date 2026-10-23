-- Run this in Supabase Dashboard > SQL Editor.
-- Booking rows are private to the authenticated customer who created them.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  phone text not null,
  booking_date date not null,
  booking_time text not null,
  guests text not null,
  requests text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_id_created_at_idx
  on public.bookings (user_id, created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "Customers can read their own bookings" on public.bookings;
create policy "Customers can read their own bookings"
  on public.bookings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Customers can create their own bookings" on public.bookings;
create policy "Customers can create their own bookings"
  on public.bookings for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and booking_date >= current_date
  );

-- Intentionally no UPDATE or DELETE policy for customers. This prevents a customer
-- from changing a pending booking to confirmed/cancelled through the public client.
-- Manage status changes from a trusted admin/server workflow.
