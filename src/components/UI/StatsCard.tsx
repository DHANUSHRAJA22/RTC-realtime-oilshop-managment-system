import React from 'react';
import { BarChart3, DivideIcon as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'amber' | 'gray' | 'indigo' | 'emerald';
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  onClick?: () => void;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon = BarChart3,
  color = 'blue',
  trend,
  onClick,
  className = ''
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200',
    green: 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-200',
    yellow: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-yellow-200',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-200',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-200',
    gray: 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-gray-200',
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-200',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200'
  };

  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 ${
        onClick ? 'cursor-pointer transform hover:scale-105 hover:-translate-y-1' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-3 space-x-1">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${colorClasses[color]} shadow-lg`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}