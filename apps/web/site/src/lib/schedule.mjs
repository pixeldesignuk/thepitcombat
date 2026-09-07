export function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour < 12 ? 'am' : 'pm'}`;
}

// Only combine adjacent days whose complete sessions match. A changed Tuesday
// must never inherit Monday's times just because both are weekdays.
export function groupWeekdays(days) {
  const groups = [];
  for (const day of days.filter(day => day.kind === 'weekday')) {
    const key = JSON.stringify(day.sessions);
    const last = groups.at(-1);
    if (last?.key === key) last.days.push(day.day);
    else groups.push({ key, days: [day.day], sessions: day.sessions });
  }
  return groups.map(group => ({
    ...group,
    label: group.days.length === 1 ? group.days[0] : `${group.days[0]}—${group.days.at(-1)}`,
    classes: group.sessions.filter(session => session.kind === 'class'),
  }));
}
