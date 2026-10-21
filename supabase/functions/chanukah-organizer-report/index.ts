const headers = { 'Access-Control-Allow-Origin': 'https://esemmelman.github.io', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export async function handle(request, env = name => Deno.env.get(name), fetcher = fetch) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const expected = env('CHANUKAH_ORGANIZER_PASSCODE');
  if (!expected) return reply({ error: 'Report unavailable' }, 503);
  let passcode;
  try { ({ passcode } = await request.json()); }
  catch { return reply({ error: 'Enter the organizer passcode.' }, 401); }
  if (typeof passcode !== 'string' || passcode.length > 256) return reply({ error: 'Incorrect passcode.' }, 401);
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [actualHash, expectedHash] = await Promise.all([digest(passcode), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < actualHash.length; i++) difference |= actualHash[i] ^ expectedHash[i];
  if (difference) return reply({ error: 'Incorrect passcode.' }, 401);
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Report unavailable' }, 503);
  try {
    const response = await fetcher(url + '/rest/v1/chanukah_carnival_signups?select=slot,full_name,email,phone&order=slot', { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return reply({ error: 'Report unavailable' }, 502);
    return reply({ rows: await response.json() });
  } catch { return reply({ error: 'Report unavailable' }, 502); }
}
if (import.meta.main) Deno.serve(request => handle(request));
