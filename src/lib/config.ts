import Constants from 'expo-constants';

export const config = {
  enableSignup:
    String(Constants.expoConfig?.extra?.enableSignup ?? 'true') !== 'false',
};
