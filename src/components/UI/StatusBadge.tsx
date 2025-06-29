import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, Package, Truck, DivideIcon as LucideIcon } from 'lucide-react';
import { getStatusColor } from '../../utils/formatters';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
  showIcon?: boolean;
  className?: string;
}

export default function StatusBadge({ 
  status, 
  size = 'md', 
  variant = 'default',
  showIcon = true, 
  className = '' 
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getStatusIcon = (status: string): LucideIcon => {
    const statusIcons: Record<string, LucideIcon> = {
      pending: Clock,
      confirmed: CheckCircle,
      approved: CheckCircle,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
      rejected: XCircle,
      paid: CheckCircle,
      partial: AlertCircle,
      overdue: XCircle,
      in_stock: CheckCircle,
      low_stock: AlertCircle,
      out_of_stock: XCircle
    };
    
    return statusIcons[status.toLowerCase()] || AlertCircle;
  };

  const Icon = getStatusIcon(status);
  const baseClasses = variant === 'outline' ? 'border-2 bg-transparent' : 'border';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${baseClasses} ${getStatusColor(status)} ${sizeClasses[size]} ${className}`}>
      {showIcon && <Icon className={`${iconSizes[size]} mr-1.5`} />}
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
}