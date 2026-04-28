export function generatePublicReference(prefix = 'MO'): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString().slice(-6);
  return `${prefix}-${time}${random}`;
}