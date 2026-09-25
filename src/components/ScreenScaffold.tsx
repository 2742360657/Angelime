import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Drawer as SideDrawer } from 'react-native-drawer-layout';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';

import { useBackHandler } from '../navigation/back';
import type { NavigationTarget, PanelItem } from '../navigation/types';
import { SCREEN_ENTERING } from '../theme/animation';
import { useHabits } from '../state/HabitStore';
import { FloatingAddButton } from './FloatingAddButton';
import { ProfileBar } from './ProfileBar';

export type ScreenScaffoldProps = {
  /** 右侧页面操作栏标题。 */
  panelTitle: string;
  panelItems: PanelItem[];
  /** 悬浮新建按钮；传 null / 不传则不渲染。 */
  fab?: { label: string; onPress: () => void } | null;
  children: ReactNode;
};

/**
 * 页面脚手架，负责页面级的公共结构。
 *
 * 层级（自上而下）：
 *   1. 资料条（固定，点击进入设置）
 *   2. 右侧页面操作栏 —— react-native-drawer-layout，即 React Navigation 抽屉的
 *      底层实现。右边缘手势、遮罩、动画全部由它处理，展开时天然覆盖下层内容与悬浮按钮。
 *   3. 页面内容 + 悬浮新建按钮
 *
 * 左侧全局导航由外层的 React Navigation Drawer.Navigator 提供；两者的手势热区
 * 分别位于屏幕左右边缘，且分属不同嵌套层级，不会互相争抢。
 */
export function ScreenScaffold({ panelTitle, panelItems, fab, children }: ScreenScaffoldProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<{ navigate: (name: NavigationTarget) => void }>();
  const { width: screenWidth } = useWindowDimensions();
  const [panelOpen, setPanelOpen] = useState(false);

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const openPanel = useCallback(() => setPanelOpen(true), []);

  // 右侧栏展开时，系统返回优先收起它。
  useBackHandler(
    useCallback(() => {
      if (!panelOpen) {
        return false;
      }
      setPanelOpen(false);
      return true;
    }, [panelOpen]),
    panelOpen
  );

  /**
   * 全局滑动：屏幕任意位置起手，只按方向区分左右。
   *   右滑 → 左侧全局导航
   *   左滑 → 右侧页面操作栏
   * 两层抽屉自带的手势都已关闭，滑动只在这里判定一次，不存在争抢。
   */
  const renderItem = (item: PanelItem) => (
    <TouchableOpacity
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: !!item.selected }}
      onPress={() => {
        closePanel();
        item.onPress();
      }}
      style={[styles.item, item.selected && styles.itemSelected]}
    >
      <Text style={[styles.itemText, item.selected && styles.itemTextSelected]}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenRoot}>
      <ProfileBar onPress={() => navigation.navigate('settings')} />

      <SideDrawer
        open={panelOpen}
        onOpen={openPanel}
        onClose={closePanel}
        drawerPosition="right"
        drawerType="front"
        /**
         * 官方自带滑动，热区放大到屏幕右侧 40%，实现「靠右任意位置左滑都能唤出」。
         * 左侧 60% 由全局抽屉负责（其 swipeEdgeWidth 同步放大），两者区间不重叠。
         */
        swipeEnabled
        swipeEdgeWidth={Math.round(screenWidth * 0.4)}
        swipeMinDistance={30}
        swipeMinVelocity={300}
        overlayStyle={styles.panelOverlay}
        drawerStyle={styles.panelDrawer}
        renderDrawerContent={() => (
          <View style={styles.panelSurface}>
            <Text style={styles.panelTitle}>{panelTitle}</Text>
            <View style={styles.panelTop}>
              {panelItems.filter((item) => !item.bottom).map(renderItem)}
            </View>
            <View style={styles.panelBottom}>
              {panelItems.filter((item) => item.bottom).map(renderItem)}
            </View>
          </View>
        )}
      >
        {/* 页面内容整体淡入，避免页面切换时的生硬跳变。 */}
        <Animated.View entering={SCREEN_ENTERING} style={styles.content}>
          {children}
          {fab ? <FloatingAddButton label={fab.label} onPress={fab.onPress} /> : null}
        </Animated.View>
      </SideDrawer>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    screenRoot: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1 },
    panelDrawer: { backgroundColor: theme.colors.surface, width: 300 },
    panelOverlay: { backgroundColor: '#00000055' },
    panelSurface: { flex: 1, paddingHorizontal: 10, paddingTop: 18, paddingBottom: 18 },
    panelTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    panelTop: { flexGrow: 0 },
    panelBottom: { marginTop: 'auto' },
    item: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14 },
    itemSelected: { backgroundColor: theme.colors.primarySoft },
    itemText: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
    itemTextSelected: { color: theme.colors.primary, fontWeight: '800' },
  });
}
