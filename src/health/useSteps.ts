import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { calendarDaysBetween } from '../lib/dates';
import type { DailySteps } from '../lib/steps';
import {
  getHealthConnectStatus,
  hasFullAccess,
  readDailySteps,
  type HealthConnectStatus,
} from './healthConnect';

type State = {
  status: HealthConnectStatus | 'loading';
  days: DailySteps[];
  /** False without past-data access: Health Connect then hides steps older than ~30 days before access was granted. */
  fullAccess: boolean;
  error: string | null;
};

/** Daily step totals from 1 January this year to today (oldest first, today last). */
export function useSteps() {
  const [state, setState] = useState<State>({ status: 'loading', days: [], fullAccess: true, error: null });

  const load = useCallback(async () => {
    try {
      const status = await getHealthConnectStatus();
      if (status !== 'ready') {
        setState({ status, days: [], fullAccess: true, error: null });
        return;
      }
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const [days, fullAccess] = await Promise.all([
        readDailySteps(calendarDaysBetween(jan1, now) + 1, now),
        hasFullAccess(),
      ]);
      setState({ status, days, fullAccess, error: null });
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Could not read your steps.' }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  return { ...state, reload: load };
}
