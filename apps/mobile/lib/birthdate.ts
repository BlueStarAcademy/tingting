/** 입력값을 YYYY-MM-DD 형태로 포맷 */
export function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** 저장/표시용 YYYY-MM-DD 정규화 */
export function normalizeBirthDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const formatted = formatBirthDateInput(trimmed);
  return isValidBirthDate(formatted) ? formatted : formatted;
}

export function formatBirthDateDisplay(value?: string): string {
  if (!value?.trim()) return '';
  const formatted = formatBirthDateInput(value);
  return isValidBirthDate(formatted) ? formatted : value.trim();
}
