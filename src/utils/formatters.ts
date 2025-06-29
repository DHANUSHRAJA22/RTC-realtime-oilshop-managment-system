/**
 * Safely parses a numeric value with fallback
 */
export const parseNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

/**
 * Safely parses an integer value with fallback
 */
export const parseInteger = (value: any, defaultValue: number = 0): number => {
  const num = parseNumber(value, defaultValue);
  return Math.floor(num);
};

/**
 * Formats currency with proper Indian formatting (removes duplicate ₹ symbols)
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = parseNumber(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Formats amount for display without currency symbol
 */
export const formatAmount = (amount: number | string): string => {
  const numAmount = parseNumber(amount);
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Validates if a value is a valid integer
 */
export const isValidInteger = (value: any): boolean => {
  const num = parseNumber(value);
  return Number.isInteger(num) && num >= 1;
};

/**
 * Formats date with proper localization
 */
export const formatDate = (date: Date | any): string => {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  if (date.toDate && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return 'Invalid Date';
  }
  
  return dateObj.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats phone number for display
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Truncates text to specified length
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * Gets appropriate color classes for status badges
 */
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shipped: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    partial: 'bg-orange-100 text-orange-800 border-orange-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    in_stock: 'bg-green-100 text-green-800 border-green-200',
    low_stock: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    out_of_stock: 'bg-red-100 text-red-800 border-red-200'
  };
  
  return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Validates if a value is a valid number
 */
export const isValidNumber = (value: any): boolean => {
  return !isNaN(parseNumber(value)) && parseNumber(value) > 0;
};

/**
 * Calculates percentage change between two values
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Formats percentage for display
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};