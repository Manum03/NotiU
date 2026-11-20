// Conectar Google Classroom: Google Sign-In con permisos de solo lectura de Classroom
// y envío del serverAuthCode al backend (POST /integrations/classroom), que lo cambia
// por un refresh token y sincroniza las tareas.
import { useState } from 'react';

import type { ConnectResponse } from '../../../models/integration';
import { apiRequest } from '../../../services/api/api';
import { loadGoogleSignIn } from '../../../services/auth/googleSignIn';

// Abre Google y devuelve el serverAuthCode (null si el estudiante canceló)
async function requestServerAuthCode(forceCode: boolean): Promise<string | null | undefined> {
  const { GoogleSignin, isSuccessResponse } = await loadGoogleSignIn({ classroom: true, forceCode });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  return response.data.serverAuthCode ?? undefined;
}

export function useClassroomConnect() {
  const [connecting, setConnecting] = useState(false);

  // Devuelve la respuesta del backend o null si el estudiante canceló
  const connect = async (): Promise<ConnectResponse | null> => {
    setConnecting(true);
    try {
      let code = await requestServerAuthCode(false);
      if (code === null) return null;

      // Si Google no entregó el código (ya había una sesión), se cierra la sesión de
      // Google y se repite pidiendo un código nuevo (forceCodeForRefreshToken en Android)
      if (!code) {
        const { GoogleSignin } = await loadGoogleSignIn({ classroom: true });
        await GoogleSignin.signOut();
        code = await requestServerAuthCode(true);
        if (code === null) return null;
      }
      if (!code) {
        throw new Error('Google no entregó el código de autorización. Inténtalo de nuevo.');
      }

      return await apiRequest<ConnectResponse>('/integrations/classroom', {
        method: 'POST',
        body: JSON.stringify({ serverAuthCode: code }),
      });
    } finally {
      setConnecting(false);
    }
  };

  return { connect, connecting };
}
