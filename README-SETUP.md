# Savor + Supabase setup (beginner-friendly)

This version uses **Supabase only** for authentication and bookings. Google Forms and the old Apps Script endpoint are not used by this version.

## A. Create your Supabase project

1. Go to https://supabase.com/ and sign in or create an account.
2. Select **New project**.
3. Choose an organization, enter a project name such as `savor-restaurant`, create a strong database password, and select a region near your customers (for example, India if available).
4. Wait for the project to finish provisioning.
5. In the project dashboard, open **Connect** or **Project Settings → API**. Copy the **Project URL** and the **publishable key** (or legacy `anon` key). These are the two browser settings needed below.

## B. Create the bookings table securely

1. In the Supabase dashboard, open **SQL Editor**.
2. Choose a new query.
3. Open `supabase-schema.sql` from this folder, copy all its contents into the SQL Editor, and run it.
4. The script creates `public.bookings`, enables Row Level Security (RLS), and adds policies so authenticated customers can create pending bookings and read only their own bookings. Customers cannot change a booking's status or delete records from the public website.

## C. Add your project's public browser settings

1. Open `supabase-config.js` in a code editor.
2. Replace `https://YOUR_PROJECT_ID.supabase.co` with your actual Project URL.
3. Replace `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY` with the project's publishable/anon key.
4. Save the file.

**Never** put a `service_role` key or any secret key in this file. The browser key is public by design; the RLS policies are what protect customer data.

## D. Configure email authentication

1. In Supabase, open **Authentication → Providers → Email** and ensure email/password sign-in is enabled.
2. In **Authentication → URL Configuration**, set the Site URL to the URL where the website will run. During local development, use the exact origin shown by your local server (for example `http://127.0.0.1:5500` if that's what Live Server uses). Add that origin under allowed redirect URLs. Later, add your deployed domain too.
3. Decide whether to require email confirmation. If enabled, new customers must click the confirmation email before signing in. Check the spam folder if the email does not arrive.

## E. Run the website locally

Keep these files together in one folder:

- `index.html`
- `style.css`
- `script.js`
- `supabase-config.js`
- `supabase-schema.sql` (setup file; not needed by the browser)

Open the folder in VS Code and start **Live Server** from `index.html`. Do not open the page with a `file://` URL. Internet access is needed for the Supabase JavaScript CDN and Supabase project.

## F. Test the complete flow

1. Open the site and scroll to **Book your table**.
2. Enter an email and a password of at least 6 characters, then select **Create account**.
3. If email confirmation is enabled, confirm the email, return to the site, and sign in.
4. Fill in the reservation fields and submit. The message should say that the request was saved and is pending; it must not say the table is confirmed.
5. Check **Supabase → Table Editor → bookings**. A new row should appear with `user_id`, date, time, guest count, and `pending` status.
6. Sign out, then create/sign in with a different account. The first customer's booking should not be visible to the second account.

## Troubleshooting

- **“Add your Supabase project URL…”**: the placeholders in `supabase-config.js` have not been replaced, or the config file did not load.
- **Invalid API key / network error**: check the Project URL and publishable/anon key, and verify internet access.
- **Email not received**: check spam and the email confirmation setting in Supabase.
- **Permission denied / RLS error**: rerun `supabase-schema.sql` in SQL Editor and verify that the user is signed in.
- **Booking table missing**: run the SQL setup script and check the Table Editor for `public.bookings`.

## Current scope and production notes

- Email/password registration and sign-in.
- Authenticated customers can create a reservation request and view their own reservation history.
- Every new booking starts as `pending`. This is a request, not a confirmed reservation.
- This starter does not include a restaurant-admin dashboard, email/SMS notifications, Google Sheets sync, cancellation UI, or conflict/capacity checking. Add an authorized server-side/admin workflow before operating this for real customers.
- Keep `supabase-schema.sql` as your setup script; never expose database passwords or service-role/secret keys.
