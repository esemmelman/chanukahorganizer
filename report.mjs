export const sections = [
  ['Set Up Game Booths', '8:00 AM - 10:00 AM', [1,2,3,4,5]],
  ['Food Prep', '9:00 AM - 11:00 AM', [6,7,8,9,10]],
  ['Food Service', '11:00 AM - 12:15 PM', [11,12,13,14,15]],
  ['Food Service', '12:15 PM - 1:30 PM', [16,17,18]],
  ['Food Clean Up', '1:30 PM - 2:30 PM', [19,20,21]],
  ['Game Booths', '11:00 AM - 12:15 PM', [22,23,24,25,26,27,28]],
  ['Game Booths', '12:15 PM - 1:30 PM', [30,31,32,33,34,35,36]],
  ['Prize Table', '11:00 AM - 12:15 PM', [38]],
  ['Prize Table', '12:15 PM - 1:30 PM', [44]],
  ['Tickets Table', '11:00 AM - 12:15 PM', [45,46]],
  ['Tickets Table', '12:15 PM - 1:30 PM', [39]],
  ['Break Down Booths', '1:30 PM - 2:30 PM', [40,41,42,43]]
];
export const boothNames = ['Football Toss', 'Bounce House', 'Bowling Pins', 'Bean Bag/Ring/Latke Toss', 'Dreidel Spin', 'Basketball Hoops', 'Other'];
export function positionLabel(item, position) {
  return item === 'Game Booths' ? boothNames[position - 1] : `Position ${position}`;
}
export function buildReport(rows) {
  const activeSlots = new Set(sections.flatMap(([, , slots]) => slots));
  const occupied = new Set(rows.filter(row => activeSlots.has(row.slot)).map(row => row.slot));
  const volunteers = new Map();
  for (const row of rows) {
    const retired = row.slot === 29 || row.slot === 37;
    const section = sections.find(([, , slots]) => slots.includes(row.slot)) || (retired ? ['Game Booths', row.slot === 29 ? sections[5][1] : sections[6][1], [row.slot]] : null);
    if (!section) throw new Error('Unknown signup position');
    const key = JSON.stringify([row.full_name.trim().replace(/\s+/g, ' ').toLowerCase(), row.email.trim().toLowerCase()]);
    if (!volunteers.has(key)) volunteers.set(key, { name: row.full_name.trim(), email: row.email.trim(), cell: '', phones: new Map(), assignments: [] });
    const person = volunteers.get(key);
    const phone = row.phone.trim();
    const digits = phone.replace(/\D/g, '');
    const phoneKey = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (phone && !person.phones.has(phoneKey)) person.phones.set(phoneKey, phone);
    person.cell = [...person.phones.values()].join(' / ');
    person.assignments.push({ item: section[0], time: section[1], position: retired ? 8 : section[2].indexOf(row.slot) + 1, retired });
  }
  return {
    volunteers: [...volunteers.values()].map(({ phones, ...person }) => person).sort((a, b) => a.name.localeCompare(b.name)),
    items: sections.map(([item, time, slots]) => ({ item, time, total: slots.length, filled: slots.filter(slot => occupied.has(slot)).length, open: slots.flatMap((slot, index) => occupied.has(slot) ? [] : [index + 1]) })),
    filled: occupied.size,
    total: sections.reduce((count, [, , slots]) => count + slots.length, 0)
  };
}
