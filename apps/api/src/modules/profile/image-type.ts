export type AvatarMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Тип за «магічними» байтами, а не за Content-Type від клієнта:
 * інакше під виглядом картинки можна підсунути HTML і віддати його з нашого домену.
 */
export function detectImageType(bytes: Uint8Array): AvatarMimeType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}
