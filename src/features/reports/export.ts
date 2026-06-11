export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export function buildCsv<T>({
  companyName,
  generatedAt,
  columns,
  rows,
}: {
  companyName: string;
  generatedAt: Date;
  columns: CsvColumn<T>[];
  rows: T[];
}) {
  const headerRows = [
    ["Company", companyName],
    ["Generated at", generatedAt.toISOString()],
    [],
    columns.map((column) => column.header),
  ];
  const dataRows = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))),
  );

  return [
    ...headerRows.map((row) => row.map(escapeCsvValue).join(",")),
    ...dataRows.map((row) => row.join(",")),
  ].join("\n");
}

export function escapeCsvValue(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  const spreadsheetSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  const escaped = spreadsheetSafe.replaceAll('"', '""');

  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}
