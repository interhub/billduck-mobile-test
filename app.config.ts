import {ConfigContext, ExpoConfig} from 'expo/config';

const GRAPHITE = '#1A1814';

/** Permissions the template or libraries would add; the app needs only the internet. */
const BLOCKED_ANDROID_PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.RECORD_AUDIO',
  'android.permission.CAMERA',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
  // expo-image asks for it to watch the network for remote pictures; every picture here is bundled.
  'android.permission.ACCESS_NETWORK_STATE'
];

const PLUGINS: ExpoConfig['plugins'] = [
  [
    'expo-splash-screen',
    {
      backgroundColor: GRAPHITE,
      image: './assets/images/splash-icon.png',
      imageWidth: 144,
      resizeMode: 'contain',
      ios: {
        backgroundColor: GRAPHITE,
        image: './assets/images/splash-icon.png',
        imageWidth: 128,
        resizeMode: 'contain'
      }
    }
  ],
  [
    'expo-localization',
    {
      supportedLocales: {
        ios: ['en', 'ru'],
        android: ['en', 'ru']
      }
    }
  ],
  './plugins/withIosSceneLifecycle.js',
  './plugins/withLocalCleartextTraffic.js',
  './plugins/withAndroidNavigationBarContrast.js',
  './plugins/withMainActivityConfigChanges.js',
  './plugins/withAndroidGradleMemory.js'
];

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BillDuck',
  slug: 'billduck',
  scheme: 'billduck',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.billduck.app',
    supportsTablet: false,
    infoPlist: {
      CFBundleDisplayName: 'BillDuck',
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true
      }
    }
  },
  android: {
    package: 'com.billduck.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon-foreground.png',
      backgroundColor: GRAPHITE
    },
    allowBackup: false,
    blockedPermissions: BLOCKED_ANDROID_PERMISSIONS,
    predictiveBackGestureEnabled: false
  },
  plugins: PLUGINS,
  experiments: {
    reactCompiler: true
  }
});
