# 酸橙（Angelime）

基于 Expo + React Native + TypeScript 的本地待办与习惯 App。数据保存在设备本地，可导出 JSON 备份并覆盖恢复。备忘录支持 Markdown、图片、置顶和分类。

## 当前页面

- 今天：待办默认在习惯上方；已达标习惯自动排到习惯列表底部；待办和习惯区域可独立折叠并记住状态。
- 待办：支持无日期或带截止日期/时间的任务、宽松的中英文日期时间输入、完成撤销和手动排序。
- 习惯：支持每日、每周、每月目标，分组、打卡、历史、归档和手动排序。
- 备忘录：支持 Markdown 编辑／预览、图片、搜索、置顶、分类、自动保存和删除确认。
- 设置：个人资料、主题、分组管理、归档习惯、数据备份与恢复。

## 主要交互

- 待办按“逾期、今天、明天、未来 7 天、稍后、无日期”排列，同一时间层级支持手动调整。
- 长按待办、习惯或分组后进入拖动排序。
- 习惯卡片右侧 `+1` 立即记录，底部提示支持撤销；标题进入历史，`•••` 打开编辑与归档菜单。
- 历史默认打开月视图并记住最近使用的月/年模式；年视图使用月份摘要，不再堆叠十二个完整小日历。

## 数据版本

当前 `AppData.version` 为 `6`。旧版 `version: 1` 至 `version: 5` 会在读取时自动迁移：

- 现有习惯、分组、归档状态、主题和打卡记录保持不变。
- 旧习惯默认迁移为“每天 1 次”。
- 分组和习惯按旧数组顺序生成可持久化的 `order`。
- 新增空的待办列表，不影响原有数据。

备份文件包含待办、习惯、备忘录（含图片）、顺序、周期设置、打卡记录和主题。

## 运行

本地安装依赖后，用数据线或无线调试连接真机，编译并安装调试包：

```bash
npm install
npm run android          # 首次会自动生成 android/ 原生工程并编译安装到已连接设备
```

`android/` 已纳入版本控制。改动 JS/TS 代码时不需要重新编译原生，只启动 Metro 即可：

```bash
npm start                # 然后按 a 打开设备上已安装的 App
```

只有新增原生依赖或修改 `app.json` 配置后，才需要重新执行 `npm run android`。

### 直接使用 Gradle

`android/` 生成后也可以绕过 Expo CLI 直接构建：

```bash
cd android
./gradlew assembleDebug      # 产物：app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease    # 产物：app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

`assembleRelease` 默认使用 Expo 模板自带的 debug 签名，可直接安装测试；正式分发前需按
[本地生产构建](https://docs.expo.dev/guides/local-app-production/) 配置自己的 keystore。

### 环境要求

| 组件 | 版本 |
| --- | --- |
| JDK | 17 |
| Android SDK Platform | android-36 |
| Android Build Tools | 36.0.0 |
| Gradle | 9.0.0（wrapper 自带，无需单独安装） |
| Node.js | ≥ 20.19 |

需要设置 `JAVA_HOME`、`ANDROID_HOME`，并把 `$ANDROID_HOME/platform-tools` 加入 `PATH`。

## 校验

```bash
npm run typecheck        # tsc --noEmit
npm run test:smoke-web   # Web 界面冒烟测试
```

`test:smoke-web` 会自动探测本机 Chromium 系浏览器（Edge / Chrome / Chromium），也可用
`SMOKE_BROWSER=/path/to/browser` 指定；覆盖宽松日期时间输入、待办新增/完成/撤销、习惯周期、
长按拖动排序和个人资料编辑，截图输出到 `artifacts/`。
