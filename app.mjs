import { buildReport, positionLabel } from './report.mjs';
const URL = 'https://fgomaujsdblpzxhnnqrg.supabase.co';
const KEY = 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
const login = document.querySelector('#login');
const report = document.querySelector('#report');
const status = document.querySelector('#status');
let passcode = null;
let busy = false;
function clearReport() {
  report.hidden = true;
  for (const id of ['volunteers', 'openings', 'summary', 'updated']) document.getElementById(id).replaceChildren();
}
function cell(row, value) { const td = row.insertCell(); td.textContent = value; return td; }
function render(rows) {
  const data = buildReport(rows);
  const volunteers = document.querySelector('#volunteers');
  const openings = document.querySelector('#openings');
  volunteers.replaceChildren(); openings.replaceChildren();
  for (const person of data.volunteers) {
    const tr = volunteers.insertRow();
    cell(tr, person.name); cell(tr, person.email); cell(tr, person.cell);
    const ul = document.createElement('ul');
    for (const assignment of person.assignments) { const li = document.createElement('li'); li.textContent = `${assignment.item} · ${assignment.time} · ${assignment.retired ? 'Retired position 8' : positionLabel(assignment.item, assignment.position)}`; ul.append(li); }
    cell(tr, '').append(ul);
  }
  if (!data.volunteers.length) { const td = cell(volunteers.insertRow(), 'No volunteers have signed up yet.'); td.colSpan = 4; }
  for (const item of data.items) {
    const tr = openings.insertRow();
    cell(tr, item.item); cell(tr, item.time); cell(tr, `${item.filled} / ${item.total}`); cell(tr, String(item.open.length)); cell(tr, item.open.length ? item.open.map(position => positionLabel(item.item, position)).join(', ') : 'All filled');
    if (!item.open.length) tr.classList.add('filled');
  }
  document.querySelector('#summary').textContent = `${data.volunteers.length} volunteers · ${data.filled} of ${data.total} positions filled · ${data.total - data.filled} still needed`;
  document.querySelector('#updated').textContent = 'Updated ' + new Date().toLocaleString();
  report.hidden = false;
}
async function refresh() {
  if (busy || !passcode) return;
  busy = true;
  const activePasscode = passcode;
  document.querySelector('#refresh').disabled = true;
  document.querySelector('#print').disabled = true;
  status.textContent = 'Loading volunteer report…';
  try {
    const response = await fetch(URL + '/functions/v1/chanukah-organizer-report', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode }), cache: 'no-store' });
    if (passcode !== activePasscode) return;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { passcode = null; clearReport(); login.hidden = false; throw new Error('Incorrect passcode. Please try again.'); }
      throw new Error('Unable to load the report. Please try again.');
    }
    const body = await response.json();
    if (passcode !== activePasscode) return;
    render(body.rows);
    status.textContent = '';
  } catch (error) { if (report.hidden) login.hidden = false; status.textContent = report.hidden ? error.message : error.message + ' The displayed report is from the previous refresh.'; }
  finally { busy = false; document.querySelector('#refresh').disabled = false; document.querySelector('#print').disabled = false; }
}
login.addEventListener('submit', async event => {
  event.preventDefault();
  const button = login.querySelector('button'); button.disabled = true;
  passcode = new FormData(login).get('passcode');
  login.reset(); login.hidden = true;
  try { await refresh(); }
  finally { button.disabled = false; }

});
document.querySelector('#refresh').addEventListener('click', refresh);
document.querySelector('#print').addEventListener('click', () => window.print());
document.querySelector('#logout').addEventListener('click', () => {
  passcode = null; clearReport(); login.hidden = false; status.textContent = 'Report locked.';
});
