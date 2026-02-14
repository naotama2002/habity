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
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      enableSignup: process.env.EXPO_PUBLIC_ENABLE_SIGNUP,
    }
  }
};
