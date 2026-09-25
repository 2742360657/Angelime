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
/** 签名材料默认存放位置（仓库之外）。可用 -PANGELIME_KEYSTORE_DIR 覆盖。 */
const KEYSTORE_DIR = process.env.ANGELIME_KEYSTORE_DIR ?? '/Ciallo/Secrets/angelime/';

const RELEASE_SIGNING = `        // 正式发布签名。
        // keystore 与口令保存在仓库之外：优先读 ~/.gradle/gradle.properties 中的
        // ANGELIME_KEYSTORE_DIR，未配置时回退到本机默认目录。
        // 注意：expo prebuild 会重新生成本文件，改动需用 scripts/apply-signing.mjs 重新应用。
        release {
            def keystoreDir = project.findProperty('ANGELIME_KEYSTORE_DIR') ?: '${KEYSTORE_DIR}'
            def keystoreProps = new Properties()
            def keystorePropsFile = file("\${keystoreDir}keystore.properties")
            if (keystorePropsFile.exists()) {
                keystorePropsFile.withInputStream { keystoreProps.load(it) }
            }
            storeFile file("\${keystoreDir}\${keystoreProps.getProperty('storeFile', 'angelime-release.keystore')}")
            storePassword keystoreProps.getProperty('storePassword', '')
            keyAlias keystoreProps.getProperty('keyAlias', '')
            keyPassword keystoreProps.getProperty('keyPassword', '')
        }
`;

if (!existsSync(GRADLE_FILE)) {
  console.error(`找不到 ${GRADLE_FILE}，请先运行 npx expo prebuild --platform android`);
  process.exit(1);
}

if (!existsSync(`${KEYSTORE_DIR}angelime-release.keystore`)) {
  console.error(`找不到 ${KEYSTORE_DIR}angelime-release.keystore`);
  console.error('请先在该目录放置 keystore 与 keystore.properties，或设置 ANGELIME_KEYSTORE_DIR 指向正确位置。');
  process.exit(1);
}

let source = readFileSync(GRADLE_FILE, 'utf8');

if (source.includes("keystoreProps.getProperty('storeFile'")) {
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
