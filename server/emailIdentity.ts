const INVISIBLE_DIRECTION_MARKS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/** Canonical form used for storage, lookup, and the database unique index. */
export function normalizeEmail(email: string): string {
  return email.replace(INVISIBLE_DIRECTION_MARKS, '').trim().toLowerCase();
}

export function isDuplicateEmailError(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: any = error;
  while (current && !visited.has(current)) {
    visited.add(current);
    const message = String(current.message || current.sqlMessage || '');
    if (
      current.code === 'ER_DUP_ENTRY' &&
      (/ux_users_email/i.test(message) || /users.*email|email.*users/i.test(message))
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

export const EMAIL_ALREADY_USED_MESSAGE = 'البريد الإلكتروني مستخدم من قبل';
