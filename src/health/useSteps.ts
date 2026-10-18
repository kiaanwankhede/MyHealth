import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { DailySteps } from '../lib/steps';
import { getHealthConnectStatus, readDailySteps, type HealthConnectStatus } from './healthConnect';

/** Days of history read: the month chart, and how far back the retro goal can reach. */
export const STEP_HISTORY_DAYS = 30;

type State = { status: HealthConnectStatus | 'loading'; days: DailySteps[]; error: string | null };

/** Daily step totals for the last STEP_HISTORY_DAYS days (oldest first, today last). */
export function useSteps() {
  const [state, setState] = useState<State>({ status: 'loading', days: [], error: null });

  const load = useCallback(async () => {
    try {
      const status = await getHealthConnectStatus();
      if (status !== 'ready') {
        setState({ status, days: [], error: null });
        return;
      }
      setState({ status, days: await readDailySteps(STEP_HISTORY_DAYS), error: null });
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
