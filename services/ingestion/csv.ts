export type CsvLimits = {
  maxBytes?: number;
  maxRows?: number;
  maxColumns?: number;
  maxCellLength?: number;
};

const defaultLimits: Required<CsvLimits> = {
  maxBytes: 15 * 1024 * 1024,
  maxRows: 100_000,
  maxColumns: 64,
  maxCellLength: 2_000,
};

export class CsvSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvSecurityError";
  }
}

export function parseCsv(text: string, limits: CsvLimits = {}): Record<string, string>[] {
  const effective = { ...defaultLimits, ...limits };
  const byteSize = Buffer.byteLength(text, "utf8");
  if (byteSize > effective.maxBytes) {
    throw new CsvSecurityError(`CSV exceeds the ${effective.maxBytes}-byte limit.`);
  }

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  if (lines.length - 1 > effective.maxRows) {
    throw new CsvSecurityError(`CSV exceeds the ${effective.maxRows}-row limit.`);
  }

  const headers = splitCsvLine(lines[0], effective).map((header) => header.trim());
  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    throw new CsvSecurityError("CSV headers must be non-empty.");
  }
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
    throw new CsvSecurityError("CSV headers must be unique.");
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line, effective);
    if (values.length !== headers.length) {
      throw new CsvSecurityError(`Row ${index + 2} has ${values.length} columns; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]]));
  });
}

function splitCsvLine(line: string, limits: Required<CsvLimits>): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(sanitizeCell(current, limits));
      current = "";
    } else {
      current += character;
    }
  }
  if (quoted) throw new CsvSecurityError("CSV contains an unterminated quoted cell.");
  values.push(sanitizeCell(current, limits));
  if (values.length > limits.maxColumns) throw new CsvSecurityError("CSV exceeds the column limit.");
  return values;
}

function sanitizeCell(value: string, limits: Required<CsvLimits>): string {
  const normalized = value.trim();
  if (normalized.length > limits.maxCellLength) {
    throw new CsvSecurityError("CSV contains a cell exceeding the maximum length.");
  }
  if (/^[=+@]/.test(normalized) || (/^-/.test(normalized) && !/^-\d+(?:\.\d+)?$/.test(normalized))) {
    throw new CsvSecurityError("CSV formula-like cells are not accepted.");
  }
  return normalized;
}
