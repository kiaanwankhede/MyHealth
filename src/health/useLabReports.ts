import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listLabReports } from '../db/database';
import type { LabReport } from '../lib/cholesterol';

/** All saved lab reports, newest first. Reloads whenever the screen is focused. */
export function useLabReports() {
  const db = useSQLiteContext();
  const [reports, setReports] = useState<LabReport[] | null>(null);

  const load = useCallback(async () => {
    setReports(await listLabReports(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { reports, reload: load };
}
