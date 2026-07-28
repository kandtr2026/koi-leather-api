const VIETNAMESE_MAP: Record<string, string> = {
  à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
  â: 'a', ầ: 'a', ấ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
  ă: 'a', ằ: 'a', ắ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
  è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
  ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
  ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
  ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
  ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
  ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
  ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
  ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
  ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
  đ: 'd',
};

const VIETNAMESE_REGEX = new RegExp(Object.keys(VIETNAMESE_MAP).join('|'), 'g');

function removeAccents(str: string): string {
  return str.replace(VIETNAMESE_REGEX, (match) => VIETNAMESE_MAP[match]);
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*–\s*/g, '-')
    .replace(/\s*—\s*/g, '-')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

export function generateSlug(name: string): string {
  const normalized = normalizeName(name);
  const noAccent = removeAccents(normalized);
  return noAccent
    .toLowerCase()
    .replace(/[^a-z0-9\s-/\\.]/g, '')
    .replace(/[/\\]+/g, '-')
    .replace(/[.\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}

export function generateCode(name: string): string {
  const normalized = normalizeName(name);
  const noAccent = removeAccents(normalized);
  return noAccent
    .toUpperCase()
    .replace(/[^A-Z0-9\s-/\\.]/g, '')
    .replace(/[/\\]+/g, '-')
    .replace(/[.\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'UNTITLED';
}

export function generateSlugAndCode(name: string): { slug: string; code: string } {
  return {
    slug: generateSlug(name),
    code: generateCode(name),
  };
}

export async function ensureUniqueSlug(
  baseSlug: string,
  existsFn: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existsFn(baseSlug))) return baseSlug;
  let counter = 1;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    if (!(await existsFn(candidate))) return candidate;
    counter++;
  }
}

export async function ensureUniqueCode(
  baseCode: string,
  existsFn: (code: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existsFn(baseCode))) return baseCode;
  const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const candidate = `${baseCode}-${shortId}`;
  if (!(await existsFn(candidate))) return candidate;
  return ensureUniqueCode(baseCode, existsFn);
}

export function extractNameForGeneration(nameField: string | { vi?: string; en?: string } | undefined | null): string {
  if (!nameField) return '';
  if (typeof nameField === 'object') {
    return nameField.vi || nameField.en || '';
  }
  return String(nameField);
}
