const {withAppDelegate, withInfoPlist} = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';
const PROVIDER_PROTOCOL = 'ExpoReactNativeFactoryProvider';
const APP_DELEGATE_DECLARATION = 'class AppDelegate: ExpoAppDelegate {';
const SCENE_START_COMMENT =
  '    // The scene delegate creates the window and starts React Native (scene life cycle).\n';
const WINDOW_START_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([^)]*\)\n#endif\n/;

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: SCENE_DELEGATE_CLASS
      }
    ]
  }
};

const withSceneManifest = (config) => {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return nextConfig;
  });
};

const adoptFactoryProvider = (contents) => {
  if (contents.includes(PROVIDER_PROTOCOL)) {
    return contents;
  }
  if (!contents.includes(APP_DELEGATE_DECLARATION)) {
    throw new Error('withIosSceneLifecycle: the AppDelegate declaration has an unknown shape');
  }
  return contents.replace(
    APP_DELEGATE_DECLARATION,
    `class AppDelegate: ExpoAppDelegate, ${PROVIDER_PROTOCOL} {`
  );
};

const removeWindowStart = (contents) => {
  if (contents.includes(SCENE_START_COMMENT)) {
    return contents;
  }
  if (!WINDOW_START_BLOCK.test(contents)) {
    throw new Error('withIosSceneLifecycle: the window start block of AppDelegate was not found');
  }
  return contents.replace(WINDOW_START_BLOCK, SCENE_START_COMMENT);
};

const withSceneAppDelegate = (config) => {
  return withAppDelegate(config, (nextConfig) => {
    if (nextConfig.modResults.language !== 'swift') {
      throw new Error('withIosSceneLifecycle: a Swift AppDelegate is expected');
    }
    nextConfig.modResults.contents = removeWindowStart(
      adoptFactoryProvider(nextConfig.modResults.contents)
    );
    return nextConfig;
  });
};

/**
 * iOS 27 stops an app at launch unless it adopts the scene-based life cycle. The `expo` package
 * of SDK 57 already ships the scene delegate (`EXExpoAppSceneDelegate`), but the SDK 57 app
 * template still creates the window and starts React Native from the app delegate. This plugin
 * hands both to the scene delegate:
 * - Info.plist declares one window scene served by `EXExpoAppSceneDelegate`;
 * - `AppDelegate` provides its React Native factory to that delegate and stops creating a window.
 * Idempotent: every change is checked before it is made. When the template no longer has the
 * expected code, the plugin fails the prebuild instead of producing an app that stops at launch.
 */
const withIosSceneLifecycle = (config) => {
  return withSceneAppDelegate(withSceneManifest(config));
};

module.exports = withIosSceneLifecycle;
