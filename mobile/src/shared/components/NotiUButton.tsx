
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { colors, borderRadius } from "../../config/theme";

interface NotiUButtonProps {
  title: string;
  onPress: () => void;
}

export default function NotiUButton({
  title,
  onPress,
}: NotiUButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
