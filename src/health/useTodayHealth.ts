import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  getHealthConnectStatus,
  readLatestWeight,
  readStepsToday,
  requestHealthConnectAccess,
  type HealthConnectStatus,
  type WeightReading,
} from './healthConnect';

type State = {
  status: HealthConnectStatus | 'loading';
  steps: number | null;
  weight: WeightReading | null;
  error: string | null;
  refreshing: boolean;
};

const initialState: State = {
  status: 'loading',
  steps: null,
  weight: null,
  error: null,
  refreshing: false,
};

export function useTodayHealth() {
  const [state, setState] = useState<State>(initialState);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true, error: null }));
    try {
      const status = await getHealthConnectStatus();
      if (status !== 'ready') {
        setState({ ...initialState, status });
        return;
      }
      const now = new Date();
      const [steps, weight] = await Promise.all([readStepsToday(now), readLatestWeight(now)]);
      setState({ status, steps, weight, error: null, refreshing: false });
    } catch (e) {
      setState((s) => ({
        ...s,
        refreshing: false,
        error: e instanceof Error ? e.message : 'Could not read from Health Connect.',
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      await requestHealthConnectAccess();
    } finally {
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    // Re-read when the user comes back to the app (e.g. after walking, or after
    // changing permissions in Health Connect settings).
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { ...state, refresh, connect };
}
