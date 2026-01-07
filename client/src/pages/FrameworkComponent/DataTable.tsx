// import React from 'react';

// export type Column<T> = {
//   key: string;
//   label: string;
//   width?: string;
//   render?: (row: T) => React.ReactNode;
// };

// type Props<T> = {
//   data: T[];
//   columns: Column<T>[];
//   onEdit?: (row: T) => void;
//   onDelete?: (row: T) => void;
//   onRowClick?: (row: T) => void; // ✅ ADD
//   rowKey?: (row: T) => string | number;
//   pageSize?: number; // ✅ NEW
// };

// export default function DataTable<T>({
//   data,
//   columns,
//   onEdit,
//   onDelete,
//   rowKey,
//   onRowClick
// }: Props<T>) {
//   return (
//     <table className="table min-w-full table-auto">
//       <thead className="h-16">
//         <tr className="text-left">
//           {(onEdit || onDelete) && <th className="px-3 py-2">Actions</th>}
//           {columns.map((c) => (
//             <th key={c.key} className="px-3 py-2">
//               {c.label}
//             </th>
//           ))}
//         </tr>
//       </thead>

//       <tbody>
//         {data.map((row, idx) => {
//           const key = rowKey ? rowKey(row) : idx;
//           return (
//             <tr
//               key={key}
//               onClick={() => onRowClick?.(row)} // 🔥 HERE
//               className={`text-left h-16 ${idx % 2 === 0 ? '' : 'bg-gray-100'} hover:bg-gray-100`}
//             >
//               {(onEdit || onDelete) && (
//                 <td className="px-3 py-3">
//                   <div className="flex gap-4">
//                     {onEdit && (
//                       <button
//                         className="text-warning"
//                         title="Edit"
//                         // onClick={() => onEdit(row)}
//                         onClick={(e) => {
//                           e.stopPropagation(); // 🔥 IMPORTANT
//                           onEdit(row);
//                         }}
//                       >
//                         <i className="ki-filled ki-notepad-edit text-lg"></i>
//                       </button>
//                     )}

//                     {onDelete && (
//                       <button
//                         className="text-danger"
//                         title="Delete"
//                         // onClick={() => onDelete(row)}
//                         onClick={(e) => {
//                           e.stopPropagation(); // 🔥 IMPORTANT
//                           onDelete(row);
//                         }}
//                       >
//                         <i className="ki-filled ki-trash text-lg"></i>
//                       </button>
//                     )}
//                   </div>
//                 </td>
//               )}
//               {/* Data Columns */}
//               {columns.map((col) => (
//                 <td key={col.key} className="px-3 py-3">
//                   {col.render ? col.render(row) : ((row as any)[col.key] ?? '-')}
//                 </td>
//               ))}
//             </tr>
//           );
//         })}
//       </tbody>
//     </table>
//   );
// }
import React, { useMemo, useState } from 'react';

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
  pageSize?: number; // ✅ NEW
};

export default function DataTable<T>({
  data,
  columns,
  onEdit,
  onDelete,
  rowKey,
  onRowClick,
  pageSize = 10 // ✅ DEFAULT
}: Props<T>) {

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  return (
    <div className="space-y-4">

      {/* TABLE */}
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
          {paginatedData.map((row, idx) => {
            const key = rowKey ? rowKey(row) : idx;
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={`h-16 cursor-pointer ${
                  idx % 2 === 0 ? '' : 'bg-gray-100'
                } hover:bg-gray-100`}
              >
                {(onEdit || onDelete) && (
                  <td className="px-3 py-3">
                    <div className="flex gap-4">
                      {onEdit && (
                        <button
                          className="text-warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
                          }}
                        >
                          <i className="ki-filled ki-notepad-edit text-lg"></i>
                        </button>
                      )}

                      {onDelete && (
                        <button
                          className="text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(row);
                          }}
                        >
                          <i className="ki-filled ki-trash text-lg"></i>
                        </button>
                      )}
                    </div>
                  </td>
                )}

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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">

          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-light"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </button>

            <button
              className="btn btn-sm btn-light"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>

        </div>
      )}
    </div>
  );
}