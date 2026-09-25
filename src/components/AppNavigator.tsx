import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { GLOBAL_NAV_ITEMS } from '../navigation/types';
import { useHabits } from '../state/HabitStore';

const Drawer = createDrawerNavigator();

function GlobalDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const activeRoute = props.state.routeNames[props.state.index];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll}>
      <Text style={styles.drawerTitle}>酸橙</Text>
      {GLOBAL_NAV_ITEMS.map((item) => {
        const selected = activeRoute === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => props.navigation.navigate(item.id)}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </DrawerContentScrollView>
  );
}

/**
 * 左侧全局导航抽屉。
 * 手势、遮罩、动画全部交给 React Navigation 的 drawer 实现；
 * 右侧页面操作栏由各页面的 ScreenScaffold 单独提供。
 */
export function AppNavigator({ screens }: { screens: Record<string, React.ComponentType<any>> }) {
  const { width: screenWidth } = useWindowDimensions();
  return (
    <Drawer.Navigator
      initialRouteName="today"
      drawerContent={(props) => <GlobalDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerPosition: 'left',
        /**
         * 官方自带滑动。热区放大到屏幕左侧 60%，实现「靠左任意位置右滑都能唤出全局导航」。
         * 右侧 40% 归 ScreenScaffold 的页面操作栏，两者区间不重叠、互不争抢。
         */
        swipeEnabled: true,
        swipeEdgeWidth: screenWidth * 0.6,
        swipeMinDistance: 30,
        overlayColor: '#00000055',
        drawerStyle: { width: 300 },
      }}
    >
      {Object.entries(screens).map(([name, Component]) => (
        <Drawer.Screen key={name} name={name} component={Component} />
      ))}
    </Drawer.Navigator>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    drawerScroll: {
      paddingTop: 8,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surface,
      flexGrow: 1,
    },
    drawerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    item: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14 },
    itemSelected: { backgroundColor: theme.colors.primarySoft },
    itemText: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
    itemTextSelected: { color: theme.colors.primary, fontWeight: '800' },
  });
}
