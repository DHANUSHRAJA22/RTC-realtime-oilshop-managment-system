import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function DataTable({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex space-x-4">
              {columns.map((_, index) => (
                <div key={index} className="h-4 bg-gray-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
          {[...Array(5)].map((_, index) => (
            <div key={index} className="border-t border-gray-200 px-6 py-4">
              <div className="flex space-x-4">
                {columns.map((_, colIndex) => (
                  <div key={colIndex} className="h-4 bg-gray-100 rounded flex-1"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.className || ''}`}
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sortBy === column.key && (
                      <span className="text-amber-600">
                        {sortOrder === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}