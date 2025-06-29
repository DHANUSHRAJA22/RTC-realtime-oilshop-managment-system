import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface SearchAndFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  resultCount?: number;
  onClearAll?: () => void;
  className?: string;
}

export default function SearchAndFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  resultCount,
  onClearAll,
  className = ''
}: SearchAndFilterProps) {
  const hasActiveFilters = searchValue || filters.some(filter => filter.value !== 'all' && filter.value !== '');

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors duration-200"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors duration-200"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {/* Results Count and Clear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <Filter className="h-5 w-5 mr-2" />
            <span>{resultCount !== undefined ? `${resultCount} Results` : ''}</span>
          </div>
          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors duration-200"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}