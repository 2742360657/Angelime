# 酸橙（Angelime）

酸橙是一款基于 Expo、React Native 和 TypeScript 的本地效率应用，包含待办、习惯打卡和备忘录。数据默认保存在设备本地，也可以导出和恢复 JSON 备份。

当前项目主要面向 Android 真机使用。

## 下载

| | |
| --- | --- |
| 最新版 APK | **[点击下载 angelime-release.apk](https://github.com/2742360657/Angelime/raw/main/android/app/build/outputs/apk/release/app-release.apk)** |
| 适用平台 | Android（仅 arm64-v8a，`minSdk 24` / `targetSdk 36`） |
| 当前版本 | `1.1.1`（versionCode 4） |

下载后在手机上点击安装即可，无需自行构建。若系统提示「未知来源」，请在安装界面选择允许。

## 功能

- **首页**：查看当天的待办和习惯，支持折叠、完成、撤销和快速打卡。
- **待办**：支持无日期、今天、明天、自定义日期和时间；可完成、编辑、删除、批量整理和拖动排序。
- **习惯**：支持每日、每周、每月目标，分组管理、快速打卡、历史记录、归档和恢复。
- **备忘录**：支持标题、正文、分类、搜索、自动保存、批量移动、软删除和回收站恢复。
- **设置**：支持个人资料、头像、主题、数据备份与恢复。

## 交互方式

- 底部导航用于切换首页、待办、习惯、备忘录和设置。
- 顶部菜单按钮或屏幕左侧右滑，可以打开当前页面的操作侧栏。
- 首页不设置额外侧栏，保持内容页面简洁。
- 悬浮 `+` 用于新建当前页面对应的内容。
- 长按条目可以进入批量整理模式；整理模式支持批量移动、删除和拖动排序。
- Android 返回键会优先关闭当前弹窗、编辑状态或侧栏；在首页连续按两次才会退出应用。

## 代码结构

```text
App.tsx                         应用入口、导航容器、返回键和退出确认
src/components/AppNavigator.tsx 主导航抽屉
src/components/ScreenScaffold.tsx 页面公共结构、底部导航和页面操作栏
src/components/FloatingAddButton.tsx 悬浮新建按钮
src/navigation/panel.tsx        按路由保存页面操作栏内容
src/navigation/types.ts         导航目标和页面操作项类型
src/navigation/back.ts           Android 返回键协调器
src/screens/                    首页、待办、习惯、备忘录、回收站和设置
src/state/                      Provider、状态类型和纯 Reducer
src/storage/habitStorage.ts     本地存储、版本迁移、备份导入导出
src/utils/                      日期解析、待办分组、习惯进度等工具
src/theme.ts                    主题和动画配置
```

## 环境要求

- Node.js `>= 20.19`
- JDK 17
- Android SDK Platform 36
- Android Build Tools 36
- Expo SDK 55

## 安装与运行

```bash
npm install
npm run android
```

开发时可以启动 Metro，然后在已安装的 Android 应用中加载 JS：

```bash
npm start
```

生成 APK：

```bash
npm run build:apk
```

首次生成或修改原生配置时，可以执行：

```bash
npm run prebuild:android
```

## 数据与备份

应用数据保存在设备本地。设置页面中的“数据备份”会生成 JSON 文件并打开系统分享；“数据恢复”会读取备份并覆盖当前数据。

恢复前应确认备份文件来源可靠。数据结构包含版本号，读取旧版本数据时会自动执行迁移。

## 代码检查

```bash
npm run typecheck
```
