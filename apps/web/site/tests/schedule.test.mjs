import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupWeekdays, formatTime } from '../src/lib/schedule.mjs';

const data = JSON.parse(readFileSync(new URL('../../../../operations/timetable.json', import.meta.url)));
test('the agreed five identical evenings group without allocating disciplines', () => {
  const groups = groupWeekdays(data.days);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, 'Monday—Friday');
  assert.deepEqual(groups[0].classes.map(({start,end}) => [start,end]), [['18:30','19:30'],['19:45','21:15']]);
  const weekends = data.days.filter(day => day.kind === 'weekend');
  assert.equal(weekends.length, 2);
  for (const day of weekends) assert.deepEqual([day.sessions[0].start,day.sessions[0].end], ['10:30',null]);
});
test('a later change to one day is displayed separately, never silently lost', () => {
  const days = structuredClone(data.days);
  days[1].sessions[0].end = '19:15';
  const groups = groupWeekdays(days);
  assert.deepEqual(groups.map(group => group.label), ['Monday','Tuesday','Wednesday—Friday']);
  assert.equal(groups[1].classes[0].end,'19:15');
});
test('UK-readable times distinguish noon, midnight and afternoon', () => {
  assert.equal(formatTime('00:30'),'12:30am');
  assert.equal(formatTime('12:00'),'12:00pm');
  assert.equal(formatTime('19:45'),'7:45pm');
});
