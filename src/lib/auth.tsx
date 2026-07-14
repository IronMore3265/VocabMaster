import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  /** True until the persisted session has been restored from storage. */
  initializing: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, initializing: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, initializing: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, initializing: false });
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, initializing: false });
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
