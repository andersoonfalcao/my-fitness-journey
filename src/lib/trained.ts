import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { readCloudOnce } from "./cloud-store";
import { cardioKey, isCardio, type CardioRecord } from "./cardio";
import { today, useHistory } from "./store";
import { stravaKey, type StravaActivity } from "./strava";

const MONTHS = 6;

/**
 * Every date with training in the last six months: gym workouts plus the days with cardio (from Strava or started in
 * the app). The cardio months are read once per visit; what arrives while the screen is open shows on the next one.
 */
export function useTrainedDays(): string[] {
  const uid = useAuth().user?.uid;
  const [history] = useHistory();
  const [cardio, setCardio] = useState<string[]>([]);
  const month = today().slice(0, 7);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const months = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(`${month}-01T12:00:00`);
      d.setMonth(d.getMonth() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    });
    void Promise.all(months.map(async (m) => {
      const [strava, waiting] = await Promise.all([
        readCloudOnce<StravaActivity[]>(uid, stravaKey(m), []).catch((): StravaActivity[] => []),
        readCloudOnce<CardioRecord[]>(uid, cardioKey(m), []).catch((): CardioRecord[] => []),
      ]);
      return [...strava.filter(isCardio).map((a) => a.date), ...waiting.map((c) => c.date)];
    })).then((parts) => { if (alive) setCardio(parts.flat()); });
    return () => { alive = false; };
  }, [uid, month]);

  return useMemo(() => [...new Set([...history.map((r) => r.date), ...cardio])], [history, cardio]);
}
