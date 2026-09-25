import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LIST_LAYOUT } from '../theme/animation';
import { useHabits } from '../state/HabitStore';

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
 * 折叠动画与列表条目统一使用 Reanimated 的 LinearTransition：
 * 内容挂载/卸载时由布局动画负责尺寸过渡，避免同时使用 RN 的 LayoutAnimation
 * 与 Reanimated 两套系统造成「外层瞬间跳变、内层缓慢移动」的不一致观感。
 * 不手动测量高度，因此不会出现「测量到 0 后内容再也显示不出来」的问题。
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

  return (
    <View style={styles.section}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `折叠${title}`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggle}
        style={styles.header}
      >
        <Text style={[styles.title, danger && styles.dangerTitle]}>{title}</Text>
        <View style={styles.headerRight}>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          <Text style={styles.chevron}>{collapsed ? '展开' : '收起'}</Text>
        </View>
      </TouchableOpacity>

      {/* 与列表条目同一套布局动画：展开/收起时内容平滑生长收缩，不再瞬间跳变。 */}
      {collapsed ? null : (
        <Animated.View layout={LIST_LAYOUT} style={styles.body}>
          {children}
        </Animated.View>
      )}
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
