import React from 'react';

export type Column<T> = {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRowClick?: (row: T) => void; // ✅ ADD
  rowKey?: (row: T) => string | number;
};

export default function DataTable<T>({
  data,
  columns,
  onEdit,
  onDelete,
  rowKey,
  onRowClick
}: Props<T>) {
  return (
    <table className="table min-w-full table-auto">
      <thead className="h-16">
        <tr className="text-left">
          {(onEdit || onDelete) && <th className="px-3 py-2">Actions</th>}
          {columns.map((c) => (
            <th key={c.key} className="px-3 py-2">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, idx) => {
          const key = rowKey ? rowKey(row) : idx;
          return (
            <tr
              key={key}
              onClick={() => onRowClick?.(row)} // 🔥 HERE
              className={`text-left h-16 ${idx % 2 === 0 ? '' : 'bg-gray-100'} hover:bg-gray-100`}
            >
              {(onEdit || onDelete) && (
                <td className="px-3 py-3">
                  <div className="flex gap-4">
                    {onEdit && (
                      <button
                        className="text-warning"
                        title="Edit"
                        // onClick={() => onEdit(row)}
                        onClick={(e) => {
                          e.stopPropagation(); // 🔥 IMPORTANT
                          onEdit(row);
                        }}
                      >
                        <i className="ki-filled ki-notepad-edit text-lg"></i>
                      </button>
                    )}

                    {onDelete && (
                      <button
                        className="text-danger"
                        title="Delete"
                        // onClick={() => onDelete(row)}
                        onClick={(e) => {
                          e.stopPropagation(); // 🔥 IMPORTANT
                          onDelete(row);
                        }}
                      >
                        <i className="ki-filled ki-trash text-lg"></i>
                      </button>
                    )}
                  </div>
                </td>
              )}
              {/* Data Columns */}
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-3">
                  {col.render ? col.render(row) : ((row as any)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
