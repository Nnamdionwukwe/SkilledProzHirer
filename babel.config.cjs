module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Note: react-native-reanimated/plugin and react-native-worklets/plugin
    // are no longer added manually - babel-preset-expo handles them in SDK 54+.
  };
};
