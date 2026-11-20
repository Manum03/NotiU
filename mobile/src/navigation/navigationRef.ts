// Referencia al contenedor de navegación para navegar desde fuera de las pantallas
// (por ejemplo, al tocar una notificación push o cuando se cierra la sesión).
import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
