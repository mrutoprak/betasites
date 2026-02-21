import React, { useEffect, useState, useRef } from 'react';

interface SolarEclipseSplashProps {
  onFinish: () => void;
}

export const SolarEclipseSplash: React.FC<SolarEclipseSplashProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'eclipse' | 'burst' | 'finished'>('eclipse');
  const [showLogo, setShowLogo] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // --- 1. Audio Setup (Procedural Sound Design) ---
    const playAudioSequence = () => {
      try {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!CtxClass) return;
        
        const ctx = new CtxClass();
        audioCtxRef.current = ctx;

        const t = ctx.currentTime;
        const duration = 2.0; // Time until burst

        // A. The Rumble (Shepard Tone-ish Tension)
        const rumbleOsc1 = ctx.createOscillator();
        const rumbleOsc2 = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Deep saw and sine for texture
        rumbleOsc1.type = 'sawtooth';
        rumbleOsc2.type = 'sine';
        
        // Pitch rising (Tension)
        rumbleOsc1.frequency.setValueAtTime(40, t);
        rumbleOsc1.frequency.exponentialRampToValueAtTime(120, t + duration);
        rumbleOsc2.frequency.setValueAtTime(42, t); // Slight detune
        rumbleOsc2.frequency.exponentialRampToValueAtTime(125, t + duration);

        // Filter opening up (The Corona appearing)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + duration);

        // Volume Envelope
        rumbleGain.gain.setValueAtTime(0, t);
        rumbleGain.gain.linearRampToValueAtTime(0.4, t + duration * 0.8);
        rumbleGain.gain.setValueAtTime(0, t + duration); // Silence at burst

        // Connect Rumble
        rumbleOsc1.connect(filter);
        rumbleOsc2.connect(filter);
        filter.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);

        rumbleOsc1.start(t);
        rumbleOsc2.start(t);
        rumbleOsc1.stop(t + duration + 0.1);
        rumbleOsc2.stop(t + duration + 0.1);

        // B. The "Angel Choir" Swoosh (The Burst)
        const burstTime = t + duration;
        
        // High Sine Sweep (The "Ping")
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();
        
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(800, burstTime);
        pingOsc.frequency.exponentialRampToValueAtTime(3000, burstTime + 0.1);
        
        pingGain.gain.setValueAtTime(0, burstTime);
        pingGain.gain.setValueAtTime(0.3, burstTime + 0.05);
        pingGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 1.5); // Long reverb tail effect

        pingOsc.connect(pingGain);
        pingGain.connect(ctx.destination);
        
        pingOsc.start(burstTime);
        pingOsc.stop(burstTime + 2);

        // White Noise Burst (The "Air")
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        noiseGain.gain.setValueAtTime(0.5, burstTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.8);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(burstTime);

      } catch (e) {
        console.error("Audio generation failed (likely autoplay policy)", e);
      }
    };

    // --- 2. Haptics Sequence ---
    const triggerHaptics = () => {
      if (!navigator.vibrate) return;
      // Pattern: [vibrate, pause, vibrate, pause...]
      // Increasing frequency/intensity
      const pattern = [
        20, 300,  // Start slow
        30, 200, 
        40, 100, 
        50, 50,   // Fast shake
        60, 30,
        100, 0    // The Burst (Long thud)
      ];
      navigator.vibrate(pattern);
    };

    // --- 3. Run Sequence ---
    playAudioSequence();
    triggerHaptics();

    // Timings
    const burstTimer = setTimeout(() => {
      setPhase('burst');
      setShowLogo(true);
    }, 2000); // 2 seconds of eclipse

    const finishTimer = setTimeout(() => {
      setPhase('finished');
      setTimeout(onFinish, 1000); // Allow fade out
    }, 2500); // 0.5s of white flash

    return () => {
      clearTimeout(burstTimer);
      clearTimeout(finishTimer);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
      phase === 'finished' ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      <style>{`
        @keyframes eclipse-spin {
          0% { transform: rotate(0deg) scale(1); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: rotate(180deg) scale(1.1); opacity: 1; }
        }
        @keyframes eclipse-shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(1px, 1px); }
          50% { transform: translate(-1px, -1px); }
          75% { transform: translate(-2px, 1px); }
          100% { transform: translate(1px, -2px); }
        }
        @keyframes diamond-burst {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: 0 0 100px 50px rgba(255,255,255,1); }
          100% { box-shadow: 0 0 200vw 200vw rgba(255,255,255,1); }
        }
        @keyframes logo-reveal {
          0% { opacity: 0; transform: scale(0.5); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
      `}</style>

      {/* The Container for the Celestial Event */}
      <div className="relative flex items-center justify-center">
        
        {/* The Corona (Sun) */}
        {/* It glows behind the moon */}
        <div className={`absolute w-32 h-32 rounded-full bg-blue-500 blur-sm opacity-0 ${
          phase === 'eclipse' ? 'animate-[eclipse-spin_2.5s_ease-in-out_forwards]' : ''
        }`} 
        style={{
          boxShadow: '0 0 40px 10px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(255,255,255,0.8)'
        }}
        />

        {/* The Diamond Ring Flash (Burst) */}
        {/* This expands to fill the screen */}
        <div className={`absolute w-1 h-1 rounded-full bg-white z-20 ${
          phase === 'burst' ? 'animate-[diamond-burst_0.6s_ease-out_forwards]' : 'opacity-0'
        }`} />

        {/* The Moon (Black Circle) */}
        {/* It shakes during tension */}
        <div className={`relative w-28 h-28 bg-black rounded-full z-10 flex items-center justify-center overflow-hidden ${
          phase === 'eclipse' ? 'animate-[eclipse-shake_2s_ease-in_infinite]' : ''
        } ${
            // Dissolve the moon when burst happens
            phase === 'burst' ? 'transition-all duration-300 bg-transparent' : ''
        }`}>
            {/* The Logo Reveal */}
            {showLogo && (
                <div className="text-white font-bold text-6xl font-serif animate-[logo-reveal_0.5s_ease-out_forwards]">
                    F
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
