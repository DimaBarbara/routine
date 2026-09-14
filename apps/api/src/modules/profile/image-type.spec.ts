import { detectImageType } from './image-type.js';

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v])),
  );

describe('detectImageType', () => {
  it('розпізнає JPEG, PNG і WebP за сигнатурою', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(detectImageType(bytes(0x89, 'PNG', 0x0d, 0x0a))).toBe('image/png');
    expect(detectImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('image/webp');
  });

  it('відкидає все інше, навіть якщо клієнт назвав це картинкою', () => {
    expect(detectImageType(bytes('<html><script>'))).toBeNull();
    expect(detectImageType(bytes('GIF89a'))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});
