# 酸橙（Angelime）

基于 Expo + React Native + TypeScript 的本地待办、习惯与备忘录 App。
数据全部保存在设备本地，可导出 JSON 备份并覆盖恢复。**仅面向 Android 真机**。

## 页面与交互

| 页面 | 说明 |
| --- | --- |
| 首页 | 今日待办（含逾期）与习惯打卡；两组均可折叠 |
| 待办 | 按「逾期 / 今天 / 明天 / 未来 7 天 / 稍后 / 无日期 / 已完成」分组，各组可折叠 |
| 习惯 | 按分组展示，支持每日 / 每周 / 每月目标、打卡、历史、归档 |
| 备忘录 | 纯文本标题 + 正文 + 分类，支持搜索、回收站 |
| 设置 | 个人资料、色系、归档习惯、数据备份与恢复 |
| 回收站 | 由备忘录右侧栏进入；删除的备忘录先进这里，从这里删除才是真删除 |

**导航**

- 左侧全局抽屉：屏幕左侧 60% 区域右滑唤出（首页 / 待办 / 习惯 / 备忘录 / 设置）
- 右侧页面操作栏：屏幕右侧 40% 区域左滑唤出，内容随页面而变
- 两个热区互不重叠，均由各自抽屉组件自带手势处理

**条目操作**

- 点按：打开详情 / 编辑器
- 长按：进入多选整理态（此时条目右侧才出现拖动横线）
- 多选态可批量移动分组与删除；待办仅支持批量删除（待办按日期分组，无自定义分组）
- 悬浮 `+` 按钮：新建对应页面条目

**折叠动画**

列表条目、列表容器、折叠分组三层统一使用 Reanimated 的 `LinearTransition`；
折叠分组的内容**保持挂载**，只切换 `height` `0 ↔ auto`（`layout` 动画只能对保持挂载的视图补间尺寸）。

## 数据版本

当前 `AppData.version` 为 `7`。旧版 `version: 1` 至 `version: 6` 会在读取时自动迁移：

- 习惯、分组、归档状态、主题、打卡记录保持不变
- 旧习惯默认迁移为「每天 1 次」
- 分组与习惯按旧数组顺序生成可持久化的 `order`
- v6 及更早的备忘录字符串 `category` 会迁移为 `memoGroups` + `groupId`
- v6 的待办、备忘录分别补上所需字段，旧数据不丢失

备份文件包含待办、习惯、分组顺序、周期设置、打卡记录、备忘录与分类、回收站、主题与个人资料。

## 代码结构

```
App.tsx                      应用根：导航容器、返回键策略、退出确认
src/
  components/
    AppNavigator.tsx         左侧全局抽屉导航器（React Navigation）
    ScreenScaffold.tsx       页面脚手架：资料条 + 右侧操作栏 + 悬浮按钮
    AccordionSection.tsx     可折叠分组
    MultiSelectBoard.tsx     多选整理态
    DraggableList.tsx        多选态内的拖动排序（支持跨分组）
    …                        其余为编辑器、选择器、条目行等展示组件
  navigation/
    types.ts                 导航目标、抽屉菜单项、面板条目类型
    back.ts                  系统返回键的栈式协调器
  state/
    HabitStore.tsx           Provider 与对外 API（useHabits）
    storeTypes.ts            状态 / 动作 / 上下文类型与初始状态
    habitReducer.ts          纯 reducer（无 React 依赖）
    reducerHelpers.ts        打卡记录等纯工具函数
  storage/habitStorage.ts    本地读写、版本迁移、备份导入导出
  theme.ts / theme/animation.ts  色系与配色、动画配时
  types/habit.ts             数据模型
  utils/                     日期解析、习惯进度、待办分组
scripts/apply-signing.mjs    prebuild 后重新应用发布签名
```

## 构建与运行

环境要求：

| 组件 | 版本 |
| --- | --- |
| JDK | 17 |
| Android SDK Platform | android-36 |
| Android Build Tools | 36.0.0 |
| NDK | 27.1.12297006（expo-modules-core 需要） |
| Node.js | ≥ 20.19 |

需要设置 `JAVA_HOME`、`ANDROID_HOME`，并把 `$ANDROID_HOME/platform-tools` 加入 `PATH`。

```bash
npm install

# 日常开发：只跑 Metro，App 通过 adb reverse 连接
npm start

# 生成原生工程（仅在改动原生依赖或 app.json 后需要）
npm run prebuild:android      # = expo prebuild + 重新应用发布签名

# 出包
npm run build:apk             # = gradlew assembleRelease（仅 arm64-v8a）
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

### 发布签名

`android/app/angelime-release.keystore`（别名 `angelime`）用于 release 构建，
签名配置写在 `android/app/build.gradle`。

> `expo prebuild` 会重新生成 `build.gradle` 覆盖签名配置，
> 因此 prebuild 之后必须执行 `node scripts/apply-signing.mjs`（`npm run prebuild:android` 已包含）。

**这个 keystore 一旦用于正式发布就不能更换，请连同口令一并备份。**

## 校验

```bash
npm run typecheck     # tsc --noEmit
```

建议同时用严格模式复查未使用的代码：

```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

## 已知限制

- 左抽屉展开时，页面右下角的悬浮 `+` 会浮在遮罩之上（悬浮按钮渲染在页面内容层内）
- 编辑类弹窗使用原生 `Modal`，其返回键由各弹窗的 `onRequestClose` 自行处理
