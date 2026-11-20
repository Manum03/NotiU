// Perfil: datos de la cuenta, ajustes de recordatorios y notificaciones,
// accesos a Conexiones y Notificaciones, y cierre de sesión.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest } from '../../../services/api/api';
import { logout, type BackendUser } from '../../../services/auth/authService';
import { colors } from '../../../config/theme';
import { FONTS } from '../../../core/theme/fonts';
import NotiUButton from '../../../shared/components/NotiUButton';
import BottomNavigation from '../../home/components/BottomNavigation';
import type { SettingsDto } from '../../../models/settings';
import ReminderSettings from '../components/ReminderSettings';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, current] = await Promise.all([
        apiRequest<BackendUser>('/auth/me', { method: 'GET' }),
        apiRequest<SettingsDto>('/settings', { method: 'GET' }),
      ]);
      setUser(me);
      setSettings(current);
    } catch (err) {
      Alert.alert('No se pudo cargar tu perfil', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          } catch {
            setLoggingOut(false);
            Alert.alert('No se pudo cerrar sesión', 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  const initial = (user?.name || user?.email || 'N').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.pageTitle}>
          MI <Text style={{ color: colors.primary }}>PERFIL</Text>
        </Text>
        <Text style={styles.pageSubtitle}>Administra tu cuenta y tus avisos.</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* CUENTA */}
            <View style={styles.accountCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {user?.name || 'Estudiante'}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {/* RECORDATORIOS Y PUSH */}
            {settings && <ReminderSettings settings={settings} onChange={setSettings} />}

            {/* ACCESOS */}
            <View style={styles.menuCard}>
              <MenuRow
                icon="link"
                title="Conexiones"
                subtitle="Moodle y Google Classroom"
                onPress={() => navigation.navigate('Integrations')}
              />
              <View style={styles.divider} />
              <MenuRow
                icon="bell"
                title="Notificaciones"
                subtitle="Historial de avisos"
                onPress={() => navigation.navigate('Notifications')}
              />
            </View>

            <NotiUButton
              title="cerrar sesión"
              icon="log-out"
              variant="outline"
              loading={loggingOut}
              onPress={confirmLogout}
            />
          </>
        )}
      </ScrollView>

      <BottomNavigation
        activeScreen="Profile"
        onHome={() => navigation.navigate('Home')}
        onSubjects={() => navigation.navigate('Subjects')}
        onTasks={() => navigation.navigate('Tasks')}
      />
    </View>
  );
}

type MenuRowProps = {
  icon: 'link' | 'bell';
  title: string;
  subtitle: string;
  onPress: () => void;
};

function MenuRow({ icon, title, subtitle, onPress }: MenuRowProps) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.menuIcon}>
        <Lucide name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Lucide name="chevron-right" size={20} color={colors.soft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 62,
    paddingHorizontal: 22,
    // espacio para la barra inferior
    paddingBottom: 120,
  },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: 42,
    color: colors.text,
    letterSpacing: 1,
  },
  pageSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.title,
    fontSize: 30,
    color: colors.text,
  },
  name: {
    fontFamily: FONTS.title,
    fontSize: 26,
    color: colors.text,
  },
  email: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: colors.muted,
  },
  menuCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 18,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: colors.text,
  },
  menuSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
