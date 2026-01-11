// Haptic feedback utilities for mobile devices
// Uses Vibration API and Capacitor Haptics when available

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20], // Short, pause, short
  warning: [30, 50, 30, 50, 30], // Triple pulse
  error: [50, 100, 50], // Long, pause, long
};

class HapticsManager {
  private enabled = true;
  private isSupported = false;

  constructor() {
    // Check for Vibration API support
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    
    // Load preference from localStorage
    if (typeof localStorage !== 'undefined') {
      const settings = localStorage.getItem('game-settings');
      if (settings) {
        try {
          const parsed = JSON.parse(settings);
          this.enabled = parsed.vibrationEnabled !== false;
        } catch (e) {
          // Use default
        }
      }
    }
  }

  // Enable or disable haptics
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Check if haptics are available
  get available(): boolean {
    return this.isSupported && this.enabled;
  }

  // Trigger haptic feedback
  trigger(pattern: HapticPattern = 'medium'): void {
    if (!this.available) return;

    try {
      const vibrationPattern = PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);
    } catch (e) {
      console.warn('[Haptics] Vibration failed:', e);
    }
  }

  // Specific feedback methods
  success(): void {
    this.trigger('success');
  }

  error(): void {
    this.trigger('error');
  }

  warning(): void {
    this.trigger('warning');
  }

  light(): void {
    this.trigger('light');
  }

  medium(): void {
    this.trigger('medium');
  }

  heavy(): void {
    this.trigger('heavy');
  }
}

// Singleton instance
export const haptics = new HapticsManager();

// Convenience functions
export const triggerHaptic = (pattern: HapticPattern = 'medium') => haptics.trigger(pattern);
export const hapticSuccess = () => haptics.success();
export const hapticError = () => haptics.error();
export const hapticWarning = () => haptics.warning();
