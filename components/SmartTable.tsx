
import React, { useState, useMemo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Filter } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  width?: string; // Tailwind class e.g. 'w-1/4'
  render?: (row: T) => React.ReactNode;
}

interface SmartTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  className?: string;
}

function SmartTable<T>({ data, columns, pageSize = 10, className = "" }: SmartTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // --- FILTERING ---
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;

        const col = columns.find((c, idx) => `col-${idx}` === key);
        if (!col) return true;

        const cellValue = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor as keyof T];

        return String(cellValue ?? '').toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [data, filters, columns]);

  // --- SORTING ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    const col = columns.find((c, idx) => `col-${idx}` === sortConfig.key);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor as keyof T];
      const bVal = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor as keyof T];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, columns]);

  // --- PAGINATION ---
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (colIndex: number) => {
    const key = `col-${colIndex}`;
    let direction: 'asc' | 'desc' = 'asc';

    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (colIndex: number, value: string) => {
    setFilters(prev => ({ ...prev, [`col-${colIndex}`]: value }));
    setCurrentPage(1); // Reset to page 1 on filter
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col transition-all duration-300 ${className}`}>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              {columns.map((col, idx) => (
                <th key={idx} className={`p-4 font-bold text-gray-600 dark:text-gray-400 uppercase text-xs align-top ${col.width || ''}`}>
                  <div className="flex flex-col gap-2">
                    <div
                      className={`flex items-center gap-2 ${col.sortable ? 'cursor-pointer hover:text-emerald-600 select-none' : ''}`}
                      onClick={() => col.sortable && handleSort(idx)}
                    >
                      {col.header}
                      {col.sortable && (
                        <span className="text-gray-400 dark:text-gray-600">
                          {sortConfig?.key === `col-${idx}` ? (
                            sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-emerald-600 dark:text-emerald-400" /> : <ArrowDown size={14} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                    {col.filterable && (
                      <div className="relative">
                        <Search size={12} className="absolute left-2 top-2 text-gray-400 dark:text-gray-600" />
                        <input
                          type="text"
                          placeholder="Filtru..."
                          value={filters[`col-${idx}`] || ''}
                          onChange={(e) => handleFilterChange(idx, e.target.value)}
                          className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="p-4 align-middle text-gray-700 dark:text-gray-300">
                      {col.render
                        ? col.render(row)
                        : String(typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as keyof T] || '-')
                      }
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-gray-400 dark:text-gray-600 italic">
                  Nu s-au găsit date conform filtrelor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center transition-colors">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Pagina {currentPage} din {totalPages} ({sortedData.length} total)
          </span>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Următor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartTable;
