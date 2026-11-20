import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lucide } from "@react-native-vector-icons/lucide";

import { colors, borderRadius } from "../../config/theme";
import { FONTS } from "../../core/theme/fonts";

type IconName = React.ComponentProps<typeof Lucide>["name"];

interface NotiUButtonProps {
  title: string;
  onPress: () => void;
  // Opcionales (los usos anteriores siguen funcionando igual)
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  icon?: IconName;
}

// Botón de NotiU: degradado vino (primary) o con borde (outline)
export default function NotiUButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  icon,
}: NotiUButtonProps) {
  const inactive = disabled || loading;

  const content = loading ? (
    <ActivityIndicator color={colors.text} />
  ) : (
    <View style={styles.row}>
      {icon ? <Lucide name={icon} size={18} color={colors.text} /> : null}
      <Text style={styles.text}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      style={[styles.wrapper, inactive && styles.inactive]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryDark, colors.surfaceDark]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.button}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.button, styles.outline]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  inactive: {
    opacity: 0.6,
  },
  button: {
    minHeight: 50,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontFamily: FONTS.title,
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.5,
  },
});
