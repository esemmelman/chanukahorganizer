import { buildReport, buildTimeRows, positionLabel } from './report.mjs';
let timeRows = [];
const URL = 'https://fgomaujsdblpzxhnnqrg.supabase.co';
const KEY = 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
const login = document.querySelector('#login');
const report = document.querySelector('#report');
const status = document.querySelector('#status');
const SESSION_KEY = 'chanukah-organizer-session';
let session = null;
try {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
  if (saved?.token && saved.expiresAt > Date.now()) session = saved;
  else localStorage.removeItem(SESSION_KEY);
} catch { /* Storage may be unavailable. Keep access in memory. */ }
let passcode = null;
let accessVersion = 0;
function forgetAccess() {
  accessVersion++;
  passcode = null; session = null;
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
let busy = false;
function clearReport() {
  timeRows = [];
  report.hidden = true;
  for (const id of ['volunteers', 'openings', 'summary', 'updated']) document.getElementById(id).replaceChildren();
}
function cell(row, value) { const td = row.insertCell(); td.textContent = value; return td; }
function render(rows) {
  const data = buildReport(rows);
  timeRows = buildTimeRows(data.volunteers, data.items);
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
  if (busy || (!passcode && !session)) return;
  busy = true;
  const activeVersion = accessVersion;
  document.querySelector('#refresh').disabled = true;
  document.querySelector('#print').disabled = true;
  document.querySelector('#by-time').disabled = true;
  status.textContent = 'Loading volunteer report…';
  try {
    const response = await fetch(URL + '/functions/v1/chanukah-organizer-report', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(session ? { session: session.token } : { passcode }), cache: 'no-store' });
    if (accessVersion !== activeVersion) return;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { forgetAccess(); clearReport(); login.hidden = false; throw new Error('Please enter the passcode to unlock the report.'); }
      throw new Error('Unable to load the report. Please try again.');
    }
    const body = await response.json();
    if (accessVersion !== activeVersion) return;
    session = body.session;
    passcode = null;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    login.hidden = true;
    render(body.rows);
    status.textContent = '';
  } catch (error) { if (report.hidden) login.hidden = false; status.textContent = report.hidden ? error.message : error.message + ' The displayed report is from the previous refresh.'; }
  finally { busy = false; document.querySelector('#refresh').disabled = false; document.querySelector('#print').disabled = false; document.querySelector('#by-time').disabled = false; }
}
login.addEventListener('submit', async event => {
  event.preventDefault();
  const button = login.querySelector('button'); button.disabled = true;
  accessVersion++; session = null;
  passcode = new FormData(login).get('passcode');
  login.reset(); login.hidden = true;
  try { await refresh(); }
  finally { button.disabled = false; }

});
document.querySelector('#refresh').addEventListener('click', refresh);
document.querySelector('#print').addEventListener('click', () => window.print());
document.querySelector('#by-time').addEventListener('click', () => {
  try {
    const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    pdf.setFontSize(18);
    pdf.text('Chanukah volunteers by time', 36, 42);
    pdf.setFontSize(11);
    pdf.text(document.querySelector('#updated').textContent, 36, 60);
    pdf.autoTable({
      startY: 74,
      margin: { top: 36, right: 36, bottom: 36, left: 36 },
      head: [['Time', 'Activity', 'Name', 'Cell']],
      body: timeRows.length ? timeRows.map((row, index) => [
        index === 0 || row.time !== timeRows[index - 1].time ? row.time : '',
        row.activity, row.name, row.cell
      ]) : [[{ content: 'No volunteers have signed up yet.', colSpan: 4 }]],
      styles: { fontSize: 12, cellPadding: 7, overflow: 'linebreak' },
      headStyles: { fillColor: [82, 108, 70] },
      columnStyles: { 0: { cellWidth: 124 }, 1: { cellWidth: 156 }, 2: { cellWidth: 130 }, 3: { cellWidth: 130 } },
      rowPageBreak: 'avoid',
      didParseCell: data => {
        if (data.section === 'body' && timeRows.length) {
          const index = data.row.index;
          const startsGroup = index === 0 || timeRows[index].time !== timeRows[index - 1].time;
          if (startsGroup) {
            data.cell.styles.lineWidth = { top: 1, right: 0, bottom: 0, left: 0 };
            data.cell.styles.lineColor = [82, 108, 70];
          }
          if (data.column.index === 0) data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    pdf.save('chanukah-volunteers-by-time.pdf');
  } catch { status.textContent = 'Unable to create the PDF. Please reload and try again.'; }
});
document.querySelector('#logout').addEventListener('click', () => {
  forgetAccess(); clearReport(); login.hidden = false; status.textContent = 'Report locked.';
});

if (session) { login.hidden = true; refresh(); }
