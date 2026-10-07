/**
 * Express 5 types `req.params[k]` as `string | string[]` to support
 * catch-all routes. Most of our routes are simple `:id` patterns so we
 * always want the string form.
 */
export const requireParam = (
  value: string | string[] | undefined,
  fallback?: string,
): string => {
  if (Array.isArray(value)) return value[0] ?? fallback ?? "";
  return value ?? fallback ?? "";
};

export const optionalParam = (
  value: string | string[] | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
};