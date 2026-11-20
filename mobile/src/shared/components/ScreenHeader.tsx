// Encabezado de las pantallas secundarias: botón volver, icono, título y subtítulo
// (mismo diseño que la pantalla de conectar Moodle).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lucide } from '@react-native-vector-icons/lucide';

import { colors } from '../../config/theme';
import { FONTS } from '../../core/theme/fonts';

type IconName = React.ComponentProps<typeof Lucide>['name'];

type Props = {
  title: string;
  subtitle?: string;
  icon: IconName;
  onBack?: () => void;
  // Elemento opcional a la derecha (p. ej. "Marcar todas como leídas")
  right?: React.ReactNode;
};

export default function ScreenHeader({ title, subtitle, icon, onBack, right }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Lucide name="arrow-left" size={21} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
        {right ?? <View style={styles.placeholder} />}
      </View>

      <View style={styles.icon}>
        <Lucide name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 22,
  },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 42,
    height: 42,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: colors.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
  },
});
