import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { addDays, startOfLocalDay } from '../lib/dates';
import {
  nights,
  restingHeartSummary,
  sleepSummary,
  type HeartSummary,
  type SleepSummary,
} from '../lib/sleep';
import {
  getHealthConnectStatus,
  getWatchAccess,
  readRestingHeartRate,
  readSleepSessions,
  requestHealthConnectAccess,
} from './healthConnect';

type State = {
  access: { sleep: boolean; heart: boolean } | null;
  sleep: SleepSummary | null;
  heart: HeartSummary | null;
};

/** Last week of sleep and resting heart rate, when a watch provides them. Reloads on focus. */
export function useWatchData() {
  const [state, setState] = useState<State>({ access: null, sleep: null, heart: null });

  const load = useCallback(async () => {
    try {
      if ((await getHealthConnectStatus()) !== 'ready') return;
      const access = await getWatchAccess();
      const now = new Date();
      const from = addDays(startOfLocalDay(now), -8);
      const [sessions, heart] = await Promise.all([
        access.sleep ? readSleepSessions(from, now) : Promise.resolve([]),
        access.heart ? readRestingHeartRate(from, now) : Promise.resolve([]),
      ]);
      setState({
        access,
        sleep: access.sleep ? sleepSummary(nights(sessions), now) : null,
        heart: access.heart ? restingHeartSummary(heart, now) : null,
      });
    } catch {
      // Watch data is a nice extra: a failure here shouldn't disturb the rest of Today.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const allow = useCallback(async () => {
    await requestHealthConnectAccess();
    await load();
  }, [load]);

  return { ...state, reload: load, allow };
}
