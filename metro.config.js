// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Ignore build, bin, and .gradle directories in node_modules from Metro watcher
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  /.*[\\/]expo-modules-core[\\/]expo-module-gradle-plugin[\\/](?:bin|build|\.gradle)[\\/].*/,
  /.*[\\/]\.gradle[\\/].*/,
];

module.exports = withNativeWind(config, { input: './global.css' });
