import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEFAULT_PROFILE, type Profile } from '../lib/profile';
import { getProfile, saveProfile } from './database';

type ProfileState = {
  profile: Profile;
  save: (profile: Profile) => Promise<void>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

/** Loads the profile once and shares it, so a change in Me shows everywhere at once. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  const reload = useCallback(async () => setProfile(await getProfile(db)), [db]);
  const save = useCallback(
    async (next: Profile) => {
      await saveProfile(db, next);
      setProfile(next);
    },
    [db],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return <ProfileContext.Provider value={{ profile, save, reload }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const state = useContext(ProfileContext);
  if (!state) throw new Error('useProfile must be used inside ProfileProvider');
  return state;
}
