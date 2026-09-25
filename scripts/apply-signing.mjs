#!/usr/bin/env node
/**
 * 为 android/app/build.gradle 应用正式发布签名配置。
 *
 * 为什么需要这个脚本：`expo prebuild` 会重新生成 build.gradle，覆盖手写的
 * signingConfig。expo-build-properties 目前不支持 signingConfig，所以把改动
 * 脚本化，prebuild 之后重新跑一次即可。
 *
 *   npx expo prebuild --platform android && node scripts/apply-signing.mjs
 *
 * 脚本是幂等的：已经配置过就什么都不做。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const GRADLE_FILE = 'android/app/build.gradle';
const KEYSTORE_FILE = 'android/app/angelime-release.keystore';

const RELEASE_SIGNING = `        // 正式发布签名。keystore 与口令随仓库保存（个人项目，仓库不公开）。
        // 注意：expo prebuild 会重新生成本文件，改动需用 scripts/apply-signing.mjs 重新应用。
        release {
            storeFile file('angelime-release.keystore')
            storePassword 'angelime2026'
            keyAlias 'angelime'
            keyPassword 'angelime2026'
        }
`;

if (!existsSync(GRADLE_FILE)) {
  console.error(`找不到 ${GRADLE_FILE}，请先运行 npx expo prebuild --platform android`);
  process.exit(1);
}

if (!existsSync(KEYSTORE_FILE)) {
  console.error(`找不到 ${KEYSTORE_FILE}`);
  console.error('请先执行：');
  console.error(
    "  keytool -genkeypair -v -keystore android/app/angelime-release.keystore \\\n" +
      '    -alias angelime -keyalg RSA -keysize 2048 -validity 10000 \\\n' +
      "    -storepass angelime2026 -keypass angelime2026 -dname 'CN=Angelime'"
  );
  process.exit(1);
}

let source = readFileSync(GRADLE_FILE, 'utf8');

if (source.includes("storeFile file('angelime-release.keystore')")) {
  console.log('发布签名已配置，无需改动。');
} else {
  const anchor = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
`;
  if (!source.includes(anchor)) {
    console.error('未找到 signingConfigs.debug 块，build.gradle 结构可能已变化，请手动检查。');
    process.exit(1);
  }
  source = source.replace(anchor, anchor + RELEASE_SIGNING);
  console.log('已写入 signingConfigs.release。');
}

if (source.includes('signingConfig signingConfigs.debug\n            def enableShrinkResources')) {
  source = source.replace(
    'signingConfig signingConfigs.debug\n            def enableShrinkResources',
    'signingConfig signingConfigs.release\n            def enableShrinkResources'
  );
  console.log('release 构建类型已改用 release 签名。');
}

writeFileSync(GRADLE_FILE, source);
console.log('完成。');
