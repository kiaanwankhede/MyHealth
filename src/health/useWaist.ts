import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listWaist } from '../db/database';
import type { WaistEntry } from '../lib/body';

/** Saved waist measurements, newest first. Reloads whenever the screen is focused. */
export function useWaist() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<WaistEntry[] | null>(null);

  const load = useCallback(async () => {
    setEntries(await listWaist(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { entries, reload: load };
}
