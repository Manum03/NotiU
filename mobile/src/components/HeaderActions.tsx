import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Lucide } from '@react-native-vector-icons/lucide';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../config/firebase';
import { logout } from '../services/auth/authService';
import { useUnreadNotifications } from '../features/notifications/hooks/useUnreadNotifications';

const COLORS = {
  wine: '#800427',
  brightWine: '#AA0330',
  text: '#E9DDD3',
};

export default function HeaderActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Notificaciones sin leer (se actualiza al volver a la pantalla)
  const unread = useUnreadNotifications();

  // Muestra la cuenta activa y permite cerrar sesión
  const openProfileMenu = () => {
    const user = auth.currentUser;
    const who = user?.displayName || user?.email || 'Tu cuenta';

    Alert.alert(who, user?.email ?? undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Mi perfil', onPress: () => navigation.navigate('Profile') },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          } catch {
            Alert.alert('No se pudo cerrar sesión', 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => navigation.navigate('Notifications')}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
      >
        <Lucide name="bell" size={35} color={COLORS.brightWine} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={styles.avatar}
        onPress={openProfileMenu}
      >
        <Lucide name="user-round" size={20} color={COLORS.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
container: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 18,
  marginTop: -70,
  marginLeft: 10,
},

  // Contador de no leídas sobre la campana
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: COLORS.brightWine,
    borderWidth: 2,
    borderColor: '#10060A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 10,
    color: COLORS.text,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});