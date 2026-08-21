/**
 * Formats a numeric amount in FCFA/XOF with proper space grouping
 * e.g. 133500 -> "133 500 FCFA"
 */
export function formatCurrency(
  amount: number | undefined | null,
  symbol: string = 'FCFA',
  includeDecimals?: boolean
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${symbol}`;
  }

  // If includeDecimals is unspecified, automatically include decimals if the number has a fractional part
  const hasDecimals = Math.abs(amount % 1) > 0.0001;
  const shouldIncludeDecimals = includeDecimals !== undefined ? includeDecimals : hasDecimals;

  const rounded = shouldIncludeDecimals
    ? Math.round(amount * 100) / 100
    : Math.round(amount);

  // Group thousands with spaces
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  if (parts.length > 1 && shouldIncludeDecimals) {
    parts[1] = parts[1].padEnd(2, '0').slice(0, 2);
  }

  const formattedNum = parts.join(',');
  return `${formattedNum} ${symbol}`;
}

/**
 * Formats a percentage value (e.g. 25 -> "25 %" or 25.5 -> "25,5 %")
 */
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0 %';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toString().replace('.', ',')} %`;
}

/**
 * Formats standard number with space separator
 */
export function formatNumber(
  value: number | undefined | null,
  decimals: number = 0
): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
}

/**
 * Formats date into readable French date
 * e.g. "2026-08-16" -> "16 août 2026"
 */
export function formatDateFrench(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats date to short French format "16/08/2026"
 */
export function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Returns today date formatted as YYYY-MM-DD for HTML date inputs
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds days to date string and returns YYYY-MM-DD
 */
export function addDaysToDateString(dateString: string, days: number): string {
  try {
    const d = new Date(dateString);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
}

/**
 * Generates an ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generates sequential quote reference
 */
export function formatQuoteNumber(sequence: number, prefix: string = 'DEV'): string {
  const year = new Date().getFullYear();
  const seqStr = String(sequence).padStart(3, '0');
  return `${prefix}-${year}-${seqStr}`;
}

/**
 * Sanitizes a string for safe filename usage
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}
