module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "macros",
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
      "react-native-reanimated/plugin"
    ]
  };
};
