-- ============================================================================
-- Admin account management (run in the Neon SQL console)
-- ============================================================================
--
-- The app stores bcrypt hashes, never plain text. crypt() + gen_salt('bf', 12)
-- produces a hash that the app's bcryptjs accepts (verified: pgcrypto emits
-- $2a$ hashes, which bcryptjs reads fine).
--
-- WARNING: whatever you type here is saved in the Neon console's query history.
-- Clear it afterwards, or accept that your admin password is recorded there.
--
-- Table/column names are quoted because they're capitalized in Postgres.
-- ============================================================================


-- Required once per database. Provides crypt() and gen_salt().
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ----------------------------------------------------------------------------
-- 1. LIST existing admins (safe, read-only — start here)
-- ----------------------------------------------------------------------------
SELECT id, email, name, role, "createdAt"
FROM "Admin"
ORDER BY id;


-- ----------------------------------------------------------------------------
-- 2. CHANGE an existing admin's password
-- ----------------------------------------------------------------------------
-- Replace both the password and the email before running.
UPDATE "Admin"
SET password    = crypt('REPLACE-WITH-NEW-PASSWORD', gen_salt('bf', 12)),
    "updatedAt" = NOW()
WHERE email = 'admin@shilpsmith.com';


-- ----------------------------------------------------------------------------
-- 3. ADD a new SUPER_ADMIN
-- ----------------------------------------------------------------------------
-- Notes on why each column is here:
--   id          — omitted; it's a serial, Postgres assigns it
--   createdAt   — omitted; defaults to CURRENT_TIMESTAMP
--   "updatedAt" — REQUIRED. It's NOT NULL with no database default (Prisma
--                 normally fills it client-side), so raw SQL must pass it or
--                 the insert fails.
--   role        — REQUIRED for a super admin. The column defaults to 'ADMIN',
--                 so leaving it out silently creates a lesser account.
INSERT INTO "Admin" (email, password, name, role, "updatedAt")
VALUES (
  'you@yourdomain.com',
  crypt('REPLACE-WITH-A-STRONG-PASSWORD', gen_salt('bf', 12)),
  'Your Name',
  'SUPER_ADMIN',
  NOW()
);

-- If the email already exists this errors (email is UNIQUE). To create-or-update
-- in one go instead:
--
-- INSERT INTO "Admin" (email, password, name, role, "updatedAt")
-- VALUES ('you@yourdomain.com',
--         crypt('REPLACE-WITH-A-STRONG-PASSWORD', gen_salt('bf', 12)),
--         'Your Name', 'SUPER_ADMIN', NOW())
-- ON CONFLICT (email) DO UPDATE
--   SET password = EXCLUDED.password,
--       role = EXCLUDED.role,
--       "updatedAt" = NOW();


-- ----------------------------------------------------------------------------
-- 4. DELETE the old demo admin (do this only AFTER your new account works)
-- ----------------------------------------------------------------------------
-- Sign in with the new account first. Don't lock yourself out.
-- DELETE FROM "Admin" WHERE email = 'admin@shilpsmith.com';


-- ----------------------------------------------------------------------------
-- 5. VERIFY the password actually hashed
-- ----------------------------------------------------------------------------
-- Expect hash_prefix = '$2a$12$' and len = 60.
-- If you see your plain password here, it did NOT hash and login will fail.
SELECT email,
       left(password, 7) AS hash_prefix,
       length(password)  AS len,
       role
FROM "Admin"
ORDER BY id;


-- ----------------------------------------------------------------------------
-- 6. Check a password without logging in (optional)
-- ----------------------------------------------------------------------------
-- Returns true if the password matches the stored hash.
-- SELECT (password = crypt('THE-PASSWORD-TO-TEST', password)) AS matches
-- FROM "Admin" WHERE email = 'admin@shilpsmith.com';
