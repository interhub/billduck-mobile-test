const {mkdirSync, writeFileSync} = require('node:fs');
const path = require('node:path');
const {AndroidConfig, withAndroidManifest, withDangerousMod} = require('expo/config-plugins');

const CONFIG_NAME = 'network_security_config';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

const NETWORK_SECURITY_CONFIG = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<network-security-config>',
  '  <base-config cleartextTrafficPermitted="false" />',
  '  <domain-config cleartextTrafficPermitted="true">',
  ...LOCAL_HOSTS.map((host) => `    <domain includeSubdomains="false">${host}</domain>`),
  '  </domain-config>',
  '</network-security-config>',
  ''
].join('\n');

const withNetworkSecurityConfigFile = (config) => {
  return withDangerousMod(config, [
    'android',
    (nextConfig) => {
      const xmlDirectory = path.join(
        nextConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      mkdirSync(xmlDirectory, {recursive: true});
      writeFileSync(path.join(xmlDirectory, `${CONFIG_NAME}.xml`), NETWORK_SECURITY_CONFIG);
      return nextConfig;
    }
  ]);
};

const withNetworkSecurityConfigReference = (config) => {
  return withAndroidManifest(config, (nextConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(nextConfig.modResults);
    application.$['android:networkSecurityConfig'] = `@xml/${CONFIG_NAME}`;
    delete application.$['android:usesCleartextTraffic'];
    return nextConfig;
  });
};

/**
 * Lets the app use plain HTTP only for 127.0.0.1 and localhost: the local mock server and Metro,
 * both reached from the emulator through `adb reverse`. Every other host keeps the Android
 * default, HTTPS only.
 * Idempotent: the XML file is rewritten with the same content and the manifest attribute is
 * overwritten, so a repeated prebuild changes nothing.
 */
const withLocalCleartextTraffic = (config) => {
  return withNetworkSecurityConfigReference(withNetworkSecurityConfigFile(config));
};

module.exports = withLocalCleartextTraffic;
