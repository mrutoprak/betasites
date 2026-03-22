import React from 'react';

export const GridHorizonBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#02020A] overflow-hidden">
      <style>{`
        @keyframes grid-fly {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; } /* Must match background-size height */
        }
      `}</style>
      
      {/* 1. The Atmosphere (The Void) */}
      {/* Deep blue-black base is set on parent. Adding a vignette here. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#0a0a20_0%,_#02020A_80%)] opacity-100" />
      
      {/* 2. The Horizon Glow */}
      {/* Soft blue light emitted from the horizon line */}
      <div className="absolute top-[40%] left-0 right-0 h-32 -translate-y-1/2 bg-cyan-500/20 blur-[60px] transform scale-x-150" />

      {/* 3. The Grid (The Floor) */}
      {/* Perspective container */}
      <div className="absolute top-[40%] left-0 right-0 bottom-0 perspective-[300px] overflow-hidden">
        {/* The animated grid plane */}
        <div 
          className="absolute -top-[50%] -left-[100%] -right-[100%] h-[200%] origin-top"
          style={{
            transform: 'rotateX(70deg)',
            backgroundImage: `
              linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'grid-fly 1s linear infinite',
            /* Mask creates the "fade into horizon" effect */
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)'
          }}
        />
      </div>

      {/* 4. Vignette Overlay */}
      {/* Darkens the edges to focus attention */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-60 pointer-events-none" />
    </div>
  );
};