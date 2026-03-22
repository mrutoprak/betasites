import React from 'react';

export const DeepSpaceBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#050505] pointer-events-none" aria-hidden="true">
      {/* 
         1. The Lighting (Vignette) 
         Center is slightly lighter (#1a1a1a) fading to pure black at edges.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)]" />

      {/* 
         2. The Texture (Noise) 
         Generated via inline SVG Data URI to avoid external dependencies.
         Low opacity + mix-blend-overlay creates the "film grain" look.
      */}
      <div 
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};