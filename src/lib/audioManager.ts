// Global Audio Manager for cross-platform audio playback
// Handles iOS Safari, Android Chrome, and Capacitor native app audio restrictions

type AudioUnlockCallback = () => void;

class AudioManager {
  private audioContext: AudioContext | null = null;
  private isUnlocked = false;
  private unlockCallbacks: AudioUnlockCallback[] = [];
  private initialized = false;

  // Get or create AudioContext
  getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Check if audio is unlocked
  get unlocked(): boolean {
    return this.isUnlocked;
  }

  // Register callback to be called when audio is unlocked
  onUnlock(callback: AudioUnlockCallback): void {
    if (this.isUnlocked) {
      callback();
    } else {
      this.unlockCallbacks.push(callback);
    }
  }

  // Initialize global interaction listeners
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    const interactionEvents = [
      'touchstart',
      'touchend',
      'click',
      'keydown',
      'pointerdown',
      'mousedown'
    ];

    const handleInteraction = async (event: Event) => {
      if (this.isUnlocked) return;

      try {
        const ctx = this.getContext();

        // Resume suspended context
        if (ctx.state === 'suspended') {
          await ctx.resume();
          console.log('[AudioManager] Context resumed');
        }

        // Play silent buffer to unlock on iOS/Android
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        // Mark as unlocked
        this.isUnlocked = true;
        console.log('[AudioManager] Audio unlocked via', event.type);

        // Call all registered callbacks
        this.unlockCallbacks.forEach(cb => cb());
        this.unlockCallbacks = [];

        // Remove listeners after successful unlock
        interactionEvents.forEach(eventType => {
          document.removeEventListener(eventType, handleInteraction, true);
        });
      } catch (e) {
        console.warn('[AudioManager] Unlock failed:', e);
      }
    };

    // Add listeners on capture phase for earliest possible handling
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, handleInteraction, { 
        capture: true, 
        passive: true 
      });
    });

    console.log('[AudioManager] Initialized with interaction listeners');
  }

  // Ensure audio is ready to play
  async ensureReady(): Promise<AudioContext> {
    const ctx = this.getContext();

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('[AudioManager] Resume failed:', e);
      }
    }

    return ctx;
  }

  // Play a test tone (useful for debugging)
  async playTestTone(): Promise<void> {
    try {
      const ctx = await this.ensureReady();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);

      console.log('[AudioManager] Test tone played');
    } catch (e) {
      console.warn('[AudioManager] Test tone failed:', e);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isUnlocked = false;
    this.initialized = false;
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Initialize on DOM ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => audioManager.initialize());
  } else {
    audioManager.initialize();
  }
}
