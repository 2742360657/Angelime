/** 全局导航目标：抽屉列出主页面，回收站与设置由页面内入口进入。 */
export type NavigationTarget = 'today' | 'tasks' | 'habits' | 'memos' | 'trash' | 'settings';

/** 首页路由名；返回键与「再按一次退出」都基于它判断。 */
export const HOME_TARGET: NavigationTarget = 'today';

export type NavigationProps = {
  onNavigate: (target: NavigationTarget) => void;
};

/** 左侧全局导航菜单项。 */
export const GLOBAL_NAV_ITEMS: Array<{ id: NavigationTarget; label: string }> = [
  { id: 'today', label: '首页' },
  { id: 'tasks', label: '待办' },
  { id: 'habits', label: '习惯' },
  { id: 'memos', label: '备忘录' },
  { id: 'settings', label: '设置' },
];

/** 右侧页面栏的条目。 */
export type PanelItem = {
  id: string;
  label: string;
  selected?: boolean;
  /** 是否固定到面板底部。 */
  bottom?: boolean;
  onPress: () => void;
};
