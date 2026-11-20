// Escucha la sesión de Firebase (onAuthStateChanged).
// `initializing` es true mientras Firebase recupera la sesión guardada al abrir la app.
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { subscribeToAuthChanges } from '../../../services/auth/authService';

type AuthState = {
  user: User | null;
  initializing: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, initializing: true });

  useEffect(
    () => subscribeToAuthChanges((user) => setState({ user, initializing: false })),
    []
  );

  return state;
}
