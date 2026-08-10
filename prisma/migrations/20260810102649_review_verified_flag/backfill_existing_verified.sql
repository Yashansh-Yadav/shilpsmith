-- ONE-TIME BACKFILL — run once per database, immediately after migration.sql
-- and BEFORE deploying the code that introduces unverified reviews.
--
-- Why: until this change, /api/reviews rejected any submission whose email did
-- not match a qualifying order. So every review that already exists came from a
-- confirmed buyer and legitimately earned the badge. The new column defaults to
-- false, which would silently demote all of them on deploy.
--
-- Safe as a blanket UPDATE only because no unverified review can exist yet —
-- the code that can create one has not shipped. Do NOT re-run this afterwards:
-- once real unverified reviews exist it would forge badges for all of them.

UPDATE "Review" SET "verified" = true;
