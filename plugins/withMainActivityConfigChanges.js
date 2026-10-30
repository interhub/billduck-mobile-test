const {withAndroidManifest} = require('expo/config-plugins');

const CONFIG_CHANGES =
  'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|locale|layoutDirection';

/**
 * Forces the exact `android:configChanges` value on the MainActivity so the app
 * handles keyboard, orientation, locale and layout-direction changes itself
 * instead of being recreated by the system.
 *
 * The default Expo template omits some of these flags, so the setting is
 * reapplied here to survive every `expo prebuild`. Idempotent: the attribute is
 * simply overwritten with the canonical value.
 */
const withMainActivityConfigChanges = (config) => {
  return withAndroidManifest(config, (nextConfig) => {
    const application = nextConfig.modResults.manifest.application?.[0];
    const activities = application?.activity ?? [];
    const mainActivity = activities.find(
      (activity) => activity?.$?.['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      mainActivity.$['android:configChanges'] = CONFIG_CHANGES;
    }
    return nextConfig;
  });
};

module.exports = withMainActivityConfigChanges;
