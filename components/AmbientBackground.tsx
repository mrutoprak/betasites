import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#050505] overflow-hidden">
      <style>{`
        @keyframes float-slow {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float-medium {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-30px, 40px) rotate(10deg); }
          66% { transform: translate(40px, -20px) rotate(-5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes float-fast {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 40px) scale(1.2); }
          100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>

      {/* 
        1. The Base (The Void)
        Dark background #050505 is set on the container.
      */}

      {/* 
        2. The Orbs (The Light Sources)
        Using mix-blend-mode: screen/lighten to blend colors.
        Extreme blur (blur-3xl is usually not enough for this "aura" look, using custom arbitrary value).
      */}

      {/* Orb 1: Electric Blue (Top Left) */}
      <div 
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-600/20 rounded-full mix-blend-screen blur-[120px] animate-[float-slow_25s_infinite_ease-in-out]"
      />

      {/* Orb 2: Deep Purple (Bottom Right) */}
      <div 
        className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-purple-800/20 rounded-full mix-blend-screen blur-[120px] animate-[float-medium_30s_infinite_ease-in-out_reverse]"
      />

      {/* Orb 3: Indigo/Pink Accent (Center/Floating) */}
      <div 
        className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-indigo-500/20 rounded-full mix-blend-screen blur-[100px] animate-[float-fast_35s_infinite_ease-in-out]"
      />

      {/* 
        4. The Blend & Finish
        A subtle tint overlay to harmonize
      */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};