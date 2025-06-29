import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'amber' | 'blue' | 'green' | 'red' | 'gray';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'amber', 
  text,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    amber: 'border-amber-600',
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    gray: 'border-gray-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-gray-200 ${colorClasses[color]} ${sizeClasses[size]} border-t-transparent`}></div>
      {text && (
        <p className="text-gray-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
}