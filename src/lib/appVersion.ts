declare const __APP_VERSION__: string;
declare const __APP_COMMIT_SHA__: string;
declare const __APP_COMMIT_LONG__: string;

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT_SHA = typeof __APP_COMMIT_SHA__ === 'string' ? __APP_COMMIT_SHA__ : 'dev';
export const APP_COMMIT_LONG = typeof __APP_COMMIT_LONG__ === 'string' ? __APP_COMMIT_LONG__ : 'dev';

export const APP_BUILD_LABEL = APP_COMMIT_SHA && APP_COMMIT_SHA !== APP_VERSION
  ? `${APP_VERSION} (${APP_COMMIT_SHA})`
  : APP_VERSION;
