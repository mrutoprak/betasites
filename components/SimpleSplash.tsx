import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SimpleSplashProps {
  onFinish: () => void;
}

export const SimpleSplash: React.FC<SimpleSplashProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Short, simple timer for the splash
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Allow fade out
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div className="relative flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform transition-transform duration-700 hover:scale-105">
          <span className="text-white text-4xl font-amiri font-bold">ع</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Arabic Mnemonic</h1>
        <div className="mt-2 flex items-center gap-2 text-gray-400 text-sm">
          <Sparkles size={14} />
          <span>Loading Library...</span>
        </div>
      </div>
    </div>
  );
};