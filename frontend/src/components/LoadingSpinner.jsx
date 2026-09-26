import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-brand-600`} />
      {text && <span className="text-sm font-medium text-slate-600">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
