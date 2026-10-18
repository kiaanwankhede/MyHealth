import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getCurrentGoal } from '../db/database';
import { addDays } from '../lib/dates';
import {
  dailyAverages,
  goalProgress,
  trendSeries,
  type Goal,
  type GoalProgress,
  type TrendPoint,
} from '../lib/goal';
import {
  getHealthConnectStatus,
  hasFullAccess,
  readWeightHistory,
  requestHealthConnectAccess,
  type HealthConnectStatus,
} from './healthConnect';

/** Without a goal, the chart shows this many recent days. */
const HISTORY_DAYS = 90;
/** Extra history read before the visible range so the trend line starts settled. */
const TREND_WARMUP_DAYS = 30;

type State = {
  status: HealthConnectStatus | 'loading';
  goal: Goal | null;
  series: TrendPoint[];
  progress: GoalProgress | null;
  /** False when write (logging) or past-data access hasn't been granted. */
  fullAccess: boolean;
  error: string | null;
};

const initialState: State = {
  status: 'loading',
  goal: null,
  series: [],
  progress: null,
  fullAccess: true,
  error: null,
};

/** Current goal (from SQLite) plus weight history and trend (from Health Connect). Reloads on focus. */
export function useWeightGoal() {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>(initialState);

  const load = useCallback(async () => {
    try {
      const goal = await getCurrentGoal(db);
      const status = await getHealthConnectStatus();
      if (status !== 'ready') {
        setState({ ...initialState, status, goal });
        return;
      }
      const now = new Date();
      const recent = addDays(now, -HISTORY_DAYS);
      const visibleFrom = goal && goal.startDate < recent ? goal.startDate : recent;
      const [readings, fullAccess] = await Promise.all([
        readWeightHistory(addDays(visibleFrom, -TREND_WARMUP_DAYS), now),
        hasFullAccess(),
      ]);
      const series = trendSeries(dailyAverages(readings));
      setState({
        status,
        goal,
        series,
        progress: goal ? goalProgress(goal, series, now) : null,
        fullAccess,
        error: null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : 'Could not load your weight data.',
      }));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const connect = useCallback(async () => {
    try {
      await requestHealthConnectAccess();
    } finally {
      await load();
    }
  }, [load]);

  const latest = state.series.length > 0 ? state.series[state.series.length - 1] : null;
  return { ...state, latest, reload: load, connect };
}
