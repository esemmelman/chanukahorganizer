const headers = { 'Access-Control-Allow-Origin': 'https://esemmelman.github.io', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export async function handle(request, env = name => Deno.env.get(name), fetcher = fetch) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const expected = env('CHANUKAH_ORGANIZER_PASSCODE');
  if (!expected) return reply({ error: 'Report unavailable' }, 503);
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Report unavailable' }, 503);
  let credentials;
  try { credentials = await request.json(); }
  catch { return reply({ error: 'Enter the organizer passcode.' }, 401); }
  if (!credentials || typeof credentials !== 'object') return reply({ error: 'Enter the organizer passcode.' }, 401);
  const signingKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key + ':' + expected), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const now = Date.now();
  let session;
  if (typeof credentials.session === 'string') {
    try {
      const [payload, signature, extra] = credentials.session.split('.');
      if (extra !== undefined) throw new Error('Invalid session');
      const valid = await crypto.subtle.verify('HMAC', signingKey, Uint8Array.from(atob(signature), c => c.charCodeAt(0)), new TextEncoder().encode(payload));
      const data = JSON.parse(atob(payload));
      if (!valid || data.scope !== 'chanukah-organizer' || !Number.isFinite(data.expiresAt) || data.expiresAt <= now || data.expiresAt > now + 30 * 86400000) throw new Error('Expired session');
      session = { token: credentials.session, expiresAt: data.expiresAt };
    } catch { return reply({ error: 'Passcode required.' }, 401); }
  } else {
    const passcode = credentials.passcode;
    if (typeof passcode !== 'string' || passcode.length > 256) return reply({ error: 'Incorrect passcode.' }, 401);
    const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
    const [actualHash, expectedHash] = await Promise.all([digest(passcode), digest(expected)]);
    let difference = 0;
    for (let i = 0; i < actualHash.length; i++) difference |= actualHash[i] ^ expectedHash[i];
    if (difference) return reply({ error: 'Incorrect passcode.' }, 401);
    const expiresAt = now + 30 * 86400000;
    const payload = btoa(JSON.stringify({ scope: 'chanukah-organizer', expiresAt, nonce: crypto.randomUUID() }));
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(payload)));
    session = { token: payload + '.' + btoa(String.fromCharCode(...signature)), expiresAt };
  }
  try {
    const response = await fetcher(url + '/rest/v1/chanukah_carnival_signups?select=slot,full_name,email,phone&order=slot', { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return reply({ error: 'Report unavailable' }, 502);
    return reply({ rows: await response.json(), session });
  } catch { return reply({ error: 'Report unavailable' }, 502); }
}
if (import.meta.main) Deno.serve(request => handle(request));
