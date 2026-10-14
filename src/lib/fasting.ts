/** Intermittent fasting: the fast in progress and the finished ones. */
export type Fast = { startedAt: number; goalH: number };
export type FastRecord = { startedAt: number; endedAt: number; goalH: number };

export const FAST_GOALS = [12, 14, 16, 18] as const;

/** Hours and minutes ("14h05") of a duration in milliseconds. */
export function hoursLabel(ms: number) {
  const min = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

/** Start time for "comecei às HH:MM": today at that time, or yesterday when that time hasn't come yet today. */
export function startFromClock(hhmm: string, now = Date.now()) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  if (d.getTime() > now) d.setDate(d.getDate() - 1);
  return d.getTime();
}
