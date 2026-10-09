const ORGANIZER_ID = 'bdfe3c81-3e96-4928-aa91-dc4ebabb7e87';
const headers = { 'Access-Control-Allow-Origin': 'https://esemmelman.github.io', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export async function handle(request, env = name => Deno.env.get(name), fetcher = fetch) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Sign in required' }, 401);
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Report unavailable' }, 503);
  try {
    // Validate against Auth, then authorize the fixed organizer identity before reading contacts.
    const userResponse = await fetcher(url + '/auth/v1/user', { headers: { apikey: key, Authorization: authorization }, signal: AbortSignal.timeout(10000) });
    if (!userResponse.ok) return reply({ error: 'Sign in required' }, 401);
    const user = await userResponse.json();
    if (user.id !== ORGANIZER_ID) return reply({ error: 'Organizer access required' }, 403);
    const response = await fetcher(url + '/rest/v1/chanukah_carnival_signups?select=slot,full_name,email,phone&order=slot', { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return reply({ error: 'Report unavailable' }, 502);
    return reply({ rows: await response.json() });
  } catch { return reply({ error: 'Report unavailable' }, 502); }
}
if (import.meta.main) Deno.serve(request => handle(request));
