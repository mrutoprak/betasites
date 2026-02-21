import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<'breathing' | 'exiting'>('breathing');

  useEffect(() => {
    // 1. Setup the vibration loop to match the CSS animation peak
    // The CSS animation is 3s. The peak (scale up) happens around 50% (1.5s).
    const vibrationInterval = setInterval(() => {
      if (navigator.vibrate) {
        // A short, sharp pulse
        navigator.vibrate(15); 
      }
    }, 3000);

    // Initial vibrate attempt (might be blocked by browser if no interaction)
    setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(15);
    }, 1500);

    // 2. Schedule the Exit (The Reveal)
    // Run breathing for ~4 seconds, then trigger exit
    const exitTimer = setTimeout(() => {
      setPhase('exiting');
      
      // 3. Unmount after the exit animation completes
      setTimeout(() => {
        onFinish();
      }, 800); // Matches the CSS transition duration
    }, 4500);

    return () => {
      clearInterval(vibrationInterval);
      clearTimeout(exitTimer);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-700 ${
      phase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      <style>{`
        @keyframes breathe {
          0% {
            transform: scale(0.8);
            opacity: 0.3;
            border-color: rgba(255, 255, 255, 0.3);
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
            border-color: rgba(255, 255, 255, 1);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
          }
          100% {
            transform: scale(0.8);
            opacity: 0.3;
            border-color: rgba(255, 255, 255, 0.3);
          }
        }
      `}</style>

      {/* The Ring */}
      <div 
        className={`rounded-full border border-white/90 w-24 h-24 will-change-transform ${
          phase === 'breathing' ? 'animate-[breathe_3s_infinite_ease-in-out]' : ''
        }`}
        style={{
            // During exit, we override the animation with a rapid expansion
            transform: phase === 'exiting' ? 'scale(50)' : undefined,
            opacity: phase === 'exiting' ? 0 : undefined,
            transition: phase === 'exiting' ? 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-in' : undefined,
            borderWidth: phase === 'exiting' ? '2px' : '1px',
        }}
      />
    </div>
  );
};