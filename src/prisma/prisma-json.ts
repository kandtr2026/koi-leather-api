/**
 * Utility to handle JSON serialization/deserialization for SQLite
 * (which doesn't support native JSON columns in Prisma).
 * All JSON fields are stored as TEXT/string.
 */

export function toJson<T = any>(value: T): string {
  if (value === null || value === undefined) return '{}';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

export function fromJson<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as any;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseJsonFields<T extends Record<string, any>>(
  obj: T | null | undefined,
  fields: (keyof T)[],
): T | null | undefined {
  if (!obj) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field] as string);
      } catch {}
    }
  }
  return result;
}

export function stringifyJsonFields<T extends Record<string, any>>(
  data: Partial<T>,
  fields: (keyof T)[],
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (fields.includes(key as keyof T) && value !== null && value !== undefined) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
