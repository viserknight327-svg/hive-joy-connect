import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hive.goodenergy",
  appName: "Hive",
  webDir: ".output/public",
  bundledWebRuntime: false,
  server: {
    url: "https://hivemind20.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
