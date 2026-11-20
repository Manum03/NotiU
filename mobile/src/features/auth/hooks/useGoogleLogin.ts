// "Continuar con Google" reutilizable (Bienvenida, Login y Registro).
import { useState } from 'react';
import { Alert } from 'react-native';

import { getAuthErrorMessage, loginWithGoogle } from '../../../services/auth/authService';

export function useGoogleLogin(onSuccess: () => void) {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (loading) return;
    try {
      setLoading(true);
      // null = el estudiante cerró la ventana de Google: no se muestra error
      const user = await loginWithGoogle();
      if (user) onSuccess();
    } catch (error: unknown) {
      console.error('Error al continuar con Google:', error);
      Alert.alert('No se pudo continuar con Google', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return { loading, signIn };
}
