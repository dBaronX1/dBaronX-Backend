interface OperationalTableColumn<T> {
  key: string;
  title: string;
  render: (row: T) => React.ReactNode;
}

interface OperationalTableProps<T> {
  title: string;
  rows: T[];
  columns: OperationalTableColumn<T>[];
  emptyText?: string;
}

export function OperationalTable<T>({
  title,
  rows,
  columns,
  emptyText = "No records available.",
}: OperationalTableProps<T>) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="border-b px-3 py-2 font-semibold text-neutral-700"
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="align-top">
                  {columns.map((column) => (
                    <td key={column.key} className="border-b px-3 py-2 text-neutral-700">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
