import React from 'react';

interface NebulaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export const NebulaButton: React.FC<NebulaButtonProps> = ({ 
  children, 
  className = '', 
  disabled,
  size = 'md',
  ...props 
}) => {
  const sizeClasses = size === 'sm' 
    ? "py-2 px-4 text-sm rounded-lg" 
    : "py-3.5 px-6 text-base rounded-xl";

  return (
    <button
      className={`relative w-full font-semibold transition-all duration-200 transform active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm ${
        disabled 
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
          : 'bg-[#007AFF] hover:bg-[#006ee6] text-white shadow-blue-500/20'
      } ${sizeClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};