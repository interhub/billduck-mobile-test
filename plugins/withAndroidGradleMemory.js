const {withGradleProperties} = require('expo/config-plugins');

const GRADLE_JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

/**
 * Forces a larger Gradle daemon heap and metaspace than the Expo default:
 * prebuild resets org.gradle.jvmargs to a value too small for the Android build.
 * Idempotent: an existing property is overwritten, a missing one is added once.
 */
const withAndroidGradleMemory = (config) => {
  return withGradleProperties(config, (nextConfig) => {
    const existingProperty = nextConfig.modResults.find(
      (gradleEntry) => gradleEntry.type === 'property' && gradleEntry.key === 'org.gradle.jvmargs'
    );
    if (existingProperty) {
      existingProperty.value = GRADLE_JVM_ARGS;
    } else {
      nextConfig.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: GRADLE_JVM_ARGS
      });
    }
    return nextConfig;
  });
};

module.exports = withAndroidGradleMemory;
