// Values the e2e tests need so the app's .env check passes without a real .env file.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:6543/postgres';
process.env.DIRECT_URL ??= 'postgresql://test:test@localhost:5432/postgres';
process.env.JWT_ACCESS_SECRET ??= 'e2e-test-secret';
