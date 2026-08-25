/** Keep last 10 digits for Indian mobile comparison / storage. */
export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function isValidIndianMobile(phone: string): boolean {
  const digits = normalizeMobile(phone);
  return digits.length === 10 && /^[6-9]/.test(digits);
}

/**
 * Partial match of a search string against a stored 10-digit mobile.
 * Ignores spaces/+ and common Indian prefixes (91, 0). Empty digit query → false
 * (so name-only search does not match every number via "".includes).
 */
export function mobileMatchesQuery(mobile: string, query: string): boolean {
  const digits = query.replace(/\D/g, '');
  if (!digits) return false;

  if (mobile.includes(digits)) return true;

  if (digits.startsWith('91') && digits.length > 2) {
    const withoutCc = digits.slice(2);
    if (withoutCc && mobile.includes(withoutCc)) return true;
  }

  if (digits.startsWith('0') && digits.length > 1) {
    const withoutTrunk = digits.slice(1);
    if (withoutTrunk && mobile.includes(withoutTrunk)) return true;
  }

  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    if (mobile.includes(last10)) return true;
  }

  return false;
}

/** Dial / tel: URI — prefer +91 for 10-digit Indian mobiles. */
export function toDialNumber(mobile: string): string {
  const digits = normalizeMobile(mobile);
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return digits;
}
