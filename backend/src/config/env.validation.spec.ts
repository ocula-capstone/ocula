import { validateEnv } from './env.validation';

const required = {
  DATABASE_URL: 'postgresql://u:p@localhost:6543/postgres',
  DIRECT_URL: 'postgresql://u:p@localhost:5432/postgres',
  JWT_ACCESS_SECRET: 'test-secret',
};

describe('validateEnv', () => {
  it('accepts the required values and fills in defaults', () => {
    const env = validateEnv(required);
    expect(env.PORT).toBe(3000);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(7);
  });

  it('turns number strings from .env into numbers', () => {
    expect(validateEnv({ ...required, PORT: '4000' }).PORT).toBe(4000);
  });

  it('names every missing required value', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL[\s\S]*DIRECT_URL[\s\S]*JWT_ACCESS_SECRET/,
    );
  });
});
