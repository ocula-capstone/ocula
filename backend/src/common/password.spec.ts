import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const passwordHash = await hashPassword('correct horse battery staple');

    expect(passwordHash).not.toContain('correct horse');
    await expect(
      verifyPassword(passwordHash, 'correct horse battery staple'),
    ).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'wrong password')).resolves.toBe(
      false,
    );
  });
});
