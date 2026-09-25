import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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

const DURATION = 220;
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * 可折叠分组。
 *
 * 折叠动画采用 Reanimated 官方 Accordion 示例的做法：
 * 先测量内容自然高度，再用 withTiming 同时动画「容器高度」与「内容透明度」。
 * 这样展开/收起是内容本身在生长收缩，而不是整块内容滑入滑出。
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

  /** 内容的自然高度；首次测量完成前高度为 0。 */
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  useEffect(() => {
    if (contentHeight === null) {
      return;
    }
    animatedHeight.value = withTiming(collapsed ? 0 : contentHeight, {
      duration: DURATION,
      easing: EASE,
    });
    animatedOpacity.value = withTiming(collapsed ? 0 : 1, {
      duration: collapsed ? DURATION * 0.6 : DURATION,
      easing: EASE,
    });
  }, [animatedHeight, animatedOpacity, collapsed, contentHeight]);

  const containerStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden',
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0 && height !== contentHeight) {
      setContentHeight(height);
    }
  };

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

      <Animated.View style={containerStyle}>
        {/* 内层始终渲染，用于测量真实高度并做透明度过渡。 */}
        <Animated.View style={[styles.body, bodyStyle]}>
          <View onLayout={handleLayout}>{children}</View>
        </Animated.View>
      </Animated.View>
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
