module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "@lingui/babel-plugin-lingui-macro",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "#": "./src"
          }
        }
      ],
      // Reanimated 4 から worklets は別パッケージに分離された。
      // "react-native-reanimated/plugin" は再エクスポートするだけの shim。
      "react-native-worklets/plugin"
    ]
  };
};
