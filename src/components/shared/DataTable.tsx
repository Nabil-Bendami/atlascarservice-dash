import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  title,
  columns,
  rows,
}: {
  title?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
}) {
  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-3">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="rounded-2xl bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm text-slate-700 first:rounded-l-2xl last:rounded-r-2xl">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
