import { useCallback, useRef, useEffect } from 'react';
import { audioManager } from '@/lib/audioManager';

// Web Audio API based sound generator for game sounds
// Uses global audioManager for cross-platform compatibility
export const useMatchSounds = () => {
  const isEnabledRef = useRef(true);

  // Get audio context from global manager
  const getAudioContext = useCallback(() => {
    return audioManager.getContext();
  }, []);

  // Ensure audio is ready to play - uses global manager
  const ensureAudioReady = useCallback(async () => {
    return audioManager.ensureReady();
  }, []);

  // Unlock audio - delegates to global manager
  const unlockAudio = useCallback(async () => {
    // The global manager handles this automatically
    // But we can trigger a test to ensure it's working
    await audioManager.ensureReady();
  }, []);

  // Play a beep sound with frequency sweep (for searching)
  const playSearchingBeep = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play match found fanfare
  const playMatchFound = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      
      // Play a chord progression
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const duration = 0.15;
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
        
        const startTime = ctx.currentTime + i * 0.08;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play correct answer sound
  const playCorrect = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play wrong answer sound
  const playWrong = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play victory fanfare
  const playVictory = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      
      // Victory melody: C-E-G-C (ascending arpeggio)
      const notes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.12 },
        { freq: 783.99, time: 0.24 },
        { freq: 1046.50, time: 0.36 },
        { freq: 1318.51, time: 0.48 },
      ];
      
      notes.forEach(({ freq, time }) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + time);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3);
        
        oscillator.start(ctx.currentTime + time);
        oscillator.stop(ctx.currentTime + time + 0.3);
      });
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play defeat sound
  const playDefeat = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      
      // Descending sad tones
      const notes = [
        { freq: 392, time: 0 },
        { freq: 349.23, time: 0.15 },
        { freq: 293.66, time: 0.3 },
      ];
      
      notes.forEach(({ freq, time }) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + time);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3);
        
        oscillator.start(ctx.currentTime + time);
        oscillator.stop(ctx.currentTime + time + 0.3);
      });
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play countdown tick
  const playTick = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Play urgent warning (for low time)
  const playUrgent = useCallback(async () => {
    if (!isEnabledRef.current) return;
    try {
      const ctx = await ensureAudioReady();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [ensureAudioReady]);

  // Toggle sounds
  const toggleSounds = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
  }, []);

  // No cleanup needed - global manager handles AudioContext lifecycle

  return {
    playSearchingBeep,
    playMatchFound,
    playCorrect,
    playWrong,
    playVictory,
    playDefeat,
    playTick,
    playUrgent,
    toggleSounds,
    unlockAudio,
  };
};
