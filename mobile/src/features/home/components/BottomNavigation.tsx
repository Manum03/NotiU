
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Lucide } from '@react-native-vector-icons/lucide';

type Props = {
  activeScreen: 'Home' | 'Subjects';
  onHome: () => void;
  onSubjects: () => void;
};

const COLORS = {
  wine: '#800427',
  brightWine: '#AA0330',
  text: '#E9DDD3',
  white: '#FFFFFF',
};

export default function BottomNavigation({
  activeScreen,
  onHome,
  onSubjects,
}: Props) {
  return (
    <View style={styles.bottomBar}>
      <Pressable style={styles.navItem}>
        <Lucide name="lightbulb" size={24} color={COLORS.text} />
      </Pressable>

      <Pressable style={styles.navItem}>
        <Lucide name="notebook-pen" size={24} color={COLORS.text} />
      </Pressable>

      <Pressable
        style={[
          styles.navItem,
          activeScreen === 'Home' && styles.activeNavItem,
        ]}
        onPress={onHome}
      >
        <Lucide
          name="house"
          size={26}
          color={activeScreen === 'Home' ? COLORS.white : COLORS.text}
        />
      </Pressable>

      <Pressable
        style={[
          styles.navItem,
          activeScreen === 'Subjects' && styles.activeNavItem,
        ]}
        onPress={onSubjects}
      >
        <Lucide
          name="book-open"
          size={24}
          color={activeScreen === 'Subjects' ? COLORS.white : COLORS.text}
        />
      </Pressable>

      <Pressable style={styles.navItem}>
        <Lucide name="user-round" size={24} color={COLORS.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 19,
    left: 20,
    right: 20,
    height: 69,
    borderRadius: 24,
    backgroundColor: COLORS.wine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 10,
    borderWidth: 1,
    borderColor: '#9A1640',
  },
  navItem: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: COLORS.brightWine,
  },
});
