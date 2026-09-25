import { PropsWithChildren, useMemo } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { useHabits } from '../state/HabitStore';

// Android 需要显式开启 LayoutAnimation（官方文档要求）。
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccordionSectionProps = {
  title: string;
  /** 右侧次要说明，例如“3 项”“0/8”。 */
  meta?: string;
  collapsed: boolean;
  onToggle: () => void;
  danger?: boolean;
  accessibilityLabel?: string;
};

/**
 * 可折叠分组。
 *
 * 折叠动画用 React Native 内置的 LayoutAnimation：
 * 它专门用于「视图层级或尺寸发生变化」的场景，会在下一次布局时自动插入过渡，
 * 不需要手动测量内容高度，因此不会出现「测量到 0 后内容再也显示不出来」的问题。
 */
export function AccordionSection({
  title,
  meta,
  collapsed,
  onToggle,
  danger = false,
  accessibilityLabel,
  children,
}: PropsWithChildren<AccordionSectionProps>) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleToggle = () => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    onToggle();
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `折叠${title}`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={handleToggle}
        style={styles.header}
      >
        <Text style={[styles.title, danger && styles.dangerTitle]}>{title}</Text>
        <View style={styles.headerRight}>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          <Text style={styles.chevron}>{collapsed ? '展开' : '收起'}</Text>
        </View>
      </TouchableOpacity>

      {collapsed ? null : <View style={styles.body}>{children}</View>}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    section: { gap: 10 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 3,
      gap: 12,
    },
    title: { flexShrink: 1, fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    dangerTitle: { color: theme.colors.danger },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    meta: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
    chevron: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    body: { gap: 10 },
  });
}
