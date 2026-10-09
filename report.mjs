export const sections = [
  ['Set Up Game Booths', '8:00 AM - 10:00 AM', [1,2,3,4,5]],
  ['Food Prep', '9:00 AM - 11:00 AM', [6,7,8,9,10]],
  ['Food Service', '11:00 AM - 12:15 PM', [11,12,13,14,15]],
  ['Food Service', '12:15 PM - 1:30 PM', [16,17,18]],
  ['Food Clean Up', '1:30 PM - 2:30 PM', [19,20,21]],
  ['Game Booths', '11:00 AM - 12:15 PM', [22,23,24,25,26,27,28,29]],
  ['Game Booths', '12:15 PM - 1:30 PM', [30,31,32,33,34,35,36,37]],
  ['Prize Table', '11:00 AM - 12:15 PM', [38]],
  ['Prize Table', '12:15 PM - 1:30 PM', [44]],
  ['Tickets Table', '11:00 AM - 12:15 PM', [45]],
  ['Tickets Table', '12:15 PM - 1:30 PM', [39]],
  ['Break Down Booths', '1:30 PM - 2:30 PM', [40,41,42,43]]
];
export function buildReport(rows) {
  const occupied = new Set(rows.map(row => row.slot));
  const volunteers = new Map();
  for (const row of rows) {
    const section = sections.find(([, , slots]) => slots.includes(row.slot));
    if (!section) throw new Error('Unknown signup position');
    const key = JSON.stringify([row.full_name.trim(), row.email.trim().toLowerCase(), row.phone.replace(/\D/g, '')]);
    if (!volunteers.has(key)) volunteers.set(key, { name: row.full_name, email: row.email, cell: row.phone, assignments: [] });
    volunteers.get(key).assignments.push({ item: section[0], time: section[1], position: section[2].indexOf(row.slot) + 1 });
  }
  return {
    volunteers: [...volunteers.values()].sort((a, b) => a.name.localeCompare(b.name)),
    items: sections.map(([item, time, slots]) => ({ item, time, total: slots.length, filled: slots.filter(slot => occupied.has(slot)).length, open: slots.flatMap((slot, index) => occupied.has(slot) ? [] : [index + 1]) })),
    filled: occupied.size,
    total: sections.reduce((count, [, , slots]) => count + slots.length, 0)
  };
}
