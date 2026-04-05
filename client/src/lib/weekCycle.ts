import dayjs from 'dayjs';

/**
 * Returns the start (Thursday 00:00) and end (Wednesday 18:00)
 * of the current weekly cycle.
 *
 * Cycle: Thursday 00:00 → Wednesday 18:00
 */
export function getCurrentWeekWindow(): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const now = dayjs();
  const dayOfWeek = now.day(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat

  // Days since last Thursday
  // Thu=0, Fri=1, Sat=2, Sun=3, Mon=4, Tue=5, Wed=6
  const daysSinceThursday = (dayOfWeek + 3) % 7;

  const start = now.subtract(daysSinceThursday, 'day').startOf('day');
  const end = start.add(6, 'day').hour(18).minute(0).second(0).millisecond(0);

  return { start, end };
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the Thursday of the current cycle.
 * Used as the week_start key in leave_requests.
 */
export function getCurrentWeekStart(): string {
  return getCurrentWeekWindow().start.format('YYYY-MM-DD');
}

/**
 * Returns the last N week windows (newest first).
 */
export function getPastWeekWindows(n: number): { start: dayjs.Dayjs; end: dayjs.Dayjs }[] {
  const windows: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
  const current = getCurrentWeekWindow();

  for (let i = 0; i < n; i++) {
    const start = current.start.subtract(i * 7, 'day');
    const end = start.add(6, 'day').hour(18).minute(0).second(0).millisecond(0);
    windows.push({ start, end });
  }

  return windows;
}
