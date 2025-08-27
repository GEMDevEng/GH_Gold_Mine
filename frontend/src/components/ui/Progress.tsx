import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

export const Progress: React.FC<ProgressProps> = ({ 
  value, 
  max = 100, 
  className = '', 
  showLabel = false,
  color = 'default'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-yellow-500';
        if (percentage >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ease-in-out ${getColorClasses()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-0 -mt-6 text-xs text-gray-600">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};
