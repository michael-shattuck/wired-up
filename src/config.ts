export interface WiredUpContainerConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  lazyLoad?: boolean;
}

export function getDefaultContainerConfig(): WiredUpContainerConfig {
  return {
    logLevel: 'error',
    lazyLoad: false,
  };
}
