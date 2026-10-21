import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReport, sections, boothNames, positionLabel } from '../report.mjs';
import { handle } from '../supabase/functions/chanukah-organizer-report/index.ts';
const env = key => ({ SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'secret' })[key];
const request = token => new Request('https://example.com', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
test('report slot mappings match all current signup headings and local positions', { skip: !fs.existsSync('../chanukahvolunteers/index.html') }, () => {
  const html = fs.readFileSync('../chanukahvolunteers/index.html', 'utf8');
  const fields = [...html.matchAll(/<fieldset><legend>(.*?)<\/legend>([\s\S]*?)<\/fieldset>/g)];
  assert.equal(fields.length, sections.length);
  fields.forEach(([ , legend, body], index) => {
    assert.equal(legend.replace(/\s+/g, ' '), `${sections[index][0]} ${sections[index][1]}`);
    assert.deepEqual([...body.matchAll(/name="slot" value="(\d+)"/g)].map(match => Number(match[1])), sections[index][2]);
    if (sections[index][0] === 'Game Booths') {
      assert.deepEqual([...body.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]), boothNames);
    }
  });
});
test('empty and full reports account for every position', () => {
  assert.deepEqual(sections.flatMap(([, , slots]) => slots).sort((a, b) => a - b), Array.from({ length: 46 }, (_, index) => index + 1).filter(slot => slot !== 29 && slot !== 37));
  const empty = buildReport([]);
  assert.equal(empty.total, 44); assert.equal(empty.filled, 0); assert.equal(empty.items.length, 12);
  const rows = sections.flatMap(([, , slots]) => slots.map(slot => ({ slot, full_name: 'A', email: 'a@example.com', phone: '5551234567' })));
  const full = buildReport(rows);
  assert.equal(full.filled, 44); assert.equal(full.volunteers.length, 1);
  assert.ok(full.items.every(item => item.open.length === 0));
});
test('multiple submissions group by contact identity and use local row numbers', () => {
  const report = buildReport([38,44,45,43].map(slot => ({ slot, full_name: 'A', email: 'a@example.com', phone: '5551234567' })));
  assert.equal(report.volunteers.length, 1);
  assert.deepEqual(report.volunteers[0].assignments.map(a => a.position), [1,1,1,4]);
  assert.deepEqual(report.items.at(-1).open, [1,2,3]);
  const distinct = buildReport([{ slot: 1, full_name: 'A', email: 'a@example.com', phone: '5551234567' }, { slot: 2, full_name: 'A', email: 'b@example.com', phone: '5551234567' }]);
  assert.equal(distinct.volunteers.length, 2);
});
test('missing and invalid tokens cannot read contacts', async () => {
  const missing = await handle(request(), env, () => { throw new Error('must not fetch'); });
  assert.equal(missing.status, 401);
  let calls = 0;
  const invalid = await handle(request('invalid'), env, async () => { calls++; return new Response(null, { status: 401 }); });
  assert.equal(invalid.status, 401); assert.equal(calls, 1);
});
test('another authenticated user cannot read contacts', async () => {
  let calls = 0;
  const response = await handle(request('other-user'), env, async () => { calls++; return Response.json({ id: 'other-id', user_metadata: { organizer: true } }); });
  assert.equal(response.status, 403); assert.equal(calls, 1);
});
test('organizer receives only requested report columns after authorization', async () => {
  let calls = 0;
  const rows = [{ slot: 1, full_name: 'A', email: 'a@example.com', phone: '5551234567' }];
  const response = await handle(request('organizer'), env, async (url, options) => {
    calls++;
    if (calls === 1) { assert.equal(options.headers.Authorization, 'Bearer organizer'); return Response.json({ id: 'bdfe3c81-3e96-4928-aa91-dc4ebabb7e87' }); }
    assert.match(url, /select=slot,full_name,email,phone&order=slot$/);
    assert.equal(options.headers.Authorization, 'Bearer secret');
    return Response.json(rows);
  });
  assert.deepEqual(await response.json(), { rows }); assert.equal(calls, 2);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('backend failures return no data', async () => {
  const response = await handle(request('organizer'), env, async () => { throw new Error('private details'); });
  assert.equal(response.status, 502); assert.deepEqual(await response.json(), { error: 'Report unavailable' });
});

test('named booths, added ticket position, and retired signups retain correct assignments', () => {
  const report = buildReport([22,28,30,36,46,29,37].map(slot => ({ slot, full_name: 'A', email: 'a@example.com', phone: '5551234567' })));
  assert.equal(report.total, 44);
  assert.equal(report.filled, 5);
  const assignments = report.volunteers[0].assignments;
  assert.deepEqual(assignments.slice(0, 5).map(a => positionLabel(a.item, a.position)), ['Football Toss', 'Other', 'Football Toss', 'Other', 'Position 2']);
  assert.ok(assignments.slice(5).every(a => a.retired && a.position === 8));
  assert.deepEqual(report.items[5].open.map(p => positionLabel('Game Booths', p)), boothNames.slice(1, 6));
  assert.deepEqual(report.items[9].open, [1]);
});
