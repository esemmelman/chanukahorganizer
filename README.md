# Chanukah organizer

Organizer report for the November 8th Chanukah Carnival. Reads the existing chanukahvolunteers signup data without changing signups.

Sign in with the existing Supabase organizer account, **esemmoc@gmail.com**, and its password. The report groups each volunteer's name, email address, cell, and assignments with times and local position numbers. All 12 item/shift combinations show filled counts, remaining counts, and open position numbers. Refresh retrieves current signups; Print / Save PDF produces a printable report.

Serve this directory with a static web server or GitHub Pages. There are no frontend dependencies or build steps. The deployed Edge Function allows browser requests from https://esemmelman.github.io.

## Privacy and backend

Contact data is fetched through `chanukah-organizer-report` in Supabase project `fgomaujsdblpzxhnnqrg`. The function validates the access token with Supabase Auth and checks the existing organizer's fixed user ID before using its server-only service role to read contacts. Public signup table permissions stay unchanged. Contact data and credentials are never committed to GitHub. The browser keeps the access token in memory only; reloading requires signing in again.

Deploy the function with JWT verification enabled using the included config. No schema changes are required. Tests: `node --test tests/*.test.mjs`.
