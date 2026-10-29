const {withAndroidStyles, AndroidConfig} = require('@expo/config-plugins');

/**
 * With edge-to-edge enabled (target SDK 35 and above), Android 15 puts a light
 * contrast scrim over the system navigation bar, so the bar looks like a
 * washed-out strip instead of showing whatever the screen draws underneath it.
 * This plugin turns that scrim off so the bar takes the screen's own color.
 *
 * The `androidNavigationBar` key of the Expo config has no effect once
 * edge-to-edge is enabled, so the attribute is set directly on `AppTheme` in
 * styles.xml instead. Idempotent: reapplying updates the existing item
 * rather than duplicating it.
 */
const withAndroidNavigationBarContrast = (config) => {
  return withAndroidStyles(config, (nextConfig) => {
    nextConfig.modResults = AndroidConfig.Styles.assignStylesValue(nextConfig.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'android:enforceNavigationBarContrast',
      value: 'false'
    });
    return nextConfig;
  });
};

module.exports = withAndroidNavigationBarContrast;
