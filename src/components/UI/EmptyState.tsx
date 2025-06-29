import React from 'react';
import { Inbox, DivideIcon as LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 mb-6">
        <Icon className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}