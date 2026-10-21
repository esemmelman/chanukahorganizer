# Chanukah organizer

Organizer report for the November 8th Chanukah Carnival. Reads the existing chanukahvolunteers signup data without changing signups.

Sign in with the existing Supabase organizer account, **esemmoc@gmail.com**, and its password. The report groups each volunteer's name, email address, cell, and assignments with times and named game booths or local position numbers. All 12 item/shift combinations (44 active positions) show filled counts, remaining counts, and open booth names or position numbers. Refresh retrieves current signups; Print / Save PDF produces a printable report.

Serve this directory with a static web server or GitHub Pages. There are no frontend dependencies or build steps. The deployed Edge Function allows browser requests from https://esemmelman.github.io.

## Privacy and backend

Contact data is fetched through `chanukah-organizer-report` in Supabase project `fgomaujsdblpzxhnnqrg`. The function validates the access token with Supabase Auth and checks the existing organizer's fixed user ID before using its server-only service role to read contacts. Public signup table permissions stay unchanged. Contact data and credentials are never committed to GitHub. The browser keeps the access token in memory only; reloading requires signing in again.

Deploy the function with JWT verification enabled using the included config. No schema changes are required. Tests: `node --test tests/*.test.mjs`.

Game booths match the seven named choices in chanukahvolunteers for each shift. Morning tickets have two positions. Retired booth slot IDs 29 and 37 remain visible as retired assignments if returned, but do not count toward active capacity or openings. Existing slot IDs are preserved.

Volunteer rows group by name and email, ignoring capitalization and extra name spacing. All assignments and distinct phone numbers are combined in that row.
