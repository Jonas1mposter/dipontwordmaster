import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Check if the app is running as a native mobile app
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Get the current platform (web, ios, android)
 */
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Initialize native app settings
 */
export const initializeNativeApp = async () => {
  if (!isNativePlatform()) return;

  try {
    // Set status bar style for dark theme
    await StatusBar.setStyle({ style: Style.Dark });
    
    // Set status bar background color to match app theme
    if (getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0f1219' });
    }
    
    // Make status bar overlay the content (for iOS notch handling)
    await StatusBar.setOverlaysWebView({ overlay: true });
    
    console.log('Native app initialized successfully');
  } catch (error) {
    console.error('Failed to initialize native app settings:', error);
  }
};

/**
 * Show the status bar
 */
export const showStatusBar = async () => {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Failed to show status bar:', error);
  }
};

/**
 * Hide the status bar
 */
export const hideStatusBar = async () => {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Failed to hide status bar:', error);
  }
};

/**
 * Set status bar to light style (dark text)
 */
export const setLightStatusBar = async () => {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch (error) {
    console.error('Failed to set light status bar:', error);
  }
};

/**
 * Set status bar to dark style (light text)
 */
export const setDarkStatusBar = async () => {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (error) {
    console.error('Failed to set dark status bar:', error);
  }
};
