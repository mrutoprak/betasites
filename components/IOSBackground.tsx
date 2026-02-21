import React from 'react';

export const IOSBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#F2F2F7] overflow-hidden">
      {/* Static subtle gradient - High Performance */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-gray-50 to-indigo-50/50" />
      
      {/* Simple texture overlay for depth without rendering cost */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
    </div>
  );
};