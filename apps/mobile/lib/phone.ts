/** 숫자만 추출 (01012345678) */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '');
}

/** 010-1234-5678 형식 */
export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input);
  return /^01[016789]\d{7,8}$/.test(d);
}
