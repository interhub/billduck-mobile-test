const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8787';

/**
 * Settings compiled into the bundle from `EXPO_PUBLIC_*` variables. They are readable by anyone
 * who has the app, so a secret never goes here.
 */
export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
} as const;
