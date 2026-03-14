import Constants from 'expo-constants';

export const config = {
  enableSignup:
    String(Constants.expoConfig?.extra?.enableSignup ?? 'true') !== 'false',
  vapidPublicKey: String(Constants.expoConfig?.extra?.vapidPublicKey ?? ''),
};
