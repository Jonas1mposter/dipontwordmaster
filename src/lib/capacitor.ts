/**
 * Check if the app is running as a native mobile app
 * Uses window.Capacitor which is injected by the Capacitor runtime
 */
export const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && 
    !!(window as any).Capacitor?.isNativePlatform?.();
};

/**
 * Get the current platform (web, ios, android)
 */
export const getPlatform = (): string => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return (window as any).Capacitor.getPlatform?.() || 'web';
  }
  return 'web';
};

/**
 * Initialize native app settings
 * Note: StatusBar plugin temporarily disabled due to Capacitor 8 compatibility issues
 */
export const initializeNativeApp = async () => {
  if (!isNativePlatform()) return;

  try {
    console.log('Native app initialized successfully on', getPlatform());
  } catch (error) {
    console.error('Failed to initialize native app settings:', error);
  }
};

/**
 * Show the status bar (placeholder for future implementation)
 */
export const showStatusBar = async () => {
  if (!isNativePlatform()) return;
  // StatusBar plugin temporarily disabled
};

/**
 * Hide the status bar (placeholder for future implementation)
 */
export const hideStatusBar = async () => {
  if (!isNativePlatform()) return;
  // StatusBar plugin temporarily disabled
};

/**
 * Set status bar to light style (placeholder for future implementation)
 */
export const setLightStatusBar = async () => {
  if (!isNativePlatform()) return;
  // StatusBar plugin temporarily disabled
};

/**
 * Set status bar to dark style (placeholder for future implementation)
 */
export const setDarkStatusBar = async () => {
  if (!isNativePlatform()) return;
  // StatusBar plugin temporarily disabled
};
