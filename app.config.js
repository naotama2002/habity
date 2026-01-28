export default {
  expo: {
    name: "Habity",
    slug: "habity",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "habity",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#6366f1"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.habity.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#6366f1"
      },
      package: "com.habity.app"
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#6366f1"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL
    }
  }
};
