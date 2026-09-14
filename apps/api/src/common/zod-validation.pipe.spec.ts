import { type ApiErrorBody, loginSchema } from '@routine/contracts';

import { AppException } from './app-exception.js';
import { generateToken, hashToken } from './crypto.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(loginSchema);

  it('пропускає валідні дані', () => {
    const input = { email: 'a@b.co', password: 'secret' };
    expect(pipe.transform(input)).toEqual(input);
  });

  it('кидає VALIDATION_FAILED з ключами перекладів для кожного поля', () => {
    try {
      pipe.transform({ email: 'nope' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const body = (error as AppException).getResponse() as ApiErrorBody;
      expect(body).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
      expect(body.issues).toEqual([
        { path: 'email', message: 'validation.emailInvalid' },
        { path: 'password', message: 'validation.required' },
      ]);
    }
  });
});

describe('crypto', () => {
  it('токени унікальні, а хеш детермінований і не містить токена', () => {
    const token = generateToken();
    expect(token).not.toBe(generateToken());
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });
});
