import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useHabits } from '../state/HabitStore';

const SIZE = 76;

/** 右下角悬浮新建按钮；与页面上其它按钮保持一致的可点性。 */
export function FloatingAddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useHabits();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.button, { backgroundColor: theme.colors.primary }]}
    >
      <Text style={styles.plus}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 22,
    bottom: 104,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  plus: { color: '#FFFFFF', fontSize: 42, lineHeight: 46, fontWeight: '300' },
});
