import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listMedicines, listTakenDoses, setDoseTaken } from '../db/database';
import { addDays, toISODate } from '../lib/dates';
import { dosesOn, type Medicine, type TakenDose } from '../lib/medicines';

/** Medicines, plus doses taken in the last week. Reloads whenever the screen is focused. */
export function useMedicines() {
  const db = useSQLiteContext();
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [taken, setTaken] = useState<TakenDose[]>([]);

  const load = useCallback(async () => {
    const [m, t] = await Promise.all([
      listMedicines(db),
      listTakenDoses(db, toISODate(addDays(new Date(), -7))),
    ]);
    setMedicines(m);
    setTaken(t);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = useCallback(
    async (dose: TakenDose, isTaken: boolean) => {
      // Update the screen at once; the write follows.
      setTaken((t) =>
        isTaken
          ? [...t, dose]
          : t.filter(
              (d) => !(d.medicineId === dose.medicineId && d.date === dose.date && d.time === dose.time),
            ),
      );
      await setDoseTaken(db, dose, isTaken);
    },
    [db],
  );

  const today = medicines ? dosesOn(medicines, taken, new Date()) : [];
  return { medicines, taken, today, toggle, reload: load };
}
